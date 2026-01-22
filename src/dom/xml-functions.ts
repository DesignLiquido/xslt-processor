import he from 'he';

import {
    DOM_ATTRIBUTE_NODE,
    DOM_CDATA_SECTION_NODE,
    DOM_COMMENT_NODE,
    DOM_DOCUMENT_FRAGMENT_NODE,
    DOM_DOCUMENT_NODE,
    DOM_DOCUMENT_TYPE_NODE,
    DOM_ELEMENT_NODE,
    DOM_TEXT_NODE
} from '../constants';
import { domGetAttributeValue } from './functions';
import { XNode } from './xnode';
import { XDocument } from './xdocument';
import { XmlOutputOptions } from './xml-output-options';
import { XBrowserNode } from './xbrowser-node';

/**
 * Returns the text value of a node; for nodes without children this
 * is the nodeValue, for nodes with children this is the concatenation
 * of the value of all children. Browser-specific optimizations are used by
 * default; they can be disabled by passing "true" in as the second parameter.
 * @param node The Node (not exactly a `XNode` here).
 * @param disallowBrowserSpecificOptimization A boolean, to avoid browser optimization.
 * @returns The XML value as a string.
 */
export function xmlValue(node: XNode, disallowBrowserSpecificOptimization: boolean = false): string {
    if (!node) {
        return '';
    }

    let ret = '';
    switch (node.nodeType) {
        case DOM_DOCUMENT_TYPE_NODE:
            return `<!DOCTYPE ${node.nodeValue}>`;
        case DOM_TEXT_NODE:
        case DOM_CDATA_SECTION_NODE:
        case DOM_ATTRIBUTE_NODE:
            return node.nodeValue;
        case DOM_ELEMENT_NODE:
        case DOM_DOCUMENT_NODE:
        case DOM_DOCUMENT_FRAGMENT_NODE:
            if (!disallowBrowserSpecificOptimization) {
                // Only returns something if node has either `innerText` or `textContent` (not an XNode).
                // IE, Safari, Opera, and friends (`innerText`)
                const browserNode = node as XBrowserNode;
                const innerText = browserNode.innerText;
                if (innerText !== undefined) {
                    return innerText;
                }
                // Firefox (`textContent`)
                const textContent = browserNode.textContent;
                if (textContent !== undefined) {
                    return textContent;
                }
            }

            const textNodes = node.childNodes.filter((n: XNode) => n.nodeType !== DOM_ATTRIBUTE_NODE);
            for (let i = 0; i < textNodes.length; ++i) {
                ret += xmlValue(textNodes[i]);
            }

            return ret;
    }
}

/**
 * The older version to obtain a XML value from a node.
 * For now, this form is only used to get text from attribute nodes, 
 * and it should be removed in future versions.
 * @param node The attribute node.
 * @param disallowBrowserSpecificOptimization A boolean, to avoid browser optimization.
 * @returns The XML value as a string.
 */
export function xmlValueLegacyBehavior(node: XNode, disallowBrowserSpecificOptimization: boolean = false) {
    if (!node) {
        return '';
    }

    let returnedXmlString = '';
    switch (node.nodeType) {
        case DOM_ATTRIBUTE_NODE:
        case DOM_TEXT_NODE:
            returnedXmlString += node.nodeValue;
            break;
        case DOM_CDATA_SECTION_NODE:
            returnedXmlString += node.nodeValue;
            break;
        case DOM_DOCUMENT_NODE:
        case DOM_DOCUMENT_FRAGMENT_NODE:
        case DOM_ELEMENT_NODE:
            if (!disallowBrowserSpecificOptimization) {
                // IE, Safari, Opera, and friends
                const browserNode = node as XBrowserNode;
                const innerText = browserNode.innerText;
                if (innerText !== undefined) {
                    return innerText;
                }
                // Firefox
                const textContent = browserNode.textContent;
                if (textContent !== undefined) {
                    return textContent;
                }
            }

            const len = node.childNodes.length;
            for (let i = 0; i < len; ++i) {
                returnedXmlString += xmlValue(node.childNodes[i]);
            }

            break;
    }

    return returnedXmlString;
}

/**
 * Returns the representation of a node as XML text.
 * In general it is not used by XSLT, that uses `xmlTransformedText` instead.
 * @param {XNode} node The starting node.
 * @param {XmlOutputOptions} options XML output options.
 * @returns The XML string.
 * @see xmlTransformedText
 */
export function xmlText(
    node: XNode,
    options: XmlOutputOptions = {
        cData: true,
        escape: true,
        selfClosingTags: true,
        outputMethod: 'xml'
    }
) {
    const buffer: string[] = [];
    xmlTextRecursive(node, buffer, options);
    return buffer.join('');
}

