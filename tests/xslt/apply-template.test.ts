import assert from 'assert';

import { Xslt } from '../../src/xslt';
import { XmlParser } from '../../src/dom';

describe('xsl:apply-template', () => {
    /**
     * Returning: '<div><h2>test1</h2><p> hello<span>replaced text</span></p></div>'
     * Expected is: '<div><h2>test1</h2><p>This is <span>replaced text</span> hello</p></div>'
     */
    it.skip('XSLT apply-template inside text test (https://github.com/DesignLiquido/xslt-processor/issues/108)', async () => {
        const xmlString = `<root>
          <test name="test1">This is <repl>text</repl> hello</test>
        </root>`;

        const xsltString = `<?xml version="1.0"?>
          <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:xs="http://www.w3.org/2001/XMLSchema" version="1.0">
            <xsl:template match="repl">
              <span>replaced <xsl:value-of select="." /></span>
            </xsl:template>
            <xsl:template match="/">
              <div>
                <h2><xsl:value-of select="test/@name" /></h2>
                <p><xsl:apply-templates select="test/node()" /></p>
              </div>
            </xsl:template>
          </xsl:stylesheet>`;

        const expectedOutString = `<div><h2>test1</h2><p>This is <span>replaced text</span> hello</p></div>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        assert.equal(outXmlString, expectedOutString);
        // assert.ok(outXmlString);
    });

    it.skip('XSLT template with text on both sides', async () => {
        const xmlString = `<root>
            <test name="test1">This text lost</test>
        </root>`;

        const xsltString = `<?xml version="1.0"?>
        <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
          <xsl:template match="/">
            <span>X<xsl:value-of select="//test/@name" />Y</span>
          </xsl:template>
        </xsl:stylesheet>`;

        const expectedOutString = `<span>Xtest1Y</span>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        assert.equal(outXmlString, expectedOutString);
    });

    it.skip('https://github.com/DesignLiquido/xslt-processor/issues/110', async () => {
        const xmlString = `<?xml version="1.0"?>
        <?xml-stylesheet type="text/xsl" href="example.xsl"?>
            <Article>
            <Title>My Article</Title>
            <Authors>
                <Author>Mr. Foo</Author>
                <Author>Mr. Bar</Author>
            </Authors>
            <Body>This is my article text.</Body>
        </Article>`;

        const xsltString = `<?xml version="1.0"?>
        <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

            <xsl:output method="text"/>

            <xsl:template match="/">
                Article - <xsl:value-of select="/Article/Title"/>
                Authors: <xsl:apply-templates select="/Article/Authors/Author"/>
            </xsl:template>

            <xsl:template match="Author">
                - <xsl:value-of select="." />
            </xsl:template>

        </xsl:stylesheet>`;

        const expectedOutString = `Article - My Article\nAuthors:\n- Mr. Foo\n- Mr. Bar`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        assert.equal(outXmlString, expectedOutString);
    });
});
