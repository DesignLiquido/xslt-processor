// Copyright 2018 Johannes Wilm
// Copyright 2005 Google Inc.
// All Rights Reserved
//
// Original author: Steffen Meschkat <mesch@google.com>
//
// An XML parse and a minimal DOM implementation that just supports
// the subset of the W3C DOM that is used in the XSLT implementation.
import he from "he"

import {
    domSetAttribute,
    domAppendChild,
    domCreateTextNode,
    domCreateElement,
    domCreateCDATASection,
    domCreateComment
} from "./util.js"
import {
    XML10_VERSION_INFO,
    XML10_NAME,
    XML10_ATTRIBUTE,
    XML11_VERSION_INFO,
    XML11_NAME,
    XML11_ATTRIBUTE
} from "./xmltoken.js"


const XML10_TAGNAME_REGEXP = new RegExp(`^(${XML10_NAME})`);
const XML10_ATTRIBUTE_REGEXP = new RegExp(XML10_ATTRIBUTE, 'g');

const XML11_TAGNAME_REGEXP = new RegExp(`^(${XML11_NAME})`);
const XML11_ATTRIBUTE_REGEXP = new RegExp(XML11_ATTRIBUTE, 'g');


// Parses the given XML string with our custom, JavaScript XML parser. Written
// by Steffen Meschkat (mesch@google.com).
export function xmlParse(xml) {
    const regex_empty = /\/$/;

    let regex_tagname;
    let regex_attribute;
    if (xml.match(/^<\?xml/)) {
        // When an XML document begins with an XML declaration
        // VersionInfo must appear.
        if (xml.search(new RegExp(XML10_VERSION_INFO)) == 5) {
            regex_tagname = XML10_TAGNAME_REGEXP;
            regex_attribute = XML10_ATTRIBUTE_REGEXP;
        } else if (xml.search(new RegExp(XML11_VERSION_INFO)) == 5) {
            regex_tagname = XML11_TAGNAME_REGEXP;
            regex_attribute = XML11_ATTRIBUTE_REGEXP;
        } else {
            // VersionInfo is missing, or unknown version number.
            // TODO : Fallback to XML 1.0 or XML 1.1, or just return null?
            throw('VersionInfo is missing, or unknown version number.');
        }
    } else {
        // When an XML declaration is missing it's an XML 1.0 document.
        regex_tagname = XML10_TAGNAME_REGEXP;
        regex_attribute = XML10_ATTRIBUTE_REGEXP;
    }

    const xmldoc = new XDocument();
    const root = xmldoc;
    const stack = [];

    let parent = root;
    stack.push(parent);

    let tag = false,
        quotes = false,
        doublequotes = false,
        start = 0;
    for (let i = 0; i < xml.length; ++i) {
        let char = xml.charAt(i);
        if (tag && !doublequotes && char === "'") {
            quotes = !quotes;
        } else if (tag && !quotes && char === "\"") {
            doublequotes = !doublequotes;
        } else if (tag && char === ">" && !quotes && !doublequotes) {
            let text = xml.slice(start, i);
            if (text.charAt(0) == '/') {
                stack.pop();
                parent = stack[stack.length - 1];
            } else if (text.charAt(0) == '?') {
                // Ignore XML declaration and processing instructions
            } else if (text.charAt(0) == '!') {
                // Ignore malformed notation and comments
            } else {
                const empty = text.match(regex_empty);
                const tagname = regex_tagname.exec(text)[1];
                let node = domCreateElement(xmldoc, tagname);

                let att;
                while ((att = regex_attribute.exec(text))) {
                    const val = he.decode(att[5] || att[7] || '');
                    domSetAttribute(node, att[1], val);
                }

                domAppendChild(parent, node);
                if (!empty) {
                    parent = node;
                    stack.push(node);
                }
            }
            start = i + 1;
            tag = false;
            quotes = false;
            doublequotes = false;
        } else if (!tag && char === "<") {
            let text = xml.slice(start, i)
            if (text && parent != root) {
                domAppendChild(parent, domCreateTextNode(xmldoc, text));
            }
            if (xml.slice(i+1,i+4)==="!--") {
                let endTagIndex = xml.slice(i+4).indexOf('-->');
                if (endTagIndex) {
                    let node = domCreateComment(xmldoc, xml.slice(i+4, i+endTagIndex+4));
                    domAppendChild(parent, node);
                    i += endTagIndex+6;
                }
            } else if (xml.slice(i+1,i+9)==="![CDATA[") {
                let endTagIndex = xml.slice(i+9).indexOf(']]>');
                if (endTagIndex) {
                    let node = domCreateCDATASection(xmldoc, xml.slice(i+9, i+endTagIndex+9));
                    domAppendChild(parent, node);
                    i += endTagIndex+11;
                }
            } else {
                tag = true;
            }
            start = i + 1;
        }
    }

    return root;
}

