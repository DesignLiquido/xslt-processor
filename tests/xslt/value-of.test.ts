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
        // ?
        // outXmlString is "<h1>'s Web Feed Preview</h1>" and not "<h1>Fergie's Web Feed Preview</h1>" as expected)
        // ?

        assert.equal(outXmlString, `<h1>Fergie's Web Feed Preview</h1>`);
    });
});
