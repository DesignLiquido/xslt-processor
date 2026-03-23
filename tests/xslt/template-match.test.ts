import { Xslt, XmlParser } from '../../src/index';

describe('xsl:template match patterns', () => {
    let xslt: Xslt;
    let xmlParser: XmlParser;

    beforeEach(() => {
        xslt = new Xslt();
        xmlParser = new XmlParser();
    });

    it('matches //message when nested under a child element', async () => {
        const xml = xmlParser.xmlParse('<page><child><message>Hello World.</message></child></page>');
        const stylesheet = xmlParser.xmlParse(`<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:template match="//message">
        <div><xsl:value-of select="."/></div>
    </xsl:template>
</xsl:stylesheet>`);
        const result = await xslt.xsltProcess(xml, stylesheet);
        expect(result).toBe('<div>Hello World.</div>');
    });

    it('matches with explicit absolute path /page/child/message', async () => {
        const xml = xmlParser.xmlParse('<page><child><message>Hello World.</message></child></page>');
        const stylesheet = xmlParser.xmlParse(`<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:template match="/page/child/message">
        <div><xsl:value-of select="."/></div>
    </xsl:template>
</xsl:stylesheet>`);
        const result = await xslt.xsltProcess(xml, stylesheet);
        expect(result).toBe('<div>Hello World.</div>');
    });

    it('matches //message when element is a direct child of root', async () => {
        const xml = xmlParser.xmlParse('<page><message>Hello World.</message></page>');
        const stylesheet = xmlParser.xmlParse(`<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:template match="//message">
        <div><xsl:value-of select="."/></div>
    </xsl:template>
</xsl:stylesheet>`);
        const result = await xslt.xsltProcess(xml, stylesheet);
        expect(result).toBe('<div>Hello World.</div>');
    });
});
