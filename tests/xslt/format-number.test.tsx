import assert from 'assert';

import { Xslt } from '../../src/xslt';
import { XmlParser } from '../../src/dom';

describe('format-number', () => {
    it('applies XSLT picture formatting instead of locale formatting (issue #199)', async () => {
        const xmlString = '<root/>';

        const xsltString = `<?xml version="1.0"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:template match="/">
    <html><body>
      <xsl:value-of select='format-number(500100, "#")'/><br/>
      <xsl:value-of select='format-number(500100, "0")'/><br/>
      <xsl:value-of select='format-number(500100, "#.00")'/><br/>
      <xsl:value-of select='format-number(500100, "#.0")'/><br/>
      <xsl:value-of select='format-number(500100, "###,###.00")'/><br/>
      <xsl:value-of select='format-number(0.23456, "#%")'/>
    </body></html>
  </xsl:template>
</xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const result = await xsltClass.xsltProcess(xml, xslt);

        const normalizedResult = result.replace(/<br\s*\/?\s*>/g, '<br>');

        assert(normalizedResult.includes('500100<br>500100<br>500100.00<br>500100.0<br>500,100.00<br>23%'));
        assert(!result.includes('500.100'));
        assert(!result.includes('0,235'));
    });
});
