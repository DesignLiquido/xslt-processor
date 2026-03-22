import { Xslt, XmlParser } from '../../src/index';

describe('Issue #187: Identity transformation adds spaces to comments', () => {
    it('keeps comment content stable across repeated identity transforms', async () => {
        const xslt = new Xslt();
        const xmlParser = new XmlParser();

        const xmlInput = '<root><!--1234567890 1234567890--></root>';
        const stylesheet = xmlParser.xmlParse(`<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:template match="/">
        <xsl:copy-of select="."/>
    </xsl:template>
</xsl:stylesheet>`);

        const firstInputDoc = xmlParser.xmlParse(xmlInput);
        const firstPass = await xslt.xsltProcess(firstInputDoc, stylesheet);
        expect(firstPass).toBe(xmlInput);

        const secondInputDoc = xmlParser.xmlParse(firstPass);
        const secondPass = await xslt.xsltProcess(secondInputDoc, stylesheet);
        expect(secondPass).toBe(firstPass);
    });
});