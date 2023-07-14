import he from 'he';

import {
    DOM_ATTRIBUTE_NODE,
    DOM_CDATA_SECTION_NODE,
    DOM_COMMENT_NODE,
    DOM_DOCUMENT_FRAGMENT_NODE,
    DOM_DOCUMENT_NODE,
    DOM_ELEMENT_NODE,
    DOM_TEXT_NODE
} from '../constants';
import { domGetAttributeValue } from './functions';
import { XNode } from './xnode';
import { XDocument } from './xdocument';
import { XmlOutputOptions } from './xml-output-options';

// Returns the text value of a node; for nodes without children this
// is the nodeValue, for nodes with children this is the concatenation
// of the value of all children. Browser-specific optimizations are used by
// default; they can be disabled by passing "true" in as the second parameter.
export function xmlValue(node: any, disallowBrowserSpecificOptimization: boolean = false) {
    if (!node) {
        return '';
    }

    let ret = '';
    if (node.nodeType == DOM_TEXT_NODE || node.nodeType == DOM_CDATA_SECTION_NODE) {
        ret += node.nodeValue;
    } else if (node.nodeType == DOM_ATTRIBUTE_NODE) {
        ret += node.nodeValue;
    } else if (
        node.nodeType == DOM_ELEMENT_NODE ||
        node.nodeType == DOM_DOCUMENT_NODE ||
        node.nodeType == DOM_DOCUMENT_FRAGMENT_NODE
    ) {
        if (!disallowBrowserSpecificOptimization) {
            // IE, Safari, Opera, and friends
            const innerText = node.innerText;
            if (innerText != undefined) {
                return innerText;
            }
            // Firefox
            const textContent = node.textContent;
            if (textContent != undefined) {
                return textContent;
            }
        }

        if (node.transformedChildNodes.length > 0) {
            for (let i = 0; i < node.transformedChildNodes.length; ++i) {
                ret += xmlValue(node.transformedChildNodes[i]);
            }
        } else {
            for (let i = 0; i < node.childNodes.length; ++i) {
                ret += xmlValue(node.childNodes[i]);
            }
        }
    }
    return ret;
}

// TODO: Give a better name to this.
export function xmlValue2(node: any, disallowBrowserSpecificOptimization: boolean = false) {
    if (!node) {
        return '';
    }

    let ret = '';
    if (node.nodeType == DOM_TEXT_NODE || node.nodeType == DOM_CDATA_SECTION_NODE) {
        ret += node.nodeValue;
    } else if (node.nodeType == DOM_ATTRIBUTE_NODE) {
        ret += node.nodeValue;
    } else if (
        node.nodeType == DOM_ELEMENT_NODE ||
        node.nodeType == DOM_DOCUMENT_NODE ||
        node.nodeType == DOM_DOCUMENT_FRAGMENT_NODE
    ) {
        if (!disallowBrowserSpecificOptimization) {
            // IE, Safari, Opera, and friends
            const innerText = node.innerText;
            if (innerText != undefined) {
                return innerText;
            }
            // Firefox
            const textContent = node.textContent;
            if (textContent != undefined) {
                return textContent;
            }
        }
        // pobrecito!
        const len = node.transformedChildNodes.length;
        for (let i = 0; i < len; ++i) {
            ret += xmlValue(node.transformedChildNodes[i]);
        }
    }
    return ret;
}

/**
 * Returns the representation of a node as XML text.
 * @param node The starting node.
 * @param opt_cdata If using CDATA configuration.
 * @returns The XML string.
 */
export function xmlText(node: XNode, opt_cdata: boolean = false) {
    const buf = [];
    xmlTextRecursive(node, buf, opt_cdata);
    return buf.join('');
}

