import he from 'he';
import {
    domCreateElement,
    domSetAttribute,
    domAppendChild,
    domCreateTextNode,
    domCreateComment,
    domCreateCDATASection,
    domCreateDTDSection
} from './functions';

import { XDocument } from './xdocument';
import {
    XML10_ATTRIBUTE,
    XML10_NAME,
    XML10_VERSION_INFO,
    XML11_ATTRIBUTE,
    XML11_NAME,
    XML11_VERSION_INFO
} from './xmltoken';
import { XNode } from './xnode';

/**
 * Original author: Steffen Meschkat <mesch@google.com> (the `xmlParse` function,
 * now `xmlStrictParse`).
 *
 * An XML parse and a minimal DOM implementation that just supports
 * the subset of the W3C DOM that is used in the XSLT implementation.
 */
export class XmlParser {
    regexEmpty = /\/$/;

    XML10_TAGNAME_REGEXP = new RegExp(`^(${XML10_NAME})`);
    XML10_ATTRIBUTE_REGEXP = new RegExp(XML10_ATTRIBUTE, 'g');

    XML11_TAGNAME_REGEXP = new RegExp(`^(${XML11_NAME})`);
    XML11_ATTRIBUTE_REGEXP = new RegExp(XML11_ATTRIBUTE, 'g');

    lenientHtmlTags = ['hr', 'link', 'meta'];

    /**
     * The entry point for this parser.
     * It verifies whether the document seems to be HTML.
     * HTML is a special case if XML and it should be parsed differently.
     * @param xmlOrHtml The XML or HTML content to be parsed.
     * @returns A DOM document.
     */
    xmlParse(xmlOrHtml: string): XDocument {
        if (xmlOrHtml.toUpperCase().startsWith('<!DOCTYPE HTML')) {
            return this.htmlParse(xmlOrHtml);
        }

        return this.xmlStrictParse(xmlOrHtml);
    }

    /**
     * Given an XNode, returns an object mapping prefixes to their corresponding namespaces in its scope.
     * Default namespace is treated as if its prefix were the empty string.
     * @param node The Node.
     * @returns An object with prefixes and namespace URLs.
     */
    private namespaceMapAt(node: XNode): { [prefix: string]: string } {
        const map = {
            // reserved namespaces: https://www.w3.org/TR/REC-xml-names/#xmlReserved
            xmlns: 'http://www.w3.org/2000/xmlns/',
            xml: 'http://www.w3.org/XML/1998/namespace'
        };
        let n = node;
        while (n !== null) {
            for (let i = 0; i < n.attributes.length; i++) {
                if (n.attributes[i].nodeName.startsWith('xmlns:')) {
                    const prefix = n.attributes[i].nodeName.split(':')[1];
                    if (!(prefix in map)) map[prefix] = n.attributes[i].nodeValue;
                } else if (n.attributes[i].nodeName == 'xmlns') {
                    if (!('' in map)) map[''] = n.attributes[i].nodeValue || null;
                }
            }
            n = n.parentNode;
        }
        return map;
    }

    /**
     * HTML needs to be parsed differently because it's a special case of XML.
     * Sources:
     *
     * - https://blog.teamtreehouse.com/to-close-or-not-to-close-tags-in-html5
     * @param htmlText The HTML text
     * @returns A DOM document.
     */
    private htmlParse(htmlText: string): XDocument {
        const xmlDocument = new XDocument();
        const root = xmlDocument;
        const stack = [];

        let parent: XNode = root;
        stack.push(parent);

        let tag = false,
            quotes = false,
            doublequotes = false,
            start = 0;
        for (let i = 0; i < htmlText.length; ++i) {
            let char = htmlText.charAt(i);

            if (tag) {
                if (!doublequotes && char === "'") {
                    quotes = !quotes;
                } else if (!quotes && char === '"') {
                    doublequotes = !doublequotes;
                } else if (!quotes && !doublequotes && char === '>') {
                    let text = htmlText.slice(start, i);

                    if (text.charAt(0) === '/') { //  {
                        stack.pop();
                        parent = stack[stack.length - 1];
                    } else if (text.charAt(0) === '!') {
                        // Ignore comments
                        // console.log(`Ignored ${text}`);
                    } else {
                        const empty = text.match(this.regexEmpty);
                        const tagName = this.XML10_TAGNAME_REGEXP.exec(text)[1];
                        let node = domCreateElement(xmlDocument, tagName);

                        let attribute;
                        while ((attribute = this.XML10_ATTRIBUTE_REGEXP.exec(text))) {
                            const val = he.decode(attribute[5] || attribute[7] || '');
                            domSetAttribute(node, attribute[1], val);
                        }

                        node.siblingPosition = parent.childNodes.length;
                        domAppendChild(parent, node);

                        // The fundamental difference between this parse function
                        // and the strict XML parse is here:
                        // HTML is lenient with certain tags, that don't need to be closed.
                        if (!empty && !this.lenientHtmlTags.includes(tagName)) {
                            parent = node;
                            stack.push(node);
                        }
                    }

                    start = i + 1;
                    tag = false;
                    quotes = false;
                    doublequotes = false;
                }
            } else {
                if (char === '<') {
                    let text = htmlText.slice(start, i);
                    if (text && parent !== root) {
                        domAppendChild(parent, domCreateTextNode(xmlDocument, text));
                    }
                    if (htmlText.slice(i + 1, i + 4) === '!--') {
                        let endTagIndex = htmlText.slice(i + 4).indexOf('-->');
                        if (endTagIndex) {
                            let node = domCreateComment(xmlDocument, htmlText.slice(i + 4, i + endTagIndex + 4));
                            domAppendChild(parent, node);
                            i += endTagIndex + 6;
                        }
                    } else if (htmlText.slice(i + 1, i + 9) === '!DOCTYPE') {
                        let endTagIndex = htmlText.slice(i + 9).indexOf('>');
                        if (endTagIndex) {
                            const dtdValue = htmlText.slice(i + 9, i + endTagIndex + 9).trimStart();
                            // TODO: Not sure if this is a good solution.
                            // Trying to implement this: https://github.com/DesignLiquido/xslt-processor/issues/30
                            const node = domCreateDTDSection(xmlDocument, dtdValue);
                            domAppendChild(parent, node);
                            i += endTagIndex + dtdValue.length + 5;
                        }
                    } else {
                        tag = true;
                    }
                    start = i + 1;
                }
            }
        }

        return xmlDocument;
    }

