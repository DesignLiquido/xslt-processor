/* eslint-disable no-undef */
import assert from 'assert';

import { Xslt } from '../src/xslt';
import { XmlParser } from '../src/dom';

describe('Issues 160 and 161', () => {
    
    // Issue 160
    it('Issue 160: xsl:element inside for-each should use correct context node', async () => {
        const xmlString = `
        <data>
            <item id="1">Item 1</item>
            <item id="2">Item 2</item>
        </data>`;

        const xsltString = `
        <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/">
                <root>
                    <xsl:for-each select="data/item">
                        <xsl:element name="row">
                            <xsl:value-of select="."/>
                        </xsl:element>
                    </xsl:for-each>
                </root>
            </xsl:template>
        </xsl:stylesheet>`;

        const expectedOutString = `<root><row>Item 1</row><row>Item 2</row></root>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);
        const outXmlString = await xsltClass.xsltProcess(xml, xslt);
        
        // Normalize whitespace for comparison if needed, but for now exact match
        assert.equal(outXmlString.replace(/\s+/g, ''), expectedOutString.replace(/\s+/g, ''));
    });

    // Issue 161
    it('Issue 161: Mixing xsl:element and literal tags should preserve order', async () => {
        const xmlString = `
        <data>
            <item id="1">Item 1</item>
            <item id="2">Item 2</item>
        </data>`;

        const xsltString = `
        <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/">
                <root>
                    <xsl:for-each select="data/item">
                        <xsl:element name="generated">Gen <xsl:value-of select="@id"/></xsl:element>
                        <literal>Lit <xsl:value-of select="@id"/></literal>
                    </xsl:for-each>
                </root>
            </xsl:template>
        </xsl:stylesheet>`;

        // Expected: Interleaved
        const expectedOutString = `<root><generated>Gen 1</generated><literal>Lit 1</literal><generated>Gen 2</generated><literal>Lit 2</literal></root>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);
        const outXmlString = await xsltClass.xsltProcess(xml, xslt);
        
        // console.log('Issue 161 Output:', outXmlString);
        assert.equal(outXmlString.replace(/\s+/g, ''), expectedOutString.replace(/\s+/g, ''));
    });
});
