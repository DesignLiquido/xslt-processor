import { Xslt, XmlParser } from '../../src/index';

describe('XPath arithmetic operations', () => {
    let xslt: Xslt;
    let xmlParser: XmlParser;

    beforeEach(() => {
        xslt = new Xslt();
        xmlParser = new XmlParser();
    });

    it('addition: number + 1 returns 2', async () => {
        const xml = xmlParser.xmlParse('<page><number>1</number></page>');
        const stylesheet = xmlParser.xmlParse(`<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:template match="page">
        <result><xsl:value-of select="number + 1"/></result>
    </xsl:template>
</xsl:stylesheet>`);
        const result = await xslt.xsltProcess(xml, stylesheet);
        expect(result).toBe('<result>2</result>');
    });

    it('subtraction: number - 1 returns 0', async () => {
        const xml = xmlParser.xmlParse('<page><number>1</number></page>');
        const stylesheet = xmlParser.xmlParse(`<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:template match="page">
        <result><xsl:value-of select="number - 1"/></result>
    </xsl:template>
</xsl:stylesheet>`);
        const result = await xslt.xsltProcess(xml, stylesheet);
        expect(result).toBe('<result>0</result>');
    });

    it('multiplication: number * 2 returns 2', async () => {
        const xml = xmlParser.xmlParse('<page><number>1</number></page>');
        const stylesheet = xmlParser.xmlParse(`<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:template match="page">
        <result><xsl:value-of select="number * 2"/></result>
    </xsl:template>
</xsl:stylesheet>`);
        const result = await xslt.xsltProcess(xml, stylesheet);
        expect(result).toBe('<result>2</result>');
    });

    it('division: number div 2 returns 5', async () => {
        const xml = xmlParser.xmlParse('<page><number>10</number></page>');
        const stylesheet = xmlParser.xmlParse(`<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:template match="page">
        <result><xsl:value-of select="number div 2"/></result>
    </xsl:template>
</xsl:stylesheet>`);
        const result = await xslt.xsltProcess(xml, stylesheet);
        expect(result).toBe('<result>5</result>');
    });

    it('modulo: number mod 3 returns 1', async () => {
        const xml = xmlParser.xmlParse('<page><number>10</number></page>');
        const stylesheet = xmlParser.xmlParse(`<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:template match="page">
        <result><xsl:value-of select="number mod 3"/></result>
    </xsl:template>
</xsl:stylesheet>`);
        const result = await xslt.xsltProcess(xml, stylesheet);
        expect(result).toBe('<result>1</result>');
    });

    it('node + node: first + second returns correct sum', async () => {
        const xml = xmlParser.xmlParse('<page><first>3</first><second>4</second></page>');
        const stylesheet = xmlParser.xmlParse(`<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:template match="page">
        <result><xsl:value-of select="first + second"/></result>
    </xsl:template>
</xsl:stylesheet>`);
        const result = await xslt.xsltProcess(xml, stylesheet);
        expect(result).toBe('<result>7</result>');
    });

    it('decimal node: price * 2 returns 7', async () => {
        const xml = xmlParser.xmlParse('<page><price>3.5</price></page>');
        const stylesheet = xmlParser.xmlParse(`<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:template match="page">
        <result><xsl:value-of select="price * 2"/></result>
    </xsl:template>
</xsl:stylesheet>`);
        const result = await xslt.xsltProcess(xml, stylesheet);
        expect(result).toBe('<result>7</result>');
    });

    it('attribute node: @value + 1 returns 6', async () => {
        const xml = xmlParser.xmlParse('<page><item value="5"/></page>');
        const stylesheet = xmlParser.xmlParse(`<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:template match="page">
        <result><xsl:value-of select="item/@value + 1"/></result>
    </xsl:template>
</xsl:stylesheet>`);
        const result = await xslt.xsltProcess(xml, stylesheet);
        expect(result).toBe('<result>6</result>');
    });

    it('unary negation on node: -number returns -5', async () => {
        const xml = xmlParser.xmlParse('<page><number>5</number></page>');
        const stylesheet = xmlParser.xmlParse(`<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:template match="page">
        <result><xsl:value-of select="-number"/></result>
    </xsl:template>
</xsl:stylesheet>`);
        const result = await xslt.xsltProcess(xml, stylesheet);
        expect(result).toBe('<result>-5</result>');
    });

    it('empty node-set in arithmetic does not throw', async () => {
        // XPath 1.0 typically yields NaN for arithmetic on an empty node-set.
        // This test only asserts that xsltProcess resolves without throwing.
        const xml = xmlParser.xmlParse('<page><number>1</number></page>');
        const stylesheet = xmlParser.xmlParse(`<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:template match="page">
        <result><xsl:value-of select="missing + 1"/></result>
    </xsl:template>
</xsl:stylesheet>`);
        await xslt.xsltProcess(xml, stylesheet);
    });

    it('plain number select still works: select="number" returns 1', async () => {
        const xml = xmlParser.xmlParse('<page><number>1</number></page>');
        const stylesheet = xmlParser.xmlParse(`<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:template match="page">
        <result><xsl:value-of select="number"/></result>
    </xsl:template>
</xsl:stylesheet>`);
        const result = await xslt.xsltProcess(xml, stylesheet);
        expect(result).toBe('<result>1</result>');
    });
});