// Based on <http://www.w3.org/TR/2000/REC-DOM-Level-2-Core-20001113/
// core.html#ID-1950641247>
export const DOM_ELEMENT_NODE = 1;
export const DOM_ATTRIBUTE_NODE = 2;
export const DOM_TEXT_NODE = 3;
export const DOM_CDATA_SECTION_NODE = 4;
// const DOM_ENTITY_REFERENCE_NODE = 5;
// const DOM_ENTITY_NODE = 6;
export const DOM_PROCESSING_INSTRUCTION_NODE = 7;
export const DOM_COMMENT_NODE = 8;
export const DOM_DOCUMENT_NODE = 9;
// const DOM_DOCUMENT_TYPE_NODE = 10;
export const DOM_DOCUMENT_FRAGMENT_NODE = 11;
// const DOM_NOTATION_NODE = 12;

// Traverses the element nodes in the DOM section underneath the given
// node and invokes the given callbacks as methods on every element
// node encountered. Function opt_pre is invoked before a node's
// children are traversed; opt_post is invoked after they are
// traversed. Traversal will not be continued if a callback function
// returns boolean false. NOTE(mesch): copied from
// <//google3/maps/webmaps/javascript/dom.js>.
function domTraverseElements(node, opt_pre, opt_post) {
    let ret;
    if (opt_pre) {
        ret = opt_pre.call(null, node);
        if (typeof ret == 'boolean' && !ret) {
            return false;
        }
    }

    for (let c = node.firstChild; c; c = c.nextSibling) {
        if (c.nodeType == DOM_ELEMENT_NODE) {
            ret = domTraverseElements.call(this, c, opt_pre, opt_post);
            if (typeof ret == 'boolean' && !ret) {
                return false;
            }
        }
    }

    if (opt_post) {
        ret = opt_post.call(null, node);
        if (typeof ret == 'boolean' && !ret) {
            return false;
        }
    }
}

let _unusedXNodes = [];

// Our W3C DOM Node implementation. Note we call it XNode because we
// can't define the identifier Node. We do this mostly for Opera,
// where we can't reuse the HTML DOM for parsing our own XML, and for
// Safari, where it is too expensive to have the template processor
// operate on native DOM nodes.
export class XNode {
    constructor(type, name, opt_value, opt_owner) {
        this.attributes = [];
        this.childNodes = [];

        this.init(type, name, opt_value, opt_owner);
    }

    init(type, name, value, owner) {
        this.nodeType = type - 0;
        this.nodeName = `${name}`;
        this.nodeValue = `${value}`;
        this.ownerDocument = owner;

        this.firstChild = null;
        this.lastChild = null;
        this.nextSibling = null;
        this.previousSibling = null;
        this.parentNode = null;
    }

    static recycle(node) {
        if (!node) {
            return;
        }

        if (node.constructor == XDocument) {
            this.recycle(node.documentElement);
            return;
        }

        if (node.constructor != this) {
            return;
        }

        _unusedXNodes.push(node);
        for (let a = 0; a < node.attributes.length; ++a) {
            this.recycle(node.attributes[a]);
        }
        for (let c = 0; c < node.childNodes.length; ++c) {
            this.recycle(node.childNodes[c]);
        }
        node.attributes.length = 0;
        node.childNodes.length = 0;
        node.init.call(0, '', '', null);
    }

    create(type, name, value, owner) {
        if (_unusedXNodes.length > 0) {
            const node = _unusedXNodes.pop();
            node.init(type, name, value, owner);
            return node;
        } else {
            return new XNode(type, name, value, owner);
        }
    }

    appendChild(node) {
        // firstChild
        if (this.childNodes.length == 0) {
            this.firstChild = node;
        }

        // previousSibling
        node.previousSibling = this.lastChild;

        // nextSibling
        node.nextSibling = null;
        if (this.lastChild) {
            this.lastChild.nextSibling = node;
        }

        // parentNode
        node.parentNode = this;

        // lastChild
        this.lastChild = node;

        // childNodes
        this.childNodes.push(node);
    }