/**
 * The recursive logic to transform a node in XML text.
 * It can be considered legacy, since it does not work with transformed nodes, and
 * probably will be removed in the future.
 * @param {XNode} node The node.
 * @param {string[]} buffer The buffer, that will represent the transformed XML text.
 * @param {XmlOutputOptions} options XML output options.
 */
function xmlTextRecursive(node: XNode, buffer: string[], options: XmlOutputOptions) {
    if (node.nodeType == DOM_TEXT_NODE) {
        buffer.push(xmlEscapeText(node.nodeValue));
    } else if (node.nodeType == DOM_CDATA_SECTION_NODE) {
        if (options.cData) {
            buffer.push(node.nodeValue);
        } else {
            buffer.push(`<![CDATA[${node.nodeValue}]]>`);
        }
    } else if (node.nodeType == DOM_COMMENT_NODE) {
        buffer.push(`<!--${node.nodeValue}-->`);
    } else if (node.nodeType == DOM_ELEMENT_NODE) {
        buffer.push(`<${xmlFullNodeName(node)}`);

        for (let i = 0; i < node.childNodes.length; ++i) {
            const childNode = node.childNodes[i];
            if (!childNode || childNode.nodeType !== DOM_ATTRIBUTE_NODE) {
                continue;
            }

            if (childNode.nodeName && childNode.nodeValue) {
                buffer.push(` ${xmlFullNodeName(childNode)}="${xmlEscapeAttr(childNode.nodeValue)}"`);
            }
        }

        if (node.childNodes.length === 0) {
            if (
                options.selfClosingTags ||
                (options.outputMethod === 'html' && ['hr', 'link'].includes(node.nodeName))
            ) {
                buffer.push('/>');
            } else {
                buffer.push(`></${xmlFullNodeName(node)}>`);
            }
        } else {
            buffer.push('>');
            for (let i = 0; i < node.childNodes.length; ++i) {
                xmlTextRecursive(node.childNodes[i], buffer, options);
            }
            buffer.push(`</${xmlFullNodeName(node)}>`);
        }
    } else if (node.nodeType == DOM_DOCUMENT_NODE || node.nodeType == DOM_DOCUMENT_FRAGMENT_NODE) {
        for (let i = 0; i < node.childNodes.length; ++i) {
            xmlTextRecursive(node.childNodes[i], buffer, options);
        }
    }
}

/**
 * Returns the representation of a node as XML text.
 * @param {XNode} node The starting node.
 * @param {XmlOutputOptions} options XML output options.
 * @returns The XML string.
 */
export function xmlTransformedText(
    node: XNode,
    options: XmlOutputOptions = {
        cData: true,
        escape: true,
        selfClosingTags: true,
        outputMethod: 'xml'
    }
) {
    const buffer: string[] = [];
    xmlTransformedTextRecursive(node, buffer, options);
    return buffer.join('');
}

/**
 * The recursive logic to transform a node in XML text.
 * @param {XNode} node The node.
 * @param {string[]} buffer The buffer, that will represent the transformed XML text.
 * @param {XmlOutputOptions} options XML output options.
 */
function xmlTransformedTextRecursive(node: XNode, buffer: string[], options: XmlOutputOptions) {
    if (node.visited) return;
    const nodeType = node.nodeType
    const nodeValue = node.nodeValue;
    if (nodeType === DOM_TEXT_NODE) {
        if (node.nodeValue && node.nodeValue.trim() !== '') {
            const finalText =
                node.escape && options.escape ? xmlEscapeText(node.nodeValue): xmlUnescapeText(node.nodeValue);
            buffer.push(finalText);
        }
    } else if (nodeType === DOM_CDATA_SECTION_NODE) {
        if (options.outputMethod === 'text') {
            // For text output, extract the raw content without CDATA markers
            buffer.push(nodeValue);
        } else if (options.cData) {
            buffer.push(xmlEscapeText(nodeValue));
        } else {
            buffer.push(`<![CDATA[${nodeValue}]]>`);
        }
    } else if (nodeType == DOM_COMMENT_NODE) {
        if (options.outputMethod !== 'text') {
            buffer.push(`<!-- ${nodeValue} -->`);
        }
    } else if (nodeType == DOM_ELEMENT_NODE) {
        if (options.outputMethod === 'text') {
            // For text output, only extract text content from elements
            xmlElementLogicTextOnly(node, buffer, options);
        } else {
            // If node didn't have a transformed name, but its children
            // had transformations, children should be present at output.
            // This is called here "muted logic".
            if (node.nodeName !== null && node.nodeName !== undefined) {
                xmlElementLogicTrivial(node, buffer, options);
            } else {
                xmlElementLogicMuted(node, buffer, options);
            }
        }
    } else if (nodeType === DOM_DOCUMENT_NODE || nodeType === DOM_DOCUMENT_FRAGMENT_NODE) {
        let childNodes = node.firstChild ? [] : node.childNodes;
        if (node.firstChild) {
            let child = node.firstChild;
            while (child) {
                childNodes.push(child);
                child = child.nextSibling;
            }
        }
        childNodes.sort((a, b) => a.siblingPosition - b.siblingPosition);

        for (let i = 0; i < childNodes.length; ++i) {
            xmlTransformedTextRecursive(childNodes[i], buffer, options);
        }
    }

    node.visited = true;
}

