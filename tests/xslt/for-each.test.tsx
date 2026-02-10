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

    it('handles numeric sort with data-type="number"', async () => {
        const xmlStringNumeric = `<all>
            <item value="10">A</item>
            <item value="2">B</item>
            <item value="100">C</item>
            <item value="20">D</item>
        </all>`;

        const xsltNumericSort = `<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/">
                <xsl:for-each select="//item">
                    <xsl:sort select="@value" data-type="number" order="ascending"/>
                    <xsl:value-of select="."/>
                </xsl:for-each>
            </xsl:template>
        </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlStringNumeric);
        const xslt = xmlParser.xmlParse(xsltNumericSort);
        const html = await xsltClass.xsltProcess(xml, xslt);
        // Numeric sort: 2, 10, 20, 100 (not text sort: 10, 100, 2, 20)
        assert.equal(html, 'BADC');
    });

    it('handles text sort vs numeric sort (data-type="text")', async () => {
        const xmlStringTextSort = `<all>
            <item value="10">A</item>
            <item value="2">B</item>
            <item value="100">C</item>
            <item value="20">D</item>
        </all>`;

        const xsltTextSort = `<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/">
                <xsl:for-each select="//item">
                    <xsl:sort select="@value" data-type="text" order="ascending"/>
                    <xsl:value-of select="."/>
                </xsl:for-each>
            </xsl:template>
        </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlStringTextSort);
        const xslt = xmlParser.xmlParse(xsltTextSort);
        const html = await xsltClass.xsltProcess(xml, xslt);
        // Text sort: 10, 100, 2, 20 (lexicographic)
        assert.equal(html, 'ACBD');
    });

    it('stable sort maintains document order for equal keys', async () => {
        const xmlStringSortStable = `<all>
            <item priority="1">A</item>
            <item priority="2">B</item>
            <item priority="1">C</item>
            <item priority="2">D</item>
            <item priority="1">E</item>
        </all>`;

        const xsltStableSort = `<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/">
                <xsl:for-each select="//item">
                    <xsl:sort select="@priority" data-type="number"/>
                    <xsl:value-of select="."/>
                </xsl:for-each>
            </xsl:template>
        </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlStringSortStable);
        const xslt = xmlParser.xmlParse(xsltStableSort);
        const html = await xsltClass.xsltProcess(xml, xslt);
        // Stable sort: items with priority 1 in original order (A, C, E), then priority 2 (B, D)
        assert.equal(html, 'ACEBD');
    });

    it('multiple sort keys applied in order', async () => {
        const xmlStringMultiSort = `<all>
            <item primary="2" secondary="b">A</item>
            <item primary="1" secondary="a">B</item>
            <item primary="2" secondary="a">C</item>
            <item primary="1" secondary="b">D</item>
        </all>`;

        const xsltMultiSort = `<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/">
                <xsl:for-each select="//item">
                    <xsl:sort select="@primary" data-type="number" order="ascending"/>
                    <xsl:sort select="@secondary" data-type="text" order="ascending"/>
                    <xsl:value-of select="."/>
                </xsl:for-each>
            </xsl:template>
        </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlStringMultiSort);
        const xslt = xmlParser.xmlParse(xsltMultiSort);
        const html = await xsltClass.xsltProcess(xml, xslt);
        // Primary sort by primary (1, 1, 2, 2), then by secondary: (1,a), (1,b), (2,a), (2,b) = B, D, C, A
        assert.equal(html, 'BDCA');
    });
