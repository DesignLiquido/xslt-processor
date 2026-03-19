import { Xslt, XmlParser } from '../../src/index';

describe('Issue #183: Template match with nested elements', () => {
    it('should match //message when nested under <child>', async () => {
        const xslt = new Xslt();
        const xmlParser = new XmlParser();

        const xml = xmlParser.xmlParse('<page><child><message>Hello World.</message></child></page>');
        const stylesheet = xmlParser.xmlParse(`<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:template match="//message">
        <div><xsl:value-of select="."/></div>
    </xsl:template>
</xsl:stylesheet>`);

        const result = await xslt.xsltProcess(xml, stylesheet);
        expect(result).toBe('<div>Hello World.</div>');
    });

    it('should match with explicit path /page/child/message', async () => {
        const xslt = new Xslt();
        const xmlParser = new XmlParser();

        const xml = xmlParser.xmlParse('<page><child><message>Hello World.</message></child></page>');
        const stylesheet = xmlParser.xmlParse(`<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:template match="/page/child/message">
        <div><xsl:value-of select="."/></div>
    </xsl:template>
</xsl:stylesheet>`);

        const result = await xslt.xsltProcess(xml, stylesheet);
        expect(result).toBe('<div>Hello World.</div>');
    });

    it('should match //message when NOT nested (direct child of root)', async () => {
        const xslt = new Xslt();
        const xmlParser = new XmlParser();

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
