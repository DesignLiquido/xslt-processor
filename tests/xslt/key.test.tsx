import assert from 'assert';

import { XmlParser } from "../../src/dom";
import { Xslt } from "../../src/xslt";

describe('xsl:key', () => {
    it('Deep path match with numeric key value and value-of (issue #181)', async () => {
        const xmlSource = `<Response>
            <Content>
                <Cities>
                    <City ID="10" Name="New York"/>
                    <City ID="20" Name="London"/>
                </Cities>
            </Content>
        </Response>`;

        const xsltSource = `<?xml version="1.0" encoding="UTF-8"?>
        <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:key name="Cities" match="/Response/Content/Cities/City" use="@ID"/>
            <xsl:template match="/">
                <result><xsl:value-of select="key('Cities', 10)/@Name"/></result>
            </xsl:template>
        </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlSource);
        const xslt = xmlParser.xmlParse(xsltSource);
        const resultingXml = await xsltClass.xsltProcess(xml, xslt);
        assert.equal(resultingXml, '<result>New York</result>');
    });

    it('Multiple nodes sharing the same key value', async () => {
        const xmlSource = `<items>
            <item category="fruit" name="Apple"/>
            <item category="fruit" name="Banana"/>
            <item category="vegetable" name="Carrot"/>
        </items>`;

        const xsltSource = `<?xml version="1.0" encoding="UTF-8"?>
        <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:key name="byCategory" match="item" use="@category"/>
            <xsl:template match="/">
                <result>
                    <xsl:for-each select="key('byCategory', 'fruit')">
                        <name><xsl:value-of select="@name"/></name>
                    </xsl:for-each>
                </result>
            </xsl:template>
        </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlSource);
        const xslt = xmlParser.xmlParse(xsltSource);
        const resultingXml = await xsltClass.xsltProcess(xml, xslt);
        assert.equal(resultingXml, '<result><name>Apple</name><name>Banana</name></result>');
    });

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
                            <p>Name: <xsl:value-of select="@name"/></p>
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
        assert.equal(resultingXml, '<html><body><p>Name: Tarzan</p></body></html>');
    });
});