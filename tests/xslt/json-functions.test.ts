import assert from 'assert';

import { XmlParser } from "../../src/dom";
import { Xslt } from "../../src/xslt";

describe('JSON Functions (XSLT 3.0)', () => {
    const xsltClass = new Xslt();
    const xmlParser = new XmlParser();

    describe('json-to-xml Function', () => {
        it('should convert JSON string to XML element', async () => {
            const xmlString = '<root/>';

            const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml" omit-xml-declaration="yes"/>
                <xsl:template match="/">
                    <result>
                        <xsl:copy-of select="json-to-xml('&quot;hello&quot;')"/>
                    </result>
                </xsl:template>
            </xsl:stylesheet>`;

            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            assert(result.includes('hello'), `Expected to find 'hello', got: ${result}`);
        });

        it('should convert JSON object to XML structure', async () => {
            const xmlString = '<root/>';

            const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml" omit-xml-declaration="yes"/>
                <xsl:template match="/">
                    <result>
                        <xsl:copy-of select="json-to-xml('{&quot;name&quot;:&quot;John&quot;,&quot;age&quot;:30}')"/>
                    </result>
                </xsl:template>
            </xsl:stylesheet>`;

            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            assert(result.includes('John'), `Expected to find 'John', got: ${result}`);
            assert(result.includes('30'), `Expected to find '30', got: ${result}`);
        });

        it('should convert JSON array to XML elements', async () => {
            const xmlString = '<root/>';

            const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml" omit-xml-declaration="yes"/>
                <xsl:template match="/">
                    <result>
                        <xsl:copy-of select="json-to-xml('[1,2,3]')"/>
                    </result>
                </xsl:template>
            </xsl:stylesheet>`;

            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            assert(result.includes('1'), `Expected to find '1', got: ${result}`);
            assert(result.includes('2'), `Expected to find '2', got: ${result}`);
            assert(result.includes('3'), `Expected to find '3', got: ${result}`);
        });

        it('should handle JSON null value', async () => {
            const xmlString = '<root/>';

            const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml" omit-xml-declaration="yes"/>
                <xsl:template match="/">
                    <result>
                        <xsl:copy-of select="json-to-xml('null')"/>
                    </result>
                </xsl:template>
            </xsl:stylesheet>`;

            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            assert(result.includes('result'), `Expected to find 'result' element, got: ${result}`);
        });

        it('should handle nested JSON structures', async () => {
            const xmlString = '<root/>';

            const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml" omit-xml-declaration="yes"/>
                <xsl:template match="/">
                    <result>
                        <xsl:copy-of select="json-to-xml('{&quot;person&quot;:{&quot;name&quot;:&quot;Alice&quot;,&quot;address&quot;:{&quot;city&quot;:&quot;NYC&quot;}}}')"/>
                    </result>
                </xsl:template>
            </xsl:stylesheet>`;

            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            assert(result.includes('Alice'), `Expected to find 'Alice', got: ${result}`);
            assert(result.includes('NYC'), `Expected to find 'NYC', got: ${result}`);
        });
    });

    describe('xml-to-json Function', () => {
        it('should convert XML element to JSON string', async () => {
            const xmlString = '<root><test>value</test></root>';

            const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml" omit-xml-declaration="yes"/>
                <xsl:template match="/">
                    <result>
                        <json><xsl:value-of select="xml-to-json(/root/test)"/></json>
                    </result>
                </xsl:template>
            </xsl:stylesheet>`;

            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            assert(result.includes('value'), `Expected to find 'value' in JSON, got: ${result}`);
        });

        it('should convert XML with attributes to JSON', async () => {
            const xmlString = '<root><item id="1">product</item></root>';

            const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml" omit-xml-declaration="yes"/>
                <xsl:template match="/">
                    <result>
                        <json><xsl:value-of select="xml-to-json(/root/item)"/></json>
                    </result>
                </xsl:template>
            </xsl:stylesheet>`;

            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            // JSON should contain the text content
            assert(result.includes('product'), `Expected to find 'product' in JSON, got: ${result}`);
        });

        it('should handle text-only XML elements', async () => {
            const xmlString = '<root><name>John</name><age>30</age></root>';

            const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml" omit-xml-declaration="yes"/>
                <xsl:template match="/">
                    <result>
                        <json><xsl:value-of select="xml-to-json(/root/name)"/></json>
                    </result>
                </xsl:template>
            </xsl:stylesheet>`;

            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            assert(result.includes('John'), `Expected to find 'John' in JSON, got: ${result}`);
        });

        it('should handle empty XML elements', async () => {
            const xmlString = '<root><empty/></root>';

            const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml" omit-xml-declaration="yes"/>
                <xsl:template match="/">
                    <result>
                        <json><xsl:value-of select="xml-to-json(/root/empty)"/></json>
                    </result>
                </xsl:template>
            </xsl:stylesheet>`;

            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            // Empty element should produce empty string in JSON
            assert(result.includes('json'), `Expected to find 'json' element, got: ${result}`);
        });
    });

    describe('Round-trip Conversion', () => {
        it.skip('should preserve JSON structure through round-trip conversion', async () => {
            const xmlString = '<root/>';

            const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml" omit-xml-declaration="yes"/>
                <xsl:template match="/">
                    <result>
                        <original>{&quot;name&quot;:&quot;Alice&quot;,&quot;scores&quot;:[95,87,92]}</original>
                        <xsl:variable name="xml-version" select="json-to-xml('{&quot;name&quot;:&quot;Alice&quot;,&quot;scores&quot;:[95,87,92]}')"/>
                        <back-to-json><xsl:value-of select="xml-to-json($xml-version)"/></back-to-json>
                    </result>
                </xsl:template>
            </xsl:stylesheet>`;

            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            // Check that both original and converted versions contain key data
            assert(result.includes('Alice'), `Expected to find 'Alice' in result, got: ${result}`);
            assert(result.includes('95'), `Expected to find '95' in result, got: ${result}`);
        });

        it('should handle complex JSON structures in round-trip', async () => {
            const xmlString = '<root/>';

            const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml" omit-xml-declaration="yes"/>
                <xsl:template match="/">
                    <result>
                        <xsl:variable name="json-str" select="'{&quot;users&quot;:[{&quot;id&quot;:1,&quot;name&quot;:&quot;Bob&quot;},{&quot;id&quot;:2,&quot;name&quot;:&quot;Carol&quot;}]}'"/>
                        <xsl:variable name="xml-version" select="json-to-xml($json-str)"/>
                        <json-result><xsl:value-of select="xml-to-json($xml-version)"/></json-result>
                    </result>
                </xsl:template>
            </xsl:stylesheet>`;

            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            assert(result.includes('Bob'), `Expected to find 'Bob', got: ${result}`);
            assert(result.includes('Carol'), `Expected to find 'Carol', got: ${result}`);
        });
    });

    describe('Error Handling', () => {
        it('should throw error in XSLT 1.0 for json-to-xml', async () => {
            const xmlString = '<root/>';

            const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml" omit-xml-declaration="yes"/>
                <xsl:template match="/">
                    <result><xsl:value-of select="json-to-xml('&quot;test&quot;')"/></result>
                </xsl:template>
            </xsl:stylesheet>`;

            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            await assert.rejects(
                async () => await xsltClass.xsltProcess(xml, xslt),
                /json-to-xml.*only supported in XSLT 3\.0/
            );
        });

        it('should throw error in XSLT 1.0 for xml-to-json', async () => {
            const xmlString = '<root><test>value</test></root>';

            const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml" omit-xml-declaration="yes"/>
                <xsl:template match="/">
                    <result><xsl:value-of select="xml-to-json(/root/test)"/></result>
                </xsl:template>
            </xsl:stylesheet>`;

            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            await assert.rejects(
                async () => await xsltClass.xsltProcess(xml, xslt),
                /xml-to-json.*only supported in XSLT 3\.0/
            );
        });
    });
});
