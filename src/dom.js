// Copyright 2018 Johannes Wilm
// Copyright 2005 Google Inc.
// All Rights Reserved
//
// Original author: Steffen Meschkat <mesch@google.com>
//
// An XML parse and a minimal DOM implementation that just supports
// the subset of the W3C DOM that is used in the XSLT implementation.
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
// Resolve entities in XML text fragments. According to the DOM
// specification, the DOM is supposed to resolve entity references at
// the API level. I.e. no entity references are passed through the
// API. See "Entities and the DOM core", p.12, DOM 2 Core
// Spec. However, different browsers actually pass very different
// values at the API. See <http://mesch.nyc/test-xml-quote>.
export function xmlResolveEntities(s) {

    const parts = s.split('&');

    let ret = parts[0];
    for (let i = 1; i < parts.length; ++i) {
        const rp = parts[i].indexOf(';');
        if (rp == -1) {
            // no entity reference: just a & but no ;
            ret += parts[i];
            continue;
        }

        const entityName = parts[i].substring(0, rp);
        const remainderText = parts[i].substring(rp + 1);

        let ch;
        switch (entityName) {
            case 'lt':
                ch = '<';
                break;
            case 'gt':
                ch = '>';
                break;
            case 'amp':
                ch = '&';
                break;
            case 'quot':
                ch = '"';
                break;
            case 'apos':
                ch = '\'';
                break;
            case 'nbsp':
                ch = String.fromCharCode(160);
                break;
            default:
                // Cool trick: let the DOM do the entity decoding. We assign
                // the entity text through non-W3C DOM properties and read it
                // through the W3C DOM. W3C DOM access is specified to resolve
                // entities.
                const span = domCreateElement(window.document, 'span');
                span.innerHTML = `&${entityName}; `;
                ch = span.childNodes[0].nodeValue.charAt(0);
        }
        ret += ch + remainderText;
    }

    return ret;
}

const XML10_TAGNAME_REGEXP = new RegExp(`^(${XML10_NAME})`);
const XML10_ATTRIBUTE_REGEXP = new RegExp(XML10_ATTRIBUTE, 'g');

const XML11_TAGNAME_REGEXP = new RegExp(`^(${XML11_NAME})`);
const XML11_ATTRIBUTE_REGEXP = new RegExp(XML11_ATTRIBUTE, 'g');

// Splits string at delimiter when not inside of quotation marks
function escapedSplit(str, delimiter) {
    let parts = [],
        quotes = false,
        doublequotes = false,
        start = 0;
    for (let i = 0; i < str.length; ++i) {
        let char = str[i];
        if (char === "'") {
            quotes = !quotes;
        } else if (char === "\"") {
            doublequotes = !doublequotes;
        } else if (char === delimiter && !quotes && !doublequotes) {
            parts.push(str.slice(start, i));
            start = i + 1;
        }
    }
    parts.push(str.slice(start, str.length))
    return parts;
}

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
            alert('VersionInfo is missing, or unknown version number.');
        }
    } else {
        // When an XML declaration is missing it's an XML 1.0 document.
        regex_tagname = XML10_TAGNAME_REGEXP;
        regex_attribute = XML10_ATTRIBUTE_REGEXP;
    }

    const xmldoc = new XDocument();
    const root = xmldoc;

    // For the record: in Safari, we would create native DOM nodes, but
    // in Opera that is not possible, because the DOM only allows HTML
    // element nodes to be created, so we have to do our own DOM nodes.

    // xmldoc = document.implementation.createDocument('','',null);
    // root = xmldoc; // .createDocumentFragment();
    // NOTE(mesch): using the DocumentFragment instead of the Document
    // crashes my Safari 1.2.4 (v125.12).
    const stack = [];

    let parent = root;
    stack.push(parent);

    // The token that delimits a section that contains markup as
    // content: CDATA or comments.
    let slurp = '';

    const x = escapedSplit(xml, '<');
    for (let i = 1; i < x.length; ++i) {
        const xx = escapedSplit(x[i], '>');
        const tag = xx[0];
        let text = xmlResolveEntities(xx[1] || '');

        if (slurp) {
            // In a "slurp" section (CDATA or comment): only check for the
            // end of the section, otherwise append the whole text.
            var end = x[i].indexOf(slurp);
            if (end != -1) {
                var data = x[i].substring(0, end);
                parent.nodeValue += `<${data}`;
                stack.pop();
                parent = stack[stack.length - 1];
                text = x[i].substring(end + slurp.length);
                slurp = '';
            } else {
                parent.nodeValue += `<${x[i]}`;
                text = null;
            }

        } else if (tag.indexOf('![CDATA[') == 0) {
            var start = '![CDATA['.length;
            var end = x[i].indexOf(']]>');
            if (end != -1) {
                var data = x[i].substring(start, end);
                var node = domCreateCDATASection(xmldoc, data);
                domAppendChild(parent, node);
            } else {
                var data = x[i].substring(start);
                text = null;
                var node = domCreateCDATASection(xmldoc, data);
                domAppendChild(parent, node);
                parent = node;
                stack.push(node);
                slurp = ']]>';
            }

        } else if (tag.indexOf('!--') == 0) {
            var start = '!--'.length;
            var end = x[i].indexOf('-->');
            if (end != -1) {
                var data = x[i].substring(start, end);
                var node = domCreateComment(xmldoc, data);
                domAppendChild(parent, node);
            } else {
                var data = x[i].substring(start);
                text = null;
                var node = domCreateComment(xmldoc, data);
                domAppendChild(parent, node);
                parent = node;
                stack.push(node);
                slurp = '-->';
            }

        } else if (tag.charAt(0) == '/') {
            stack.pop();
            parent = stack[stack.length - 1];

        } else if (tag.charAt(0) == '?') {
            // Ignore XML declaration and processing instructions
        } else if (tag.charAt(0) == '!') {
            // Ignore notation and comments
        } else {
            const empty = tag.match(regex_empty);
            const tagname = regex_tagname.exec(tag)[1];
            var node = domCreateElement(xmldoc, tagname);

            let att;
            while (att = regex_attribute.exec(tag)) {
                const val = xmlResolveEntities(att[5] || att[7] || '');
                domSetAttribute(node, att[1], val);
            }

            domAppendChild(parent, node);
            if (!empty) {
                parent = node;
                stack.push(node);
            }
        }

        if (text && parent != root) {
            domAppendChild(parent, domCreateTextNode(xmldoc, text));
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
const DOM_ENTITY_REFERENCE_NODE = 5;
const DOM_ENTITY_NODE = 6;
export const DOM_PROCESSING_INSTRUCTION_NODE = 7;
export const DOM_COMMENT_NODE = 8;
export const DOM_DOCUMENT_NODE = 9;
const DOM_DOCUMENT_TYPE_NODE = 10;
export const DOM_DOCUMENT_FRAGMENT_NODE = 11;
const DOM_NOTATION_NODE = 12;

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
        // NOTE(mesch): Acocording to the DOM Spec, ownerDocument of a
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
