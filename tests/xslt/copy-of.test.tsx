import assert from 'assert';

import { XmlParser } from '../../src/dom';
import { Xslt } from '../../src/xslt';

describe('xsl:copy-of', () => {
    it('Trivial', () => {
        const xmlSource = `<?xml version="1.0" encoding="UTF-8"?>
            <test>
                <A>
                    <B>
                        <D><![CDATA[Hello]]></D>
                    </B>
                    <C>
                        <D><![CDATA[World]]></D>
                    </C>
                </A>
            </test>`;

        const xsltSource = `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
            <xsl:output method="html" version="4.0" encoding="utf-8" omit-xml-declaration="yes" />
            <xsl:template match="/test">
                <xsl:variable name="varA" select="A/B/D" />
                <xsl:variable name="varB" select="A/C/D" />
                <h1>
                    <xsl:copy-of select="$varA" />-<xsl:copy-of select="$varB" />
                </h1>
            </xsl:template>
        </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlSource);
        const xslt = xmlParser.xmlParse(xsltSource);
        const html = xsltClass.xsltProcess(xml, xslt);
        assert.equal(html, '<h1><D>Hello</D>-<D>World</D></h1>');
    });
});
