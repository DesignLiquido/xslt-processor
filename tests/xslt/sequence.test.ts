import assert from 'assert';

import { XmlParser } from "../../src/dom";
import { Xslt } from "../../src/xslt";

describe('xsl:sequence (XSLT 2.0)', () => {
    it('should output node sequence from select expression', async () => {
        const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
        <items>
            <item>A</item>
            <item>B</item>
            <item>C</item>
        </items>`;

        const xsltString = `<?xml version="1.0"?>
        <xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:output method="xml" omit-xml-declaration="yes"/>
            <xsl:template match="/">
                <result>
                    <xsl:sequence select="//item"/>
                </result>
            </xsl:template>
        </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        assert.equal(outXmlString, '<result><item>A</item><item>B</item><item>C</item></result>');
    });

    it('should output atomic value from select expression', async () => {
        const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
        <root><value>42</value></root>`;

        const xsltString = `<?xml version="1.0"?>
        <xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:output method="xml" omit-xml-declaration="yes"/>
            <xsl:template match="/">
                <result>
                    <xsl:sequence select="concat('Number: ', //value)"/>
                </result>
            </xsl:template>
        </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        assert.equal(outXmlString, '<result>Number: 42</result>');
    });

    it('should output numeric value from select expression', async () => {
        const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
        <root><value>42</value></root>`;

        const xsltString = `<?xml version="1.0"?>
        <xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:output method="xml" omit-xml-declaration="yes"/>
            <xsl:template match="/">
                <result>
                    <xsl:sequence select="count(//*)"/>
                </result>
            </xsl:template>
        </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        assert.equal(outXmlString, '<result>2</result>');
    });

    it('should process child content when no select attribute', async () => {
        const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
        <root><name>Test</name></root>`;

        const xsltString = `<?xml version="1.0"?>
        <xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:output method="xml" omit-xml-declaration="yes"/>
            <xsl:template match="/">
                <result>
                    <xsl:sequence>
                        <item>First</item>
                        <item>Second</item>
                    </xsl:sequence>
                </result>
            </xsl:template>
        </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        assert.equal(outXmlString, '<result><item>First</item><item>Second</item></result>');
    });

    it('should work inside xsl:variable', async () => {
        const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
        <items>
            <item>X</item>
            <item>Y</item>
        </items>`;

        const xsltString = `<?xml version="1.0"?>
        <xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:output method="xml" omit-xml-declaration="yes"/>
            <xsl:template match="/">
                <xsl:variable name="items">
                    <xsl:sequence select="//item"/>
                </xsl:variable>
                <result>
                    <xsl:copy-of select="$items"/>
                </result>
            </xsl:template>
        </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        assert.equal(outXmlString, '<result><item>X</item><item>Y</item></result>');
    });

    it('should handle empty sequence', async () => {
        const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
        <root></root>`;

        const xsltString = `<?xml version="1.0"?>
        <xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:output method="xml" omit-xml-declaration="yes"/>
            <xsl:template match="/">
                <result>
                    <xsl:sequence select="//nonexistent"/>
                </result>
            </xsl:template>
        </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        // Empty element may serialize as self-closing tag
        assert.ok(outXmlString === '<result></result>' || outXmlString === '<result/>');
    });

    it('should work with for-each to process sequence items', async () => {
        const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
        <numbers>
            <n>1</n>
            <n>2</n>
            <n>3</n>
        </numbers>`;

        const xsltString = `<?xml version="1.0"?>
        <xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:output method="xml" omit-xml-declaration="yes"/>
            <xsl:template match="/">
                <result>
                    <xsl:for-each select="//n">
                        <xsl:sequence select="."/>
                    </xsl:for-each>
                </result>
            </xsl:template>
        </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        assert.equal(outXmlString, '<result><n>1</n><n>2</n><n>3</n></result>');
    });

    it('should handle boolean values', async () => {
        const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
        <root><a>5</a><b>10</b></root>`;

        const xsltString = `<?xml version="1.0"?>
        <xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:output method="xml" omit-xml-declaration="yes"/>
            <xsl:template match="/">
                <result>
                    <xsl:sequence select="//a &lt; //b"/>
                </result>
            </xsl:template>
        </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        assert.equal(outXmlString, '<result>true</result>');
    });

    it('should handle text content selection', async () => {
        const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
        <items>
            <item>Alpha</item>
            <item>Beta</item>
        </items>`;

        const xsltString = `<?xml version="1.0"?>
        <xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:output method="xml" omit-xml-declaration="yes"/>
            <xsl:template match="/">
                <result>
                    <xsl:for-each select="//item">
                        <val><xsl:sequence select="text()"/></val>
                    </xsl:for-each>
                </result>
            </xsl:template>
        </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        assert.equal(outXmlString, '<result><val>Alpha</val><val>Beta</val></result>');
    });
});
