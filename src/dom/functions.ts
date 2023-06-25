// Copyright 2023 Design Liquido
// Copyright 2018 Johannes Wilm
// Copyright 2005 Google Inc.
// All Rights Reserved
//
// Original author: Steffen Meschkat <mesch@google.com>
//
// An XML parse and a minimal DOM implementation that just supports
// the subset of the W3C DOM that is used in the XSLT implementation.
import he from 'he';

import { DOM_ELEMENT_NODE } from "../constants";

import {
    domSetAttribute,
    domAppendChild,
    domCreateTextNode,
    domCreateElement,
    domCreateCDATASection,
    domCreateComment,
    namespaceMapAt
} from './util';
import { XDocument } from "./xdocument";
import {
    XML10_VERSION_INFO,
    XML10_NAME,
    XML10_ATTRIBUTE,
    XML11_VERSION_INFO,
    XML11_NAME,
    XML11_ATTRIBUTE
} from './xmltoken';

const XML10_TAGNAME_REGEXP = new RegExp(`^(${XML10_NAME})`);
const XML10_ATTRIBUTE_REGEXP = new RegExp(XML10_ATTRIBUTE, 'g');

const XML11_TAGNAME_REGEXP = new RegExp(`^(${XML11_NAME})`);
const XML11_ATTRIBUTE_REGEXP = new RegExp(XML11_ATTRIBUTE, 'g');

// Traverses the element nodes in the DOM section underneath the given
// node and invokes the given callbacks as methods on every element
// node encountered. Function opt_pre is invoked before a node's
// children are traversed; opt_post is invoked after they are
// traversed. Traversal will not be continued if a callback function
// returns boolean false. NOTE(mesch): copied from
// <//google3/maps/webmaps/javascript/dom.js>.
export function domTraverseElements(node: any, opt_pre: any, opt_post: any) {
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

// Parses the given XML string with our custom, JavaScript XML parser. Written
// by Steffen Meschkat (mesch@google.com).
export function xmlParse(xml: any) {
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
            throw 'VersionInfo is missing, or unknown version number.';
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
        } else if (tag && !quotes && char === '"') {
            doublequotes = !doublequotes;
        } else if (tag && char === '>' && !quotes && !doublequotes) {
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

                const namespaceMap = namespaceMapAt(node);
                if (node.prefix !== null) {
                    if (node.prefix in namespaceMap) node.namespaceURI = namespaceMap[node.prefix];
                    // else, prefix is undefined. do anything?
                } else {
                    if ('' in namespaceMap) node.namespaceURI = namespaceMap[''];
                }
                for (let i = 0; i < node.attributes.length; ++i) {
                    if (node.attributes[i].prefix !== null) {
                        if (node.attributes[i].prefix in namespaceMap) {
                            node.attributes[i].namespaceURI = namespaceMap[node.attributes[i].prefix];
                        }
                        // else, prefix undefined.
                    }
                    // elements with no prefix always have no namespace, so do nothing here.
                }
            }
            start = i + 1;
            tag = false;
            quotes = false;
            doublequotes = false;
        } else if (!tag && char === '<') {
            let text = xml.slice(start, i);
            if (text && parent != root) {
                domAppendChild(parent, domCreateTextNode(xmldoc, text));
            }
            if (xml.slice(i + 1, i + 4) === '!--') {
                let endTagIndex = xml.slice(i + 4).indexOf('-->');
                if (endTagIndex) {
                    let node = domCreateComment(xmldoc, xml.slice(i + 4, i + endTagIndex + 4));
                    domAppendChild(parent, node);
                    i += endTagIndex + 6;
                }
            } else if (xml.slice(i + 1, i + 9) === '![CDATA[') {
                let endTagIndex = xml.slice(i + 9).indexOf(']]>');
                if (endTagIndex) {
                    let node = domCreateCDATASection(xmldoc, xml.slice(i + 9, i + endTagIndex + 9));
                    domAppendChild(parent, node);
                    i += endTagIndex + 11;
                }
            } else {
                tag = true;
            }
            start = i + 1;
        }
    }

    return root;
}

//XDocument.prototype = new XNode(DOM_DOCUMENT_NODE, '#document');