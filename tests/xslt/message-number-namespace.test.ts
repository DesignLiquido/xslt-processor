import assert from 'assert';

import { XmlParser } from "../../src/dom";
import { Xslt } from "../../src/xslt";

describe('xsl:message', () => {
    it('Basic message output (non-terminating)', async () => {
        const xmlString = `<?xml version="1.0"?>
<root>
    <item>test</item>
</root>`;

        const xsltString = `<?xml version="1.0"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:template match="/">
        <xsl:message>Processing started</xsl:message>
        <result><xsl:value-of select="root/item"/></result>
    </xsl:template>
</xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        // Should not throw and should produce output
        const outXmlString = await xsltClass.xsltProcess(xml, xslt);
        assert.equal(outXmlString, `<result>test</result>`);
    });

    it('Message with dynamic content', async () => {
        const xmlString = `<?xml version="1.0"?>
<root>
    <count>5</count>
</root>`;

        const xsltString = `<?xml version="1.0"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:template match="/">
        <xsl:message>Count is: <xsl:value-of select="root/count"/></xsl:message>
        <output>done</output>
    </xsl:template>
</xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const outXmlString = await xsltClass.xsltProcess(xml, xslt);
        assert.equal(outXmlString, `<output>done</output>`);
    });

    it('Message with terminate="yes" stops processing', async () => {
        const xmlString = `<?xml version="1.0"?>
<root><item>test</item></root>`;

        const xsltString = `<?xml version="1.0"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:template match="/">
        <xsl:message terminate="yes">Fatal error occurred</xsl:message>
        <result>should not reach here</result>
    </xsl:template>
</xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        await assert.rejects(
            async () => await xsltClass.xsltProcess(xml, xslt),
            /xsl:message terminated/
        );
    });

    it('Message with terminate="no" continues processing', async () => {
        const xmlString = `<?xml version="1.0"?>
<root><item>test</item></root>`;

        const xsltString = `<?xml version="1.0"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:template match="/">
        <xsl:message terminate="no">Warning message</xsl:message>
        <result>completed</result>
    </xsl:template>
</xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const outXmlString = await xsltClass.xsltProcess(xml, xslt);
        assert.equal(outXmlString, `<result>completed</result>`);
    });
});

