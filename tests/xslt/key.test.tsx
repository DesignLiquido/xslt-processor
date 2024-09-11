import assert from 'assert';

import { XmlParser } from "../../src/dom";
import { Xslt } from "../../src/xslt";

describe('xsl:key', () => {
    it('Trivial', async () => {
        const xmlSource = `<persons>
            <person name="Tarzan" id="050676"/>
            <person name="Donald" id="070754"/>
            <person name="Dolly" id="231256"/>
        </persons> `;

        const xsltSource = `<?xml version="1.0" encoding="UTF-8"?>
        <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

            <xsl:key name="preg" match="person" use="@id"/>

            <xsl:template match="/">
                <html>
                    <body>
                        <xsl:for-each select="key('preg','050676')">
                            <p>
                                Id: <xsl:value-of select="@id"/><br />
                                Name: <xsl:value-of select="@name"/>
                            </p>
                        </xsl:for-each>
                    </body>
                </html>
            </xsl:template>

        </xsl:stylesheet> `;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlSource);
        const xslt = xmlParser.xmlParse(xsltSource);
        const resultingXml = await xsltClass.xsltProcess(xml, xslt);
        assert.ok(resultingXml);
    });
});