/**
 * XML element output, trivial logic.
 * @param node The XML node.
 * @param buffer The XML buffer.
 * @param cdata If using CDATA configuration.
 */
function xmlElementLogicTrivial(node: XNode, buffer: string[], options: XmlOutputOptions) {
    buffer.push(`<${xmlFullNodeName(node)}`);

    let attributes: XNode[] = [];
    if (node.firstChild) {
        let child = node.firstChild;
        while (child) {
            if (child.nodeType === DOM_ATTRIBUTE_NODE) {
                attributes.push(child);
            }
            child = child.nextSibling;
        }
    }
    if (attributes.length === 0) {
        attributes = node.childNodes.filter((n) => n.nodeType === DOM_ATTRIBUTE_NODE);
    }

    for (let i = 0; i < attributes.length; ++i) {
        const attribute = attributes[i];
        if (!attribute) {
            continue;
        }

        if (attribute.nodeName && attribute.nodeValue) {
            buffer.push(` ${xmlFullNodeName(attribute)}="${xmlEscapeAttr(attribute.nodeValue)}"`);
        }
    }

    let childNodes: XNode[] = [];
    if (node.firstChild) {
        let child = node.firstChild;
        while (child) {
            if (child.nodeType !== DOM_ATTRIBUTE_NODE) {
                childNodes.push(child);
            }
            child = child.nextSibling;
        }
    }
    if (childNodes.length === 0) {
        childNodes = node.childNodes.filter((n) => n.nodeType !== DOM_ATTRIBUTE_NODE);
    }

    childNodes = childNodes.sort((a, b) => a.siblingPosition - b.siblingPosition);
    if (childNodes.length === 0) {
        if (options.outputMethod === 'html' && ['hr', 'link', 'meta'].includes(node.nodeName)) {
            buffer.push('>');
        } else if (options.selfClosingTags) {
            buffer.push('/>');
        } else {
            buffer.push(`></${xmlFullNodeName(node)}>`);
        }
    } else {
        buffer.push('>');
        for (let i = 0; i < childNodes.length; ++i) {
            xmlTransformedTextRecursive(childNodes[i], buffer, options);
        }
        buffer.push(`</${xmlFullNodeName(node)}>`);
    }
}

/**
 * XML element output, muted logic.
 * In other words, this element should not be printed, but its
 * children can be printed if they have transformed values.
 * @param node The XML node.
 * @param buffer The XML buffer.
 * @param cdata If using CDATA configuration.
 */
function xmlElementLogicMuted(node: XNode, buffer: any[], options: XmlOutputOptions) {
    let childNodes: XNode[] = [];
    if (node.firstChild) {
        let child = node.firstChild;
        while (child) {
            childNodes.push(child);
            child = child.nextSibling;
        }
    } else {
        childNodes = node.childNodes;
    }
    childNodes = childNodes.sort((a, b) => a.siblingPosition - b.siblingPosition);
    for (let i = 0; i < childNodes.length; ++i) {
        xmlTransformedTextRecursive(childNodes[i], buffer, options);
    }
}

/**
 * XML element output for text mode - extracts only text content without tags.
 * @param node The XML node.
 * @param buffer The output buffer.
 * @param options XML output options.
 */
function xmlElementLogicTextOnly(node: XNode, buffer: string[], options: XmlOutputOptions) {
    let childNodes: XNode[] = [];
    if (node.firstChild) {
        let child = node.firstChild;
        while (child) {
            childNodes.push(child);
            child = child.nextSibling;
        }
    } else {
        childNodes = node.childNodes;
    }
    childNodes = childNodes.sort((a, b) => a.siblingPosition - b.siblingPosition);
    for (let i = 0; i < childNodes.length; ++i) {
        xmlTransformedTextRecursive(childNodes[i], buffer, options);
    }
}

