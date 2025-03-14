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

            if (node.transformedChildNodes.length > 0) {
                const transformedTextNodes = node.transformedChildNodes.filter(
                    (n: XNode) => n.nodeType !== DOM_ATTRIBUTE_NODE
                );
                for (let i = 0; i < transformedTextNodes.length; ++i) {
                    ret += xmlValue(transformedTextNodes[i]);
                }
            } else {
                const textNodes = node.childNodes.filter((n: XNode) => n.nodeType !== DOM_ATTRIBUTE_NODE);
                for (let i = 0; i < textNodes.length; ++i) {
                    ret += xmlValue(textNodes[i]);
                }
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

            const len = node.transformedChildNodes.length;
            for (let i = 0; i < len; ++i) {
                returnedXmlString += xmlValue(node.transformedChildNodes[i]);
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
    const nodeType = node.transformedNodeType || node.nodeType;
    const nodeValue = node.transformedNodeValue || node.nodeValue;
    if (nodeType === DOM_TEXT_NODE) {
        if (node.transformedNodeValue && node.transformedNodeValue.trim() !== '') {
            const finalText =
                node.escape && options.escape ? xmlEscapeText(node.transformedNodeValue): xmlUnescapeText(node.transformedNodeValue);
            buffer.push(finalText);
        }
    } else if (nodeType === DOM_CDATA_SECTION_NODE) {
        if (options.cData) {
            buffer.push(xmlEscapeText(nodeValue));
        } else {
            buffer.push(`<![CDATA[${nodeValue}]]>`);
        }
    } else if (nodeType == DOM_COMMENT_NODE) {
        buffer.push(`<!-- ${nodeValue} -->`);
    } else if (nodeType == DOM_ELEMENT_NODE) {
        // If node didn't have a transformed name, but its children
        // had transformations, children should be present at output.
        // This is called here "muted logic".
        if (node.transformedNodeName !== null && node.transformedNodeName !== undefined) {
            xmlElementLogicTrivial(node, buffer, options);
        } else {
            xmlElementLogicMuted(node, buffer, options);
        }
    } else if (nodeType === DOM_DOCUMENT_NODE || nodeType === DOM_DOCUMENT_FRAGMENT_NODE) {
        const childNodes = node.transformedChildNodes.concat(node.childNodes);
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

    let attributes = node.transformedChildNodes.filter((n) => n.nodeType === DOM_ATTRIBUTE_NODE);
    if (attributes.length === 0) {
        attributes = node.childNodes.filter((n) => n.nodeType === DOM_ATTRIBUTE_NODE);
    }

    for (let i = 0; i < attributes.length; ++i) {
        const attribute = attributes[i];
        if (!attribute) {
            continue;
        }

        if (attribute.transformedNodeName && attribute.transformedNodeValue) {
            buffer.push(` ${xmlFullNodeName(attribute)}="${xmlEscapeAttr(attribute.transformedNodeValue)}"`);
        }
    }

    let childNodes = node.transformedChildNodes.filter((n) => n.nodeType !== DOM_ATTRIBUTE_NODE);
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
    let childNodes = node.transformedChildNodes.length > 0 ? node.transformedChildNodes : node.childNodes;
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
    const nodeName = node.transformedNodeName || node.nodeName;
    if (node.transformedPrefix && nodeName.indexOf(`${node.transformedPrefix}:`) != 0) {
        return `${node.transformedPrefix}:${nodeName}`;
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
