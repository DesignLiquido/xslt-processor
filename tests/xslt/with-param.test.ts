import assert from 'assert';

import { XmlParser } from "../../src/dom";
import { Xslt } from "../../src/xslt";

describe('xsl:with-param and apply-templates', () => {
    it('passes parameters from xsl:with-param to templates (issue 120)', async () => {
        const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
<catalog status="WIP"> 
  <book>
    <title>Learning XML</title>
    <author>John Doe</author>
  </book>
  <book>
    <title>Mastering XSLT</title>
    <author>Jane Smith</author>
  </book>
</catalog>`;

        const xsltString = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" 
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

  <xsl:template match="/">
    <html>
      <head>
        <title>Book Catalog</title>
      </head>
      <body>
        <h1>Book Catalog</h1>
        <xsl:apply-templates/>
      </body>
    </html>
  </xsl:template>

  <xsl:template match="catalog">
     <ul>
        <xsl:apply-templates select="book">
          <xsl:with-param name="prefix" select="@status"/>
         </xsl:apply-templates>
      </ul>
  </xsl:template>

  <xsl:template match="book">
    <xsl:param name="prefix" />
    <li>
      <strong>
        <xsl:value-of select="$prefix"/> - <xsl:value-of select="title"/>
      </strong>
      <br/>
      <span>by <xsl:value-of select="author"/></span>
    </li>
  </xsl:template>

</xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        // The bug reported that the passed parameter was empty. Verify the
        // transformed output contains the expected prefix values.
        assert.ok(outXmlString.indexOf('WIP - Learning XML') !== -1, 'Expected prefix in first item');
        assert.ok(outXmlString.indexOf('WIP - Mastering XSLT') !== -1, 'Expected prefix in second item');
    });

    it('evaluates xsl:param defaults per invocation (issue 176)', async () => {
        const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
<div>
  <button width="100%"/>
  <button width="80"/>
</div>`;

        const xsltString = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
  <xsl:template match="div">
    <div><xsl:apply-templates/></div>
  </xsl:template>

  <xsl:template match="button">
    <button>
      <xsl:attribute name="style">width:<xsl:call-template name="widthUnit"/>;</xsl:attribute>
      <xsl:text>OK</xsl:text>
    </button>
  </xsl:template>

  <xsl:template name="widthUnit">
    <xsl:param name="width" select="@width"/>
    <xsl:choose>
      <xsl:when test="contains($width, '%') or contains($width, 'px')"><xsl:value-of select="$width"/></xsl:when>
      <xsl:otherwise><xsl:value-of select="$width"/>px</xsl:otherwise>
    </xsl:choose>
  </xsl:template>
</xsl:stylesheet>`;

        const expectedOutString = `<div><button style="width:100%;">OK</button><button style="width:80px;">OK</button></div>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        assert.equal(outXmlString, expectedOutString);
    });

    it('supports nested call-template param shadowing', async () => {
        const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
<root><item value="A"/></root>`;

        const xsltString = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
  <xsl:template match="/">
    <xsl:call-template name="outer">
      <xsl:with-param name="val" select="'outer'"/>
    </xsl:call-template>
  </xsl:template>

  <xsl:template name="outer">
    <xsl:param name="val"/>
    <xsl:call-template name="inner">
      <xsl:with-param name="val" select="'inner'"/>
    </xsl:call-template>
    <xsl:text>|</xsl:text>
    <xsl:value-of select="$val"/>
  </xsl:template>

  <xsl:template name="inner">
    <xsl:param name="val"/>
    <xsl:value-of select="$val"/>
  </xsl:template>
</xsl:stylesheet>`;

        const expectedOutString = `inner|outer`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        assert.equal(outXmlString, expectedOutString);
    });
});
