// Copyright 2026 Design Liquido
// All Rights Reserved

import assert from 'assert';

import { Xslt } from '../../src/xslt';
import { XmlParser, XDocument, xmlTransformedText } from '../../src/dom';
import { DOM_ELEMENT_NODE, DOM_TEXT_NODE, DOM_DOCUMENT_NODE } from '../../src/constants';

describe('Xslt.xsltProcessToDocument', () => {
    let xmlParser: XmlParser;

    beforeAll(() => {
        xmlParser = new XmlParser();
    });

    it('should return an XDocument instance', async () => {
        const xml = xmlParser.xmlParse('<root><item>hello</item></root>');
        const xslt = xmlParser.xmlParse(
            '<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">' +
            '  <xsl:template match="/">' +
            '    <output><xsl:value-of select="/root/item"/></output>' +
            '  </xsl:template>' +
            '</xsl:stylesheet>'
        );

        const xsltClass = new Xslt();
        const result = await xsltClass.xsltProcessToDocument(xml, xslt);

        assert.equal(result.nodeType, DOM_DOCUMENT_NODE);
        assert.ok(result instanceof XDocument);
        assert.ok(result.documentElement);
        assert.equal(result.documentElement.nodeName, 'output');
    });

    it('should produce the same tree that xsltProcess serializes', async () => {
        const xmlString = '<root><test name="test1"/><test name="test2"/></root>';
        const xsltString =
            '<?xml version="1.0"?>' +
            '<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">' +
            '  <xsl:template match="test">' +
            '    <span><xsl:value-of select="@name"/></span>' +
            '  </xsl:template>' +
            '  <xsl:template match="/">' +
            '    <div><xsl:apply-templates select="//test"/></div>' +
            '  </xsl:template>' +
            '</xsl:stylesheet>';

        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        // Get string output
        const xsltClass1 = new Xslt();
        const stringResult = await xsltClass1.xsltProcess(xml, xslt);

        // Get document output and serialize it
        const xsltClass2 = new Xslt();
        const docResult = await xsltClass2.xsltProcessToDocument(xml, xslt);
        const serialized = xmlTransformedText(docResult, {
            cData: false,
            escape: true,
            selfClosingTags: true,
            outputMethod: 'xml'
        });

        assert.equal(serialized, stringResult);
    });

    it('should allow traversing the output tree', async () => {
        const xml = xmlParser.xmlParse('<data><name>Alice</name><age>30</age></data>');
        const xslt = xmlParser.xmlParse(
            '<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">' +
            '  <xsl:template match="/">' +
            '    <result>' +
            '      <person><xsl:value-of select="/data/name"/></person>' +
            '      <years><xsl:value-of select="/data/age"/></years>' +
            '    </result>' +
            '  </xsl:template>' +
            '</xsl:stylesheet>'
        );

        const xsltClass = new Xslt();
        const result = await xsltClass.xsltProcessToDocument(xml, xslt);

        const resultElement = result.documentElement;
        assert.equal(resultElement.nodeName, 'result');

        const children = resultElement.childNodes.filter(n => n.nodeType === DOM_ELEMENT_NODE);
        assert.equal(children.length, 2);
        assert.equal(children[0].nodeName, 'person');
        assert.equal(children[1].nodeName, 'years');

        const personText = children[0].childNodes.filter(n => n.nodeType === DOM_TEXT_NODE);
        assert.equal(personText[0].nodeValue, 'Alice');

        const yearsText = children[1].childNodes.filter(n => n.nodeType === DOM_TEXT_NODE);
        assert.equal(yearsText[0].nodeValue, '30');
    });

    it('should work with parameters', async () => {
        const xml = xmlParser.xmlParse('<root/>');
        const xslt = xmlParser.xmlParse(
            '<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">' +
            '  <xsl:param name="greeting"/>' +
            '  <xsl:template match="/">' +
            '    <output><xsl:value-of select="$greeting"/></output>' +
            '  </xsl:template>' +
            '</xsl:stylesheet>'
        );

        const xsltClass = new Xslt({ parameters: [{ name: 'greeting', value: 'Hello World' }] });
        const result = await xsltClass.xsltProcessToDocument(xml, xslt);

        assert.equal(result.documentElement.nodeName, 'output');
        const textNodes = result.documentElement.childNodes.filter(n => n.nodeType === DOM_TEXT_NODE);
        assert.equal(textNodes[0].nodeValue, 'Hello World');
    });

    it('should work with identity transform', async () => {
        const xmlString = '<root><a attr="1">text</a><b/></root>';
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(
            '<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">' +
            '  <xsl:template match="@*|node()">' +
            '    <xsl:copy>' +
            '      <xsl:apply-templates select="@*|node()"/>' +
            '    </xsl:copy>' +
            '  </xsl:template>' +
            '</xsl:stylesheet>'
        );

        const xsltClass = new Xslt();
        const result = await xsltClass.xsltProcessToDocument(xml, xslt);

        assert.ok(result.documentElement);
        assert.equal(result.documentElement.nodeName, 'root');

        // Serialize and verify
        const serialized = xmlTransformedText(result, {
            cData: false,
            escape: true,
            selfClosingTags: true,
            outputMethod: 'xml'
        });
        assert.equal(serialized, xmlString);
    });
});