/**
 * Gets the full node name.
 * When namespace is set, the node name is `namespace:node`.
 * @param node The node.
 * @returns The full node name as a string.
 */
function xmlFullNodeName(node: XNode): string {
    const nodeName = node.nodeName;
    if (node.prefix && nodeName.indexOf(`${node.prefix}:`) != 0) {
        return `${node.prefix}:${nodeName}`;
    }

    return nodeName;
}

/**
 * Replaces HTML/XML entities to their literal characters.
 * Currently implementing only tag delimiters.
 * @param text The text to be transformed.
 * @returns The unescaped text.
 */
export function xmlUnescapeText(text: string): string {
    return `${text}`.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

/**
 * Escape XML special markup characters: tag delimiter <, >, and entity
 * reference start delimiter &. The escaped string can be used in XML
 * text portions (i.e. between tags).
 * @param s The string to be escaped.
 * @returns The escaped string.
 */
export function xmlEscapeText(s: string): string {
    return `${s}`
        .replace(/&/g, '&amp;')
        .replace(/&amp;amp;/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/**
 * Escape XML special markup characters: tag delimiter, <, >, entity
 * reference start delimiter &, and double quotes ("). The escaped string can be
 * used in double quoted XML attribute value portions (i.e. in
 * attributes within start tags).
 * @param s The string to be escaped.
 * @returns The escaped string.
 */
function xmlEscapeAttr(s: string): string {
    return xmlEscapeText(s).replace(/"/g, '&quot;');
}

/**
 * Wrapper function to access attribute values of template element
 * nodes. Currently this calls he.decode because in some DOM
 * implementations the return value of node.getAttributeValue()
 * contains unresolved XML entities, although the DOM spec requires
 * that entity references are resolved by the DOM.
 * @param node TODO
 * @param name TODO
 * @returns TODO
 */
export function xmlGetAttribute(node: XNode, name: string): string {
    // TODO(mesch): This should not be necessary if the DOM is working
    // correctly. The DOM is responsible for resolving entities, not the
    // application.
    const value = domGetAttributeValue(node, name);
    if (value) {
        return he.decode(value);
    }

    return value;
}

/**
 * Wrapper function to access the owner document uniformly for document
 * and other nodes: for the document node, the owner document is the
 * node itself, for all others it's the ownerDocument property.
 *
 * @param {XNode} node
 * @return {XDocument}
 */
export function xmlOwnerDocument(node: XNode): XDocument {
    if (node === null || node === undefined) {
        throw new Error('Node has no valid owner document.');
    }

    if (node.nodeType === DOM_DOCUMENT_NODE) {
        return node as XDocument;
    }

    return xmlOwnerDocument(node.ownerDocument);
}

/**
 * Converts an XNode to a JSON-serializable object.
 * Uses JSON.parse(JSON.stringify()) approach to filter out unwanted properties.
 * @param node The node to convert.
 * @returns A JSON-serializable object representation of the node.
 */
function nodeToJsonObject(node: XNode): any {
    if (!node) {
        return null;
    }

    const nodeType = node.nodeType;

    // Handle text nodes
    if (nodeType === DOM_TEXT_NODE || nodeType === DOM_CDATA_SECTION_NODE) {
        const text = node.nodeValue ? node.nodeValue.trim() : '';
        return text.length > 0 ? text : null;
    }

    // Handle comment nodes
    if (nodeType === DOM_COMMENT_NODE) {
        return null; // Skip comments in JSON output
    }

    // Handle document and document fragments
    if (nodeType === DOM_DOCUMENT_NODE || nodeType === DOM_DOCUMENT_FRAGMENT_NODE) {
        const children = node.childNodes || [];
        const childObjects = [];
        
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            const childObj = nodeToJsonObject(child);
            if (childObj !== null) {
                childObjects.push(childObj);
            }
        }

        if (childObjects.length === 0) {
            return null;
        } else if (childObjects.length === 1) {
            return childObjects[0];
        } else {
            return childObjects;
        }
    }

    // Handle element nodes
    if (nodeType === DOM_ELEMENT_NODE) {
        const obj: any = {};
        const element = node as any;
        const hasAttributes = element.attributes && element.attributes.length > 0;
        
        // Add attributes with @ prefix
        if (hasAttributes) {
            for (let i = 0; i < element.attributes.length; i++) {
                const attr = element.attributes[i];
                obj['@' + attr.nodeName] = attr.nodeValue;
            }
        }

        // Process child nodes
        const children = element.childNodes || [];
        let textContent = '';
        let hasElementChildren = false;
        const childElements: { [key: string]: any } = {};

        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            const childType = child.nodeType;

            if (childType === DOM_TEXT_NODE || childType === DOM_CDATA_SECTION_NODE) {
                const text = child.nodeValue ? child.nodeValue.trim() : '';
                if (text.length > 0) {
                    textContent += text;
                }
            } else if (childType === DOM_ELEMENT_NODE) {
                hasElementChildren = true;
                const childElement = child as any;
                const childName = childElement.localName || childElement.nodeName;
                const childObj = nodeToJsonObject(child);

                if (childObj !== null) {
                    if (childElements[childName]) {
                        // Multiple elements with same name - convert to array
                        if (!Array.isArray(childElements[childName])) {
                            childElements[childName] = [childElements[childName]];
                        }
                        childElements[childName].push(childObj);
                    } else {
                        childElements[childName] = childObj;
                    }
                }
            }
        }

        // Add child elements to object
        Object.assign(obj, childElements);

        // Add text content if no element children and has text
        if (!hasElementChildren && textContent.length > 0) {
            if (!hasAttributes && Object.keys(childElements).length === 0) {
                // Only text, no attributes or element children
                return textContent;
            } else {
                // Has attributes and/or element children plus text
                obj['#text'] = textContent;
            }
        }

        // If completely empty (no attributes, no children, no text), return null
        if (Object.keys(obj).length === 0) {
            return null;
        }

        return obj;
    }

    return null;
}

/**
 * Detects the most appropriate output format for a node based on its structure.
 * This implements XSLT 3.1 adaptive output behavior.
 * @param node The node to analyze.
 * @returns The detected output method: 'text' or 'xml'.
 */
export function detectAdaptiveOutputFormat(node: XNode): 'text' | 'xml' {
    if (!node) {
        return 'xml';
    }

    const nodeType = node.nodeType;

    // If it's a document or fragment, check its children
    if (nodeType === DOM_DOCUMENT_NODE || nodeType === DOM_DOCUMENT_FRAGMENT_NODE) {
        const children = node.childNodes || [];
        let elementCount = 0;
        let textCount = 0;
        let hasSignificantText = false;

        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            if (child.nodeType === DOM_ELEMENT_NODE) {
                elementCount++;
            } else if (child.nodeType === DOM_TEXT_NODE) {
                const text = child.nodeValue ? child.nodeValue.trim() : '';
                if (text.length > 0) {
                    textCount++;
                    hasSignificantText = true;
                }
            }
        }

        // If there's only text content and no elements, use text output
        if (elementCount === 0 && hasSignificantText) {
            return 'text';
        }
        // Otherwise, use XML output
        return 'xml';
    }

    // If it's a single text node with content, use text output
    if (nodeType === DOM_TEXT_NODE || nodeType === DOM_CDATA_SECTION_NODE) {
        const text = node.nodeValue ? node.nodeValue.trim() : '';
        if (text.length > 0) {
            return 'text';
        }
    }

    // For elements and other node types, use XML output
    return 'xml';
}

/**
 * Converts an XML document to a JSON string.
 * The root element becomes the top-level object.
 * Element attributes are prefixed with '@'.
 * Text nodes become the '#text' property or the value itself.
 * @param node The root node to convert.
 * @returns A JSON string representation of the document.
 */
export function xmlToJson(node: XNode): string {
    if (!node) {
        return '{}';
    }

    // For document nodes, find the root element and wrap it
    let rootElement: XNode = node;
    if (node.nodeType === DOM_DOCUMENT_NODE || node.nodeType === DOM_DOCUMENT_FRAGMENT_NODE) {
        const children = node.childNodes || [];
        for (let i = 0; i < children.length; i++) {
            if (children[i].nodeType === DOM_ELEMENT_NODE) {
                rootElement = children[i];
                break;
            }
        }
    }

    // Convert the root element to JSON
    const element = rootElement as any;
    const rootName = element.localName || element.nodeName;
    const jsonObj: any = {};
    
    // Build the root element object
    const elementContent = nodeToJsonObject(rootElement);
    
    if (elementContent === null) {
        // Empty root element
        jsonObj[rootName] = {};
    } else if (typeof elementContent === 'object' && !Array.isArray(elementContent)) {
        // Object with properties/attributes
        jsonObj[rootName] = elementContent;
    } else {
        // Simple text content
        jsonObj[rootName] = elementContent;
    }

    // Use JSON.stringify to clean up the object and then JSON.parse and stringify again
    // This ensures we only have plain properties without circular references
    try {
        const cleaned = JSON.parse(JSON.stringify(jsonObj));
        return JSON.stringify(cleaned);
    } catch (error) {
        // Fallback if stringification fails
        return JSON.stringify(jsonObj);
    }
}