    replaceChild(newNode, oldNode) {
        if (oldNode == newNode) {
            return;
        }

        for (let i = 0; i < this.childNodes.length; ++i) {
            if (this.childNodes[i] == oldNode) {
                this.childNodes[i] = newNode;

                let p = oldNode.parentNode;
                oldNode.parentNode = null;
                newNode.parentNode = p;

                p = oldNode.previousSibling;
                oldNode.previousSibling = null;
                newNode.previousSibling = p;
                if (newNode.previousSibling) {
                    newNode.previousSibling.nextSibling = newNode;
                }

                p = oldNode.nextSibling;
                oldNode.nextSibling = null;
                newNode.nextSibling = p;
                if (newNode.nextSibling) {
                    newNode.nextSibling.previousSibling = newNode;
                }

                if (this.firstChild == oldNode) {
                    this.firstChild = newNode;
                }

                if (this.lastChild == oldNode) {
                    this.lastChild = newNode;
                }

                break;
            }
        }
    }

    insertBefore(newNode, oldNode) {
        if (oldNode == newNode) {
            return;
        }

        if (oldNode.parentNode != this) {
            return;
        }

        if (newNode.parentNode) {
            newNode.parentNode.removeChild(newNode);
        }

        const newChildren = [];

        for (const c of this.childNodes) {
            if (c == oldNode) {
                newChildren.push(newNode);

                newNode.parentNode = this;

                newNode.previousSibling = oldNode.previousSibling;
                oldNode.previousSibling = newNode;
                if (newNode.previousSibling) {
                    newNode.previousSibling.nextSibling = newNode;
                }

                newNode.nextSibling = oldNode;

                if (this.firstChild == oldNode) {
                    this.firstChild = newNode;
                }
            }
            newChildren.push(c);
        }

        this.childNodes = newChildren;
    }

    removeChild(node) {
        const newChildren = [];

        for (const c of this.childNodes) {
            if (c != node) {
                newChildren.push(c);
            } else {
                if (c.previousSibling) {
                    c.previousSibling.nextSibling = c.nextSibling;
                }
                if (c.nextSibling) {
                    c.nextSibling.previousSibling = c.previousSibling;
                }
                if (this.firstChild == c) {
                    this.firstChild = c.nextSibling;
                }
                if (this.lastChild == c) {
                    this.lastChild = c.previousSibling;
                }
            }
        }

        this.childNodes = newChildren;
    }

    hasAttributes() {
        return this.attributes.length > 0;
    }

    setAttribute(name, value) {
        for (let i = 0; i < this.attributes.length; ++i) {
            if (this.attributes[i].nodeName == name) {
                this.attributes[i].nodeValue = `${value}`;
                return;
            }
        }
        this.attributes.push(this.create(DOM_ATTRIBUTE_NODE, name, value, this));
    }

    getAttribute(name) {
        for (let i = 0; i < this.attributes.length; ++i) {
            if (this.attributes[i].nodeName == name) {
                return this.attributes[i].nodeValue;
            }
        }
        return null;
    }

    removeAttribute(name) {
        const a = [];
        for (let i = 0; i < this.attributes.length; ++i) {
            if (this.attributes[i].nodeName != name) {
                a.push(this.attributes[i]);
            }
        }
        this.attributes = a;
    }

    getElementsByTagName(name) {
        const ret = [];
        const self = this;
        if ("*" == name) {
            domTraverseElements(this, node => {
                if (self == node) return;
                ret.push(node);
            }, null);
        } else {
            domTraverseElements(this, node => {
                if (self == node) return;
                if (node.nodeName == name) {
                    ret.push(node);
                }
            }, null);
        }
        return ret;
    }

    getElementById(id) {
        let ret = null;
        domTraverseElements(this, node => {
            if (node.getAttribute('id') == id) {
                ret = node;
                return false;
            }
        }, null);
        return ret;
    }
}

export class XDocument extends XNode {
    constructor() {
        // NOTE(mesch): According to the DOM Spec, ownerDocument of a
        // document node is null.
        super(DOM_DOCUMENT_NODE, '#document', null, null);
        this.documentElement = null;
    }

    clear() {
        this.recycle(this.documentElement);
        this.documentElement = null;
    }

    appendChild(node) {
        super.appendChild(node);
        this.documentElement = this.childNodes[0];
    }

    createElement(name) {
        return super.create(DOM_ELEMENT_NODE, name, null, this);
    }

    createDocumentFragment() {
        return super.create(DOM_DOCUMENT_FRAGMENT_NODE, '#document-fragment',
            null, this);
    }

    createTextNode(value) {
        return super.create(DOM_TEXT_NODE, '#text', value, this);
    }

    createAttribute(name) {
        return super.create(DOM_ATTRIBUTE_NODE, name, null, this);
    }

    createComment(data) {
        return super.create(DOM_COMMENT_NODE, '#comment', data, this);
    }

    createCDATASection(data) {
        return super.create(DOM_CDATA_SECTION_NODE, '#cdata-section', data, this);
    }
}

//XDocument.prototype = new XNode(DOM_DOCUMENT_NODE, '#document');
