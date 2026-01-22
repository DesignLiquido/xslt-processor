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
});