function xmlTextRecursive(node: XNode, buf: any[], cdata: any) {
    if (node.nodeType == DOM_TEXT_NODE) {
        buf.push(xmlEscapeText(node.nodeValue));
    } else if (node.nodeType == DOM_CDATA_SECTION_NODE) {
        if (cdata) {
            buf.push(node.nodeValue);
        } else {
            buf.push(`<![CDATA[${node.nodeValue}]]>`);
        }
    } else if (node.nodeType == DOM_COMMENT_NODE) {
        buf.push(`<!--${node.nodeValue}-->`);
    } else if (node.nodeType == DOM_ELEMENT_NODE) {
        buf.push(`<${xmlFullNodeName(node)}`);
        for (let i = 0; i < node.attributes.length; ++i) {
            const a = node.attributes[i];
            if (a && a.nodeName && a.nodeValue) {
                buf.push(` ${xmlFullNodeName(a)}="${xmlEscapeAttr(a.nodeValue)}"`);
            }
        }

        if (node.childNodes.length == 0) {
            buf.push('/>');
        } else {
            buf.push('>');
            for (let i = 0; i < node.childNodes.length; ++i) {
                xmlTextRecursive(node.childNodes[i], buf, cdata);
            }
            buf.push(`</${xmlFullNodeName(node)}>`);
        }
    } else if (node.nodeType == DOM_DOCUMENT_NODE || node.nodeType == DOM_DOCUMENT_FRAGMENT_NODE) {
        for (let i = 0; i < node.childNodes.length; ++i) {
            xmlTextRecursive(node.childNodes[i], buf, cdata);
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
        cData: false,
        escape: true
    }
) {
    const buffer = [];
    xmlTransformedTextRecursive(node, buffer, options);
    return buffer.join('');
}

function xmlTransformedTextRecursive(node: XNode, buffer: any[], options: XmlOutputOptions) {
    if (node.printed) return;
    const nodeType = node.transformedNodeType || node.nodeType;
    const nodeValue = node.transformedNodeValue || node.nodeValue;
    if (nodeType == DOM_TEXT_NODE) {
        if (node.transformedNodeValue && node.transformedNodeValue.trim() !== '') {
            const finalText = node.escape && options.escape?
                xmlEscapeText(node.transformedNodeValue) :
                node.transformedNodeValue;
            buffer.push(finalText);
        }
    } else if (nodeType == DOM_CDATA_SECTION_NODE) {
        if (options.cData) {
            buffer.push(nodeValue);
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
    } else if (nodeType == DOM_DOCUMENT_NODE || nodeType == DOM_DOCUMENT_FRAGMENT_NODE) {
        const childNodes = node.transformedChildNodes.concat(node.childNodes);

        for (let i = 0; i < childNodes.length; ++i) {
            xmlTransformedTextRecursive(childNodes[i], buffer, options);
        }
    }

    node.printed = true;
}

/**
 * XML element output, trivial logic.
 * @param node The XML node.
 * @param buffer The XML buffer.
 * @param cdata If using CDATA configuration.
 */
function xmlElementLogicTrivial(node: XNode, buffer: string[], options: XmlOutputOptions) {
    buffer.push(`<${xmlFullNodeName(node)}`);

    const attributes = node.transformedAttributes || node.attributes;
    for (let i = 0; i < attributes.length; ++i) {
        const attribute = attributes[i];
        if (!attribute) {
            continue;
        }

        if (attribute.transformedNodeName && attribute.transformedNodeValue) {
            buffer.push(` ${xmlFullNodeName(attribute)}="${xmlEscapeAttr(attribute.transformedNodeValue)}"`);
        }
    }

    const childNodes = node.transformedChildNodes.length > 0 ? node.transformedChildNodes : node.childNodes;
    if (childNodes.length === 0) {
        buffer.push('/>');
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
    const childNodes = node.transformedChildNodes.length > 0 ? node.transformedChildNodes : node.childNodes;
    for (let i = 0; i < childNodes.length; ++i) {
        xmlTransformedTextRecursive(childNodes[i], buffer, options);
    }
}

function xmlFullNodeName(node: XNode) {
    const nodeName = node.transformedNodeName || node.nodeName;
    if (node.transformedPrefix && nodeName.indexOf(`${node.transformedPrefix}:`) != 0) {
        return `${node.transformedPrefix}:${nodeName}`;
    }

    return nodeName;
}

/**
 * Escape XML special markup chracters: tag delimiter < > and entity
 * reference start delimiter &. The escaped string can be used in XML
 * text portions (i.e. between tags).
 * @param s The string to be escaped.
 * @returns The escaped string.
 */
export function xmlEscapeText(s: string) {
    return `${s}`
        .replace(/&/g, '&amp;')
        .replace(/&amp;amp;/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/**
 * Escape XML special markup characters: tag delimiter < > entity
 * reference start delimiter & and quotes ". The escaped string can be
 * used in double quoted XML attribute value portions (i.e. in
 * attributes within start tags).
 * @param s The string to be escaped.
 * @returns The escaped string.
 */
function xmlEscapeAttr(s: string) {
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
export function xmlGetAttribute(node: XNode, name: string) {
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
