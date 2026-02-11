/**
 * @jest-environment jsdom
 */
// Copyright 2026 Design Liquido
// All Rights Reserved

import assert from 'assert';

import { domDocumentToXDocument } from '../src/dom/dom-to-xdocument';
import { XmlParser, xmlTransformedText } from '../src/dom';
import { Xslt } from '../src/xslt';
import {
    DOM_ATTRIBUTE_NODE,
    DOM_CDATA_SECTION_NODE,
    DOM_COMMENT_NODE,
    DOM_ELEMENT_NODE,
    DOM_PROCESSING_INSTRUCTION_NODE,
    DOM_TEXT_NODE
} from '../src/constants';

describe('domDocumentToXDocument', () => {
    it('should convert a simple element with text content', () => {
        const parser = new DOMParser();
        const nativeDoc = parser.parseFromString('<root>hello</root>', 'text/xml');
        const xDoc = domDocumentToXDocument(nativeDoc);

        assert.equal(xDoc.documentElement.nodeName, 'root');
        assert.equal(xDoc.documentElement.nodeType, DOM_ELEMENT_NODE);

        const textNodes = xDoc.documentElement.childNodes.filter(n => n.nodeType === DOM_TEXT_NODE);
        assert.equal(textNodes.length, 1);
        assert.equal(textNodes[0].nodeValue, 'hello');
    });

    it('should convert attributes from NamedNodeMap to child XNodes', () => {
        const parser = new DOMParser();
        const nativeDoc = parser.parseFromString('<root attr1="value1" attr2="value2" />', 'text/xml');
        const xDoc = domDocumentToXDocument(nativeDoc);

        const attrs = xDoc.documentElement.childNodes.filter(n => n.nodeType === DOM_ATTRIBUTE_NODE);
        assert.equal(attrs.length, 2);

        const attr1 = attrs.find(a => a.nodeName === 'attr1');
        const attr2 = attrs.find(a => a.nodeName === 'attr2');
        assert.equal(attr1.nodeValue, 'value1');
        assert.equal(attr2.nodeValue, 'value2');
    });

    it('should handle namespaced elements', () => {
        const parser = new DOMParser();
        const nativeDoc = parser.parseFromString(
            '<ns:root xmlns:ns="http://example.com"><ns:child>text</ns:child></ns:root>',
            'text/xml'
        );
        const xDoc = domDocumentToXDocument(nativeDoc);

        assert.equal(xDoc.documentElement.nodeName, 'ns:root');
        assert.equal(xDoc.documentElement.prefix, 'ns');
        assert.equal(xDoc.documentElement.localName, 'root');
        assert.equal(xDoc.documentElement.namespaceUri, 'http://example.com');
    });

    it('should handle namespaced attributes', () => {
        const parser = new DOMParser();
        const nativeDoc = parser.parseFromString(
            '<root xmlns:custom="http://custom.com" custom:attr="val" />',
            'text/xml'
        );
        const xDoc = domDocumentToXDocument(nativeDoc);

        const attrs = xDoc.documentElement.childNodes.filter(n => n.nodeType === DOM_ATTRIBUTE_NODE);
        const customAttr = attrs.find(a => a.localName === 'attr');
        assert.ok(customAttr, 'Should find the custom:attr attribute');
        assert.equal(customAttr.prefix, 'custom');
        assert.equal(customAttr.namespaceUri, 'http://custom.com');
        assert.equal(customAttr.nodeValue, 'val');
    });

    it('should handle comments', () => {
        const parser = new DOMParser();
        const nativeDoc = parser.parseFromString('<root><!-- a comment --></root>', 'text/xml');
        const xDoc = domDocumentToXDocument(nativeDoc);

        const comments = xDoc.documentElement.childNodes.filter(n => n.nodeType === DOM_COMMENT_NODE);
        assert.equal(comments.length, 1);
        assert.equal(comments[0].nodeValue, ' a comment ');
    });

    it('should handle processing instructions', () => {
        const parser = new DOMParser();
        const nativeDoc = parser.parseFromString(
            '<root><?my-pi some data?></root>',
            'text/xml'
        );
        const xDoc = domDocumentToXDocument(nativeDoc);

        const pis = xDoc.documentElement.childNodes.filter(
            n => n.nodeType === DOM_PROCESSING_INSTRUCTION_NODE
        );
        assert.equal(pis.length, 1);
        assert.equal(pis[0].nodeName, 'my-pi');
        assert.equal(pis[0].nodeValue, 'some data');
    });

    it('should handle deeply nested structures', () => {
        const parser = new DOMParser();
        const nativeDoc = parser.parseFromString(
            '<a><b><c><d>deep</d></c></b></a>',
            'text/xml'
        );
        const xDoc = domDocumentToXDocument(nativeDoc);

        const a = xDoc.documentElement;
        assert.equal(a.nodeName, 'a');
        const b = a.childNodes.find(n => n.nodeType === DOM_ELEMENT_NODE);
        assert.equal(b.nodeName, 'b');
        const c = b.childNodes.find(n => n.nodeType === DOM_ELEMENT_NODE);
        assert.equal(c.nodeName, 'c');
        const d = c.childNodes.find(n => n.nodeType === DOM_ELEMENT_NODE);
        assert.equal(d.nodeName, 'd');
        const textNodes = d.childNodes.filter(n => n.nodeType === DOM_TEXT_NODE);
        assert.equal(textNodes[0].nodeValue, 'deep');
    });

    it('should set siblingPosition correctly', () => {
        const parser = new DOMParser();
        const nativeDoc = parser.parseFromString(
            '<root><a/><b/><c/></root>',
            'text/xml'
        );
        const xDoc = domDocumentToXDocument(nativeDoc);

        const children = xDoc.documentElement.childNodes.filter(n => n.nodeType === DOM_ELEMENT_NODE);
        assert.equal(children.length, 3);
        // Each child should have an incremented siblingPosition
        for (let i = 0; i < children.length; i++) {
            assert.ok(children[i].siblingPosition >= 0, `Child ${i} should have non-negative siblingPosition`);
        }
    });

    it('should set parentNode on child nodes', () => {
        const parser = new DOMParser();
        const nativeDoc = parser.parseFromString('<root><child/></root>', 'text/xml');
        const xDoc = domDocumentToXDocument(nativeDoc);

        const child = xDoc.documentElement.childNodes.find(n => n.nodeType === DOM_ELEMENT_NODE);
        assert.equal(child.parentNode, xDoc.documentElement);
    });

    it('should set parentNode on attribute nodes', () => {
        const parser = new DOMParser();
        const nativeDoc = parser.parseFromString('<root attr="val"/>', 'text/xml');
        const xDoc = domDocumentToXDocument(nativeDoc);

        const attr = xDoc.documentElement.childNodes.find(n => n.nodeType === DOM_ATTRIBUTE_NODE);
        assert.equal(attr.parentNode, xDoc.documentElement);
    });

    it('should wrap a non-document node in an XDocument', () => {
        const parser = new DOMParser();
        const nativeDoc = parser.parseFromString('<root><child>text</child></root>', 'text/xml');
        const childElement = nativeDoc.documentElement.firstChild;

        const xDoc = domDocumentToXDocument(childElement);
        assert.equal(xDoc.documentElement.nodeName, 'child');
    });

    it('should produce output equivalent to XmlParser for simple XML', () => {
        const xmlString = '<page><request><q id="q">new york</q></request><location lat="100" lon="200"/></page>';

        // Parse with XmlParser
        const xmlParser = new XmlParser();
        const xDocFromParser = xmlParser.xmlParse(xmlString);

        // Parse with DOMParser + converter
        const parser = new DOMParser();
        const nativeDoc = parser.parseFromString(xmlString, 'text/xml');
        const xDocFromConverter = domDocumentToXDocument(nativeDoc);

        // Serialize both and compare
        const opts = { cData: false, escape: true, selfClosingTags: true, outputMethod: 'xml' as const };
        const textFromParser = xmlTransformedText(xDocFromParser, opts);
        const textFromConverter = xmlTransformedText(xDocFromConverter, opts);

        assert.equal(textFromConverter, textFromParser);
    });

    it('should work as input for XSLT processing', async () => {
        const xmlString = '<root><item>hello</item></root>';
        const xsltString =
            '<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">' +
            '  <xsl:template match="/">' +
            '    <output><xsl:value-of select="/root/item"/></output>' +
            '  </xsl:template>' +
            '</xsl:stylesheet>';

        // Parse XML with DOMParser + converter
        const parser = new DOMParser();
        const nativeDoc = parser.parseFromString(xmlString, 'text/xml');
        const xmlDoc = domDocumentToXDocument(nativeDoc);

        // Parse stylesheet with XmlParser (stylesheets are typically static strings)
        const xmlParser = new XmlParser();
        const stylesheet = xmlParser.xmlParse(xsltString);

        const xslt = new Xslt();
        const result = await xslt.xsltProcess(xmlDoc, stylesheet);

        assert.equal(result, '<output>hello</output>');
    });
});
