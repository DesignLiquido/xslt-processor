/* eslint-disable no-useless-escape */
import assert from 'assert';

import { Xslt } from '../../src/xslt';
import { XmlParser } from '../../src/dom';

describe('xml-to-json', () => {
    it('xml-to-json() should throw error in XSLT 1.0', async () => {
        const xmlString = `<root>
          <test name="test1">test</test>
        </root>`;

        const xsltString = `<?xml version="1.0"?>
          <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="test">
              <span><xsl:value-of select="xml-to-json(.)"/></span>
            </xsl:template>
            <xsl:template match="/">
              <xsl:apply-templates select="//test"/>
            </xsl:template>
          </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        await assert.rejects(
            async () => await xsltClass.xsltProcess(xml, xslt),
            {
                message: /xml-to-json\(\) is not supported in XSLT 1\.0/
            }
        );
    });

    it('xml-to-json() should work in XSLT 3.0', async () => {
        const xmlString = `<root>
          <test name="test1">test</test>
          <test name="test2">123</test>
          <test name="test3">\{hugo\}</test>
          <test name="test4"/>
        </root>`;

        const xsltString = `<?xml version="1.0"?>
          <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="test">
              <span><xsl:value-of select="xml-to-json(.)"/></span>
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
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);
        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        assert.equal(outXmlString, expectedOutString);
    });
});