    /**
     * Parses the given XML string with our custom, JavaScript XML parser.
     * @param xml The XML String.
     * @returns A XDocument.
     * @author Steffen Meschkat <mesch@google.com>
     */
    private xmlStrictParse(xml: string): XDocument {
        let regexTagname: RegExp;
        let regexAttribute: RegExp;
        if (xml.match(/^<\?xml/)) {
            // When an XML document begins with an XML declaration
            // VersionInfo must appear.
            if (xml.search(new RegExp(XML10_VERSION_INFO)) === 5) {
                regexTagname = this.XML10_TAGNAME_REGEXP;
                regexAttribute = this.XML10_ATTRIBUTE_REGEXP;
            } else if (xml.search(new RegExp(XML11_VERSION_INFO)) === 5) {
                regexTagname = this.XML11_TAGNAME_REGEXP;
                regexAttribute = this.XML11_ATTRIBUTE_REGEXP;
            } else {
                throw new Error('XML VersionInfo has an unknown version number.');
            }
        } else {
            // When an XML declaration is missing it's an XML 1.0 document.
            regexTagname = this.XML10_TAGNAME_REGEXP;
            regexAttribute = this.XML10_ATTRIBUTE_REGEXP;
        }

        const xmlDocument = new XDocument();
        const root = xmlDocument;
        const stack = [];

        let parent: XNode = root;
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
                if (text.charAt(0) === '/') {
                    stack.pop();
                    parent = stack[stack.length - 1];
                } else if (text.charAt(0) === '?') {
                    // Ignore XML declaration and processing instructions
                } else if (text.charAt(0) === '!') {
                    // Ignore comments
                    // console.log(`Ignored ${text}`);
                } else {
                    const empty = text.match(this.regexEmpty);
                    const tagname = regexTagname.exec(text)[1];
                    let node = domCreateElement(xmlDocument, tagname);

                    let attribute;
                    while ((attribute = regexAttribute.exec(text))) {
                        const val = he.decode(attribute[5] || attribute[7] || '');
                        domSetAttribute(node, attribute[1], val);
                    }

                    node.siblingPosition = parent.childNodes.length;
                    domAppendChild(parent, node);
                    if (!empty) {
                        parent = node;
                        stack.push(node);
                    }

                    const namespaceMap = this.namespaceMapAt(node);
                    if (node.prefix !== null) {
                        if (node.prefix in namespaceMap) node.namespaceUri = namespaceMap[node.prefix];
                        // else, prefix is undefined. do anything?
                    } else {
                        if ('' in namespaceMap) node.namespaceUri = namespaceMap[''];
                    }
                    for (let i = 0; i < node.attributes.length; ++i) {
                        if (node.attributes[i].prefix !== null) {
                            if (node.attributes[i].prefix in namespaceMap) {
                                node.attributes[i].namespaceUri = namespaceMap[node.attributes[i].prefix];
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
                if (text && parent !== root) {
                    domAppendChild(parent, domCreateTextNode(xmlDocument, text));
                }
                if (xml.slice(i + 1, i + 4) === '!--') {
                    let endTagIndex = xml.slice(i + 4).indexOf('-->');
                    if (endTagIndex) {
                        let node = domCreateComment(xmlDocument, xml.slice(i + 4, i + endTagIndex + 4));
                        domAppendChild(parent, node);
                        i += endTagIndex + 6;
                    }
                } else if (xml.slice(i + 1, i + 9) === '![CDATA[') {
                    let endTagIndex = xml.slice(i + 9).indexOf(']]>');
                    if (endTagIndex) {
                        let node = domCreateCDATASection(xmlDocument, xml.slice(i + 9, i + endTagIndex + 9));
                        domAppendChild(parent, node);
                        i += endTagIndex + 11;
                    }
                } else if (xml.slice(i + 1, i + 9) === '!DOCTYPE') { // "!DOCTYPE" can be used in a XSLT template.
                    let endTagIndex = xml.slice(i + 9).indexOf('>');
                    if (endTagIndex) {
                        const dtdValue = xml.slice(i + 9, i + endTagIndex + 9).trimStart();
                        // TODO: Not sure if this is a good solution.
                        // Trying to implement this: https://github.com/DesignLiquido/xslt-processor/issues/30
                        const node = domCreateDTDSection(xmlDocument, dtdValue);
                        domAppendChild(parent, node);
                        i += endTagIndex + dtdValue.length + 5;
                    }
                } else {
                    tag = true;
                }
                start = i + 1;
            }
        }

        return root;
    }
}
