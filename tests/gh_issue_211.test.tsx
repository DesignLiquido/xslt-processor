/* eslint-disable no-undef */
import assert from 'assert';

import { Xslt } from '../src/xslt';
import { XmlParser } from '../src/dom';

describe('Issue 211', () => {
    it("document('') resolves to the stylesheet itself, enabling in-stylesheet data lookups", async () => {
        const xmlString = `<page><message/></page>`;

        const xsltString = `
        <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:variable name="strings" select="document('')/xsl:stylesheet/xsl:template[@name='strings']" />

            <xsl:template match="/">
                <xsl:apply-templates select="/page/message"/>
            </xsl:template>

            <xsl:template match="/page/message">
                <div><xsl:value-of select="$strings/string"/></div>
            </xsl:template>

            <xsl:template name="strings">
                <string>Hehe</string>
            </xsl:template>
        </xsl:stylesheet>`;

        const expectedOutString = `<div>Hehe</div>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);
        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        assert.equal(outXmlString.replace(/\s+/g, ''), expectedOutString.replace(/\s+/g, ''));
    });
});
