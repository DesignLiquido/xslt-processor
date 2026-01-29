import assert from 'assert';

import { XmlParser } from "../../src/dom";
import { Xslt } from "../../src/xslt";

describe('Maps and Arrays (XSLT 3.0)', () => {
    const xsltClass = new Xslt();
    const xmlParser = new XmlParser();

    it('should create and access map with lookup operator', async () => {
        const xmlString = '<root/>';

        const xsltString = `<?xml version="1.0"?>
        <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:output method="xml" omit-xml-declaration="yes"/>
            <xsl:template match="/">
                <result>
                    <xsl:variable name="m" select="map { 'key': 'value' }"/>
                    <var-test><xsl:value-of select="$m?key"/></var-test>
                </result>
            </xsl:template>
        </xsl:stylesheet>`;

        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);
        const result = await xsltClass.xsltProcess(xml, xslt);

        assert(result.includes('<var-test>value</var-test>'), `Expected to find '<var-test>value</var-test>', got: ${result}`);
    });

    it('should serialize array to JSON in xsl:sequence', async () => {
        const xmlString = '<root/>';

        const xsltString = `<?xml version="1.0"?>
        <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:output method="xml" omit-xml-declaration="yes"/>
            <xsl:template match="/">
                <result>
                    <array-test><xsl:sequence select="[1, 2, 3]"/></array-test>
                </result>
            </xsl:template>
        </xsl:stylesheet>`;

        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);
        const result = await xsltClass.xsltProcess(xml, xslt);

        assert(result.includes('[1,2,3]'), `Expected to find '[1,2,3]', got: ${result}`);
    });

    it('should serialize map to JSON in xsl:sequence', async () => {
        const xmlString = '<root/>';

        const xsltString = `<?xml version="1.0"?>
        <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:output method="xml" omit-xml-declaration="yes"/>
            <xsl:template match="/">
                <result>
                    <map-test><xsl:sequence select="map { 'key': 'value' }"/></map-test>
                </result>
            </xsl:template>
        </xsl:stylesheet>`;

        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);
        const result = await xsltClass.xsltProcess(xml, xslt);

        assert(result.includes('{"key":"value"}'), `Expected to find '{"key":"value"}', got: ${result}`);
    });

    it('should support multiple map entries', async () => {
        const xmlString = '<root/>';

        const xsltString = `<?xml version="1.0"?>
        <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:output method="xml" omit-xml-declaration="yes"/>
            <xsl:template match="/">
                <result>
                    <xsl:variable name="m" select="map { 'name': 'John', 'age': 30 }"/>
                    <name><xsl:value-of select="$m?name"/></name>
                    <age><xsl:value-of select="$m?age"/></age>
                </result>
            </xsl:template>
        </xsl:stylesheet>`;

        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);
        const result = await xsltClass.xsltProcess(xml, xslt);

        assert(result.includes('<name>John</name>'), `Expected to find '<name>John</name>', got: ${result}`);
        assert(result.includes('<age>30</age>'), `Expected to find '<age>30</age>', got: ${result}`);
    });

    it('should support nested maps', async () => {
        const xmlString = '<root/>';

        const xsltString = `<?xml version="1.0"?>
        <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:output method="xml" omit-xml-declaration="yes"/>
            <xsl:template match="/">
                <result>
                    <xsl:variable name="nested" select="map { 'user': map { 'id': 1, 'name': 'Alice' } }"/>
                    <id><xsl:value-of select="$nested?user?id"/></id>
                </result>
            </xsl:template>
        </xsl:stylesheet>`;

        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);
        const result = await xsltClass.xsltProcess(xml, xslt);

        assert(result.includes('<id>1</id>'), `Expected to find '<id>1</id>', got: ${result}`);
    });
});
