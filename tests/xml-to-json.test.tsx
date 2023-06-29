/* eslint-disable no-useless-escape */
import assert from 'assert';

import { Xslt } from '../src/xslt';
import { xmlParse } from '../src/dom';

describe('xml-to-json', () => {
    it('xml-to-json() without namespace test', () => {
        const xmlString = `<root>
          <test name="test1" >test</test>
          <test name="test2" >123</test>
          <test name="test3">\{hugo\}</test>
          <test name="test4" /> 
          
        </root> `;

        const xsltString = `<?xml version="1.0"?>
          <xsl:stylesheet version="1.0">
            <xsl:template match="test">
              <span> <xsl:value-of select="xml-to-json(.)" /> </span>
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

        const expectedOutString = `<root><span>"test"</span><span>"123"</span><span>"{hugo}"</span><span>""</span></root>`;

        const xsltClass = new Xslt();
        const xml = xmlParse(xmlString);
        const xslt = xmlParse(xsltString);
        const outXmlString = xsltClass.xsltProcess(
          xml,
          xslt
        );

        assert.equal(outXmlString, expectedOutString);
    });
});
