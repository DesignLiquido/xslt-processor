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
import { domGetAttribute } from './functions';
import { XNode } from './xnode';

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
        // pobrecito!
        const len = node.childNodes.length;
        for (let i = 0; i < len; ++i) {
            ret += xmlValue(node.childNodes[i]);
        }
    }
    return ret;
}

// Returns the representation of a node as XML text.
export function xmlText(node: any, opt_cdata: boolean = false) {
    const buf = [];
    xmlTextRecursive(node, buf, opt_cdata);
    return buf.join('');
}

function xmlTextRecursive(node: any, buf: any[], cdata: any) {
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

function xmlFullNodeName(n: any) {
    if (n.prefix && n.nodeName.indexOf(`${n.prefix}:`) != 0) {
        return `${n.prefix}:${n.nodeName}`;
    }

    return n.nodeName;
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
    const value = domGetAttribute(node, name);
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
 * @param {Node} node
 * @return {Document}
 */
export function xmlOwnerDocument(node: any) {
    if (node.nodeType == DOM_DOCUMENT_NODE) {
        return node;
    }

    return node.ownerDocument;
}
