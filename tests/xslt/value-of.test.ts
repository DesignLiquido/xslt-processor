import assert from 'assert';

import { XmlParser } from "../../src/dom";
import { Xslt } from "../../src/xslt";

describe('xsl:value-of', () => {
    it('Issue 126', async () => {
        const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
        <feed xml:lang="en-US" xmlns="http://www.w3.org/2005/Atom">
        <title>Fergie</title>
        </feed>`

        const xsltString = `<xsl:stylesheet
        version="1.0"
        xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
        xmlns:atom="http://www.w3.org/2005/Atom"
        exclude-result-prefixes="atom"
        >
        
        <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>

        <xsl:template match="/atom:feed">
            <h1><xsl:value-of select="atom:title"/>'s Web Feed Preview</h1>
        </xsl:template>

        </xsl:stylesheet>
        `

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        assert.equal(outXmlString, `<h1>Fergie's Web Feed Preview</h1>`);
    });

        it('XSLT template with text on both sides (issue 109)', async () => {
                const xmlString = `<root>
                    <test name="test1">This text lost</test>
                </root>`;

                const xsltString = `<?xml version="1.0"?>
                <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    <xsl:output method="xml"/>
                    <xsl:template match="/">
                        <span>X<xsl:value-of select="test/@name" />Y</span>
                    </xsl:template>
                </xsl:stylesheet>`;

                const expectedOutString = `<span>Xtest1Y</span>`;

                const xsltClass = new Xslt();
                const xmlParser = new XmlParser();
                const xml = xmlParser.xmlParse(xmlString);
                const xslt = xmlParser.xmlParse(xsltString);

                const outXmlString = await xsltClass.xsltProcess(xml, xslt);

                assert.equal(outXmlString, expectedOutString);
        });
});
