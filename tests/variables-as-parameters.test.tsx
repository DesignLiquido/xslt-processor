import assert from 'assert';

import { Xslt } from '../src/xslt';
import { XmlParser } from '../src/dom';

describe('variables-as-parameters', () => {
    it('variables-as-parameters 1', async () => {
        const xmlString = `<root>
          <test name="test1"/>    
        </root> `;

        const xsltString = `<?xml version="1.0"?>
          <xsl:stylesheet version="1.0">
            <xsl:template match="test">
              <span> <xsl:value-of select="$test" /> </span>
            </xsl:template>
            <xsl:template match="root">
              <xsl:element name="{local-name()}">
                <xsl:apply-templates select="test"/>
              </xsl:element>
            </xsl:template>
            <xsl:template match="/">
              <xsl:apply-templates select="root"/>
            </xsl:template>
          </xsl:stylesheet>`;

        const expectedOutString = `<root><span>hugo</span></root>`;

        const xsltClass = new Xslt({ parameters: [
          { name: 'test', value: 'hugo' }
        ] });
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);
        const outXmlString = await xsltClass.xsltProcess(
          xml,
          xslt,
        );

        assert.equal(outXmlString, expectedOutString);
    });
});
