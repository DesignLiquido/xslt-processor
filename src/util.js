// Copyright 2018 Johannes Wilm
// Copyright 2005 Google
//
// Original author: Steffen Meschkat <mesch@google.com>
//
// Miscellaneous utility and placeholder functions.
// Dummy implmentation for the logging functions. Replace by something
// useful when you want to debug.
import {
    FunctionCallExpr,
    UnaryMinusExpr,
    BinaryExpr,
    NumberExpr
} from "./xpath.js"
import {
    DOM_TEXT_NODE,
    DOM_CDATA_SECTION_NODE,
    DOM_ELEMENT_NODE,
    DOM_DOCUMENT_NODE,
    DOM_DOCUMENT_FRAGMENT_NODE,
    DOM_ATTRIBUTE_NODE,
    DOM_COMMENT_NODE
} from "./dom.js"
// Throws an exception if false.
export function assert(b) {
    if (!b) {
        throw "Assertion failed";
    }
}

// Applies the given function to each element of the array, preserving
// this, and passing the index.
export function mapExec(array, func) {
    for (let i = 0; i < array.length; ++i) {
        func.call(this, array[i], i);
    }
}

// Returns an array that contains the return value of the given
// function applied to every element of the input array.
export function mapExpr(array, func) {
    const ret = [];
    for (let i = 0; i < array.length; ++i) {
        ret.push(func(array[i]));
    }
    return ret;
}

// Reverses the given array in place.
export function reverseInplace(array) {
    for (let i = 0; i < array.length / 2; ++i) {
        const h = array[i];
        const ii = array.length - i - 1;
        array[i] = array[ii];
        array[ii] = h;
    }
}

// Shallow-copies an array to the end of another array
// Basically Array.concat, but works with other non-array collections
export function copyArray(dst, src) {
    if (!src) return;
    const dstLength = dst.length;
    for (let i = src.length - 1; i >= 0; --i) {
        dst[i + dstLength] = src[i];
    }
}

/**
 * This is an optimization for copying attribute lists in IE. IE includes many
 * extraneous properties in its DOM attribute lists, which take require
 * significant extra processing when evaluating attribute steps. With this
 * function, we ignore any such attributes that has an empty string value.
 */
export function copyArrayIgnoringAttributesWithoutValue(dst, src) {
    if (!src) return;
    for (let i = src.length - 1; i >= 0; --i) {
        // this test will pass so long as the attribute has a non-empty string
        // value, even if that value is "false", "0", "undefined", etc.
        if (src[i].nodeValue) {
            dst.push(src[i]);
        }
    }
}

// Returns the text value of a node; for nodes without children this
// is the nodeValue, for nodes with children this is the concatenation
// of the value of all children. Browser-specific optimizations are used by
// default; they can be disabled by passing "true" in as the second parameter.
export function xmlValue(node, disallowBrowserSpecificOptimization) {
    if (!node) {
        return '';
    }

    let ret = '';
    if (node.nodeType == DOM_TEXT_NODE ||
        node.nodeType == DOM_CDATA_SECTION_NODE) {
        ret += node.nodeValue;

    } else if (node.nodeType == DOM_ATTRIBUTE_NODE) {
        ret += node.nodeValue;
    } else if (node.nodeType == DOM_ELEMENT_NODE ||
        node.nodeType == DOM_DOCUMENT_NODE ||
        node.nodeType == DOM_DOCUMENT_FRAGMENT_NODE) {
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
export function xmlText(node, opt_cdata) {
    const buf = [];
    xmlTextR(node, buf, opt_cdata);
    return buf.join('');
}

function xmlTextR(node, buf, cdata) {
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
                xmlTextR(node.childNodes[i], buf, cdata);
            }
            buf.push(`</${xmlFullNodeName(node)}>`);
        }

    } else if (node.nodeType == DOM_DOCUMENT_NODE ||
        node.nodeType == DOM_DOCUMENT_FRAGMENT_NODE) {
        for (let i = 0; i < node.childNodes.length; ++i) {
            xmlTextR(node.childNodes[i], buf, cdata);
        }
    }
}