describe('xsl:number', () => {
    it('Basic number with value attribute', async () => {
        const xmlString = `<?xml version="1.0"?>
<root><item>test</item></root>`;

        const xsltString = `<?xml version="1.0"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:template match="/">
        <result><xsl:number value="42"/></result>
    </xsl:template>
</xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const outXmlString = await xsltClass.xsltProcess(xml, xslt);
        assert.equal(outXmlString, `<result>42</result>`);
    });

    it('Number with XPath expression value', async () => {
        const xmlString = `<?xml version="1.0"?>
<root><item>test</item></root>`;

        const xsltString = `<?xml version="1.0"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:template match="/">
        <result><xsl:number value="15 + 5"/></result>
    </xsl:template>
</xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const outXmlString = await xsltClass.xsltProcess(xml, xslt);
        assert.equal(outXmlString, `<result>20</result>`);
    });

    it('Number with format="A" (uppercase alphabetic)', async () => {
        const xmlString = `<?xml version="1.0"?>
<root><item>test</item></root>`;

        const xsltString = `<?xml version="1.0"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:template match="/">
        <result>
            <xsl:number value="1" format="A"/>-<xsl:number value="2" format="A"/>-<xsl:number value="26" format="A"/>-<xsl:number value="27" format="A"/>
        </result>
    </xsl:template>
</xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const outXmlString = await xsltClass.xsltProcess(xml, xslt);
        assert.equal(outXmlString, `<result>A-B-Z-AA</result>`);
    });

    it('Number with format="a" (lowercase alphabetic)', async () => {
        const xmlString = `<?xml version="1.0"?>
<root><item>test</item></root>`;

        const xsltString = `<?xml version="1.0"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:template match="/">
        <result><xsl:number value="3" format="a"/></result>
    </xsl:template>
</xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const outXmlString = await xsltClass.xsltProcess(xml, xslt);
        assert.equal(outXmlString, `<result>c</result>`);
    });

    it('Number with format="I" (uppercase Roman numerals)', async () => {
        const xmlString = `<?xml version="1.0"?>
<root><item>test</item></root>`;

        const xsltString = `<?xml version="1.0"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:template match="/">
        <result>
            <xsl:number value="1" format="I"/>-<xsl:number value="4" format="I"/>-<xsl:number value="9" format="I"/>-<xsl:number value="14" format="I"/>
        </result>
    </xsl:template>
</xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const outXmlString = await xsltClass.xsltProcess(xml, xslt);
        assert.equal(outXmlString, `<result>I-IV-IX-XIV</result>`);
    });

    it('Number with format="i" (lowercase Roman numerals)', async () => {
        const xmlString = `<?xml version="1.0"?>
<root><item>test</item></root>`;

        const xsltString = `<?xml version="1.0"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:template match="/">
        <result><xsl:number value="2024" format="i"/></result>
    </xsl:template>
</xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const outXmlString = await xsltClass.xsltProcess(xml, xslt);
        assert.equal(outXmlString, `<result>mmxxiv</result>`);
    });

    it('Number counting siblings (level="single")', async () => {
        const xmlString = `<?xml version="1.0"?>
<root>
    <item>first</item>
    <item>second</item>
    <item>third</item>
</root>`;

        const xsltString = `<?xml version="1.0"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:strip-space elements="*"/>
    <xsl:template match="root">
        <list><xsl:apply-templates select="item"/></list>
    </xsl:template>
    <xsl:template match="item">
        <entry><xsl:number level="single"/>. <xsl:value-of select="."/></entry>
    </xsl:template>
</xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const outXmlString = await xsltClass.xsltProcess(xml, xslt);
        assert.ok(outXmlString.includes('1. first'));
        assert.ok(outXmlString.includes('2. second'));
        assert.ok(outXmlString.includes('3. third'));
    });
});

describe('xsl:namespace-alias', () => {
    it('Stores namespace alias mapping', async () => {
        const xmlString = `<?xml version="1.0"?>
<root><item>test</item></root>`;

        const xsltString = `<?xml version="1.0"?>
<xsl:stylesheet version="1.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:myns="http://example.com/myns">
    <xsl:namespace-alias stylesheet-prefix="myns" result-prefix="xsl"/>
    <xsl:template match="/">
        <result>ok</result>
    </xsl:template>
</xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        // Verify the namespace alias was stored
        assert.equal(xsltClass.namespaceAliases.get('myns'), 'xsl');
        assert.equal(outXmlString, `<result>ok</result>`);
    });

    it('Throws error when missing required attributes', async () => {
        const xmlString = `<?xml version="1.0"?>
<root><item>test</item></root>`;

        const xsltString = `<?xml version="1.0"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:namespace-alias stylesheet-prefix="myns"/>
    <xsl:template match="/">
        <result>ok</result>
    </xsl:template>
</xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        await assert.rejects(
            async () => await xsltClass.xsltProcess(xml, xslt),
            /requires both stylesheet-prefix and result-prefix/
        );
    });
});

describe('Error messages for misplaced elements', () => {
    it('xsl:otherwise outside xsl:choose throws descriptive error', async () => {
        const xmlString = `<?xml version="1.0"?>
<root><item>test</item></root>`;

        const xsltString = `<?xml version="1.0"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:template match="/">
        <xsl:otherwise>invalid</xsl:otherwise>
    </xsl:template>
</xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        await assert.rejects(
            async () => await xsltClass.xsltProcess(xml, xslt),
            /must be a child of <xsl:choose>/
        );
    });

    it('xsl:when outside xsl:choose throws descriptive error', async () => {
        const xmlString = `<?xml version="1.0"?>
<root><item>test</item></root>`;

        const xsltString = `<?xml version="1.0"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:template match="/">
        <xsl:when test="true()">invalid</xsl:when>
    </xsl:template>
</xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        await assert.rejects(
            async () => await xsltClass.xsltProcess(xml, xslt),
            /must be a child of <xsl:choose>/
        );
    });

    it('xsl:with-param outside call-template/apply-templates throws descriptive error', async () => {
        const xmlString = `<?xml version="1.0"?>
<root><item>test</item></root>`;

        const xsltString = `<?xml version="1.0"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:template match="/">
        <xsl:with-param name="x" select="1"/>
    </xsl:template>
</xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        await assert.rejects(
            async () => await xsltClass.xsltProcess(xml, xslt),
            /must be a child of <xsl:call-template> or <xsl:apply-templates>/
        );
    });
});
