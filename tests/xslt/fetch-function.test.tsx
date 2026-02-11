import assert from 'assert';

import { XmlParser } from "../../src/dom";
import { Xslt } from "../../src/xslt";

describe('fetchFunction option', () => {
    const xmlSource = `<root/>`;

    const includedStylesheet = `<xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/">
            <output>included</output>
        </xsl:template>
    </xsl:stylesheet>`;

    it('is called with the href URI on xsl:include', async () => {
        const calledWith: string[] = [];

        const xsltSource = `<xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:include href="https://example.com/my-stylesheet.xsl"/>
        </xsl:stylesheet>`;

        const xsltClass = new Xslt({
            fetchFunction: async (uri) => {
                calledWith.push(uri);
                return includedStylesheet;
            }
        });
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlSource);
        const xslt = xmlParser.xmlParse(xsltSource);
        const result = await xsltClass.xsltProcess(xml, xslt);

        assert.deepStrictEqual(calledWith, ['https://example.com/my-stylesheet.xsl']);
        assert.equal(result, '<output>included</output>');
    });

    it('is called with the href URI on xsl:import', async () => {
        const calledWith: string[] = [];

        const xsltSource = `<xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:import href="https://example.com/imported.xsl"/>
        </xsl:stylesheet>`;

        const xsltClass = new Xslt({
            fetchFunction: async (uri) => {
                calledWith.push(uri);
                return includedStylesheet;
            }
        });
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlSource);
        const xslt = xmlParser.xmlParse(xsltSource);
        const result = await xsltClass.xsltProcess(xml, xslt);

        assert.deepStrictEqual(calledWith, ['https://example.com/imported.xsl']);
        assert.equal(result, '<output>included</output>');
    });

    it('propagates errors thrown from fetchFunction', async () => {
        const xsltSource = `<xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:include href="https://example.com/denied.xsl"/>
        </xsl:stylesheet>`;

        const xsltClass = new Xslt({
            fetchFunction: async (uri) => {
                throw new Error(`External loading denied: ${uri}`);
            }
        });
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlSource);
        const xslt = xmlParser.xmlParse(xsltSource);

        await assert.rejects(
            async () => await xsltClass.xsltProcess(xml, xslt),
            { message: 'External loading denied: https://example.com/denied.xsl' }
        );
    });
});
