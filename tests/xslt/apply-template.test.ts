import assert from 'assert';

import { Xslt } from '../../src/xslt';
import { XmlParser } from '../../src/dom';

describe('xsl:apply-template', () => {
    /**
     * Returning: '<div><h2>test1</h2><p> hello<span>replaced text</span></p></div>'
     * Expected is: '<div><h2>test1</h2><p>This is <span>replaced text</span> hello</p></div>'
     */
    it('XSLT apply-template inside text test (https://github.com/DesignLiquido/xslt-processor/issues/108)', async () => {
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
                <h2><xsl:value-of select="//test/@name" /></h2>
                <p><xsl:apply-templates select="//test/node()" /></p>
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

    it('XSLT template with text on both sides', async () => {
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

    it('https://github.com/DesignLiquido/xslt-processor/issues/110', async () => {
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

        // Note: whitespace from XSLT template indentation is preserved in text output mode
        // The space after "Authors:" comes from the XSLT template
        const expectedOutString = "\n                Article - My Article\n                Authors: \n                - Mr. Foo\n                - Mr. Bar";

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        assert.equal(outXmlString, expectedOutString);
    });

    // Issue #202: select="/" and select="/*" in xsl:variable must produce equivalent output
    // when the variable is used as root of apply-templates path
    it('variable select="/*" with apply-templates produces HTML output (issue #202)', async () => {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<obj>
  <entity>
    <description>Value</description>
    <value>4</value>
  </entity>
</obj>`;

        const xslt = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:variable name="ROOT" select="/*" />
  <xsl:template match="/">
    <html><body>
      <xsl:apply-templates select="$ROOT/entity" />
    </body></html>
  </xsl:template>
  <xsl:template match="entity">
    <div style="color: green">
      <span>Value </span>
      <span><xsl:value-of select="value" /></span>
    </div>
  </xsl:template>
</xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xmlDoc = xmlParser.xmlParse(xml);
        const xsltDoc = xmlParser.xmlParse(xslt);
        const html = await xsltClass.xsltProcess(xmlDoc, xsltDoc);
        assert.equal(html, '<html><body><div style="color: green"><span>Value </span><span>4</span></div></body></html>');
    });

    it('variable select="/" with apply-templates produces same HTML output as select="/*" (issue #202)', async () => {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<obj>
  <entity>
    <description>Value</description>
    <value>4</value>
  </entity>
</obj>`;

        const xslt = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:variable name="ROOT" select="/" />
  <xsl:template match="/">
    <html><body>
      <xsl:apply-templates select="$ROOT/obj/entity" />
    </body></html>
  </xsl:template>
  <xsl:template match="entity">
    <div style="color: green">
      <span>Value </span>
      <span><xsl:value-of select="value" /></span>
    </div>
  </xsl:template>
</xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xmlDoc = xmlParser.xmlParse(xml);
        const xsltDoc = xmlParser.xmlParse(xslt);
        const html = await xsltClass.xsltProcess(xmlDoc, xsltDoc);
        assert.equal(html, '<html><body><div style="color: green"><span>Value </span><span>4</span></div></body></html>');
    });

    // Reporter uses same $ROOT path for both cases — the real difference:
    // select="/*" → $ROOT is root element <obj>, so $ROOT/entity works
    // select="/"  → $ROOT is document node, so $ROOT/entity finds nothing (needs $ROOT/obj/entity)
    // This test verifies the reporter's exact scenario with select="/" and the WRONG path,
    // confirming it IS a user-error (XPath semantics), not a processor bug.
    it('variable select="/" with apply-templates using wrong path produces empty body (issue #202 - expected behavior)', async () => {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<obj>
  <entity>
    <description>Value</description>
    <value>4</value>
  </entity>
</obj>`;

        const xslt = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:variable name="ROOT" select="/" />
  <xsl:template match="/">
    <html><body>
      <xsl:apply-templates select="$ROOT/entity" />
    </body></html>
  </xsl:template>
  <xsl:template match="entity">
    <div style="color: green">
      <span>Value </span>
      <span><xsl:value-of select="value" /></span>
    </div>
  </xsl:template>
</xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xmlDoc = xmlParser.xmlParse(xml);
        const xsltDoc = xmlParser.xmlParse(xslt);
        const html = await xsltClass.xsltProcess(xmlDoc, xsltDoc);
        // $ROOT/entity from document node finds nothing — empty body is correct XPath behavior
        assert.equal(html, '<html><body/></html>');
    });
});