function xmlFullNodeName(n) {
    if (n.prefix && n.nodeName.indexOf(`${n.prefix}:`) != 0) {
        return `${n.prefix}:${n.nodeName}`;
    } else {
        return n.nodeName;
    }
}

// Escape XML special markup chracters: tag delimiter < > and entity
// reference start delimiter &. The escaped string can be used in XML
// text portions (i.e. between tags).
export function xmlEscapeText(s) {
    return (`${s}`).
        replace(/&/g, '&amp;').
        replace(/&amp;amp;/g, '&amp;').
        replace(/</g, '&lt;').
        replace(/>/g, '&gt;');
}

// Escape XML special markup characters: tag delimiter < > entity
// reference start delimiter & and quotes ". The escaped string can be
// used in double quoted XML attribute value portions (i.e. in
// attributes within start tags).
function xmlEscapeAttr(s) {
    return xmlEscapeText(s).replace(/"/g, '&quot;');
}

/**
 * Wrapper function to access the owner document uniformly for document
 * and other nodes: for the document node, the owner document is the
 * node itself, for all others it's the ownerDocument property.
 *
 * @param {Node} node
 * @return {Document}
 */
export function xmlOwnerDocument(node) {
    if (node.nodeType == DOM_DOCUMENT_NODE) {
        return node;
    } else {
        return node.ownerDocument;
    }
}

// Wrapper around DOM methods so we can condense their invocations.
export function domGetAttribute(node, name) {
    return node.getAttribute(name);
}

export function domSetAttribute(node, name, value) {
    return node.setAttribute(name, value);
}

export function domAppendChild(node, child) {
    return node.appendChild(child);
}

export function domCreateTextNode(doc, text) {
    return doc.createTextNode(text);
}

export function domCreateElement(doc, name) {
    return doc.createElement(name);
}

export function domCreateCDATASection(doc, data) {
    return doc.createCDATASection(data);
}

export function domCreateComment(doc, text) {
    return doc.createComment(text);
}

export function domCreateDocumentFragment(doc) {
    return doc.createDocumentFragment();
}

/**
 * Escape the special regular expression characters when the regular expression
 * is specified as a string.
 *
 * Based on: http://simonwillison.net/2006/Jan/20/escape/
 */
const regExpSpecials = [
    '/', '.', '*', '+', '?', '|', '^', '$',
    '(', ')', '[', ']', '{', '}', '\\'
];

const sRE = new RegExp(
    `(\\${regExpSpecials.join('|\\')})`, 'g'
);

export function regExpEscape(text) {
    return text.replace(sRE, '\\$1')
}

/**
 * Determines whether a predicate expression contains a "positional selector".
 * A positional selector filters nodes from the nodelist input based on their
 * position within that list. When such selectors are encountered, the
 * evaluation of the predicate cannot be depth-first, because the positional
 * selector may be based on the result of evaluating predicates that precede
 * it.
 */
export function predicateExprHasPositionalSelector(expr, isRecursiveCall) {
    if (!expr) {
        return false;
    }
    if (!isRecursiveCall && exprReturnsNumberValue(expr)) {
        // this is a "proximity position"-based predicate
        return true;
    }
    if (expr instanceof FunctionCallExpr) {
        const value = expr.name.value;
        return (value == 'last' || value == 'position');
    }
    if (expr instanceof BinaryExpr) {
        return (
            predicateExprHasPositionalSelector(expr.expr1, true) ||
            predicateExprHasPositionalSelector(expr.expr2, true));
    }
    return false;
}

function exprReturnsNumberValue(expr) {
    if (expr instanceof FunctionCallExpr) {
        let isMember = {
            last: true,
            position: true,
            count: true,
            'string-length': true,
            number: true,
            sum: true,
            floor: true,
            ceiling: true,
            round: true
        };
        return isMember[expr.name.value];
    } else if (expr instanceof UnaryMinusExpr) {
        return true;
    } else if (expr instanceof BinaryExpr) {
        let isMember = {
            '+': true,
            '-': true,
            '*': true,
            mod: true,
            div: true
        };
        return isMember[expr.op.value];
    } else if (expr instanceof NumberExpr) {
        return true;
    }
    return false;
}
