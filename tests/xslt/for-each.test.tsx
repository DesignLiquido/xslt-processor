import { XmlParser } from '../../src/dom';
import { Xslt } from '../../src/xslt';

import assert from 'assert';

describe('xsl:for-each', () => {
    const xmlString = (
        `<all>
            <item pos="2">A</item>
            <item pos="3">B</item>
            <item pos="1">C</item>
        </all>`
    );

    it('handles for-each sort', async () => {
        const xsltForEachSort = (
            `<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:template match="/">
                    <xsl:for-each select="//item">
                        <xsl:sort select="@pos" />
                        <xsl:value-of select="." />
                    </xsl:for-each>
                </xsl:template>
            </xsl:stylesheet>`
        );

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltForEachSort);
        const html = await xsltClass.xsltProcess(xml, xslt);
        assert.equal(html, 'CAB');
    });

    it('handles for-each sort ascending', async () => {
        const xsltForEachSortAscending = (
            `<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:template match="/">
                    <xsl:for-each select="//item">
                        <xsl:sort select="." order="ascending" />
                        <xsl:value-of select="." />
                    </xsl:for-each>
                </xsl:template>
            </xsl:stylesheet>`
        );

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltForEachSortAscending);
        const html = await xsltClass.xsltProcess(xml, xslt);
        assert.equal(html, 'ABC');
    });

    it('handles for-each sort descending', async () => {
        const xsltForEachSortDescending = (
            `<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:template match="/">
                    <xsl:for-each select="//item">
                        <xsl:sort select="." order="descending" />
                        <xsl:value-of select="." />
                    </xsl:for-each>
                </xsl:template>
            </xsl:stylesheet>`
        );

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltForEachSortDescending);
        const html = await xsltClass.xsltProcess(xml, xslt);
        assert.equal(html, 'CBA');
    });
});
