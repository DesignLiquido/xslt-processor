import { describe, it, expect } from '@jest/globals';
import { XmlParser } from '../../src/dom';
import { Xslt } from '../../src/xslt';

/**
 * Tests for XSLT 3.0 Text Value Templates
 * 
 * Text Value Templates allow XPath expressions in {} directly in text nodes.
 * This is similar to Attribute Value Templates but for text content.
 * 
 * Spec: https://www.w3.org/TR/xslt-30/#text-value-templates
 */
describe('XSLT 3.0 Text Value Templates', () => {
    const xsltClass = new Xslt();
    const xmlParser = new XmlParser();

    describe('Basic Text Value Templates', () => {
        it('should evaluate simple XPath expression in text', async () => {
            const xml = xmlParser.xmlParse(`
                <data>
                    <name>Alice</name>
                </data>
            `);

            const xslt = xmlParser.xmlParse(`
                <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    <xsl:template match="data">
                        <p>Hello, {name}!</p>
                    </xsl:template>
                </xsl:stylesheet>
            `);

            const result = await xsltClass.xsltProcess(xml, xslt);
            expect(result).toContain('<p>Hello, Alice!</p>');
        });

        it('should evaluate multiple expressions in same text node', async () => {
            const xml = xmlParser.xmlParse(`
                <data>
                    <first>John</first>
                    <last>Doe</last>
                </data>
            `);

            const xslt = xmlParser.xmlParse(`
                <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    <xsl:template match="data">
                        <p>{first} {last}</p>
                    </xsl:template>
                </xsl:stylesheet>
            `);

            const result = await xsltClass.xsltProcess(xml, xslt);
            expect(result).toContain('<p>John Doe</p>');
        });

        it('should evaluate numeric expressions', async () => {
            const xml = xmlParser.xmlParse(`
                <data>
                    <count>42</count>
                </data>
            `);

            const xslt = xmlParser.xmlParse(`
                <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    <xsl:template match="data">
                        <p>The answer is {count}.</p>
                    </xsl:template>
                </xsl:stylesheet>
            `);

            const result = await xsltClass.xsltProcess(xml, xslt);
            expect(result).toContain('<p>The answer is 42.</p>');
        });

        it('should evaluate arithmetic expressions', async () => {
            const xml = xmlParser.xmlParse(`
                <data>
                    <value>10</value>
                </data>
            `);

            const xslt = xmlParser.xmlParse(`
                <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    <xsl:template match="data">
                        <p>Result: {number(value) * 2 + 5}</p>
                    </xsl:template>
                </xsl:stylesheet>
            `);

            const result = await xsltClass.xsltProcess(xml, xslt);
            expect(result).toContain('<p>Result: 25</p>');
        });
    });

    describe('XPath Functions in Text Value Templates', () => {
        it('should evaluate string functions', async () => {
            const xml = xmlParser.xmlParse(`
                <data>
                    <text>hello world</text>
                </data>
            `);

            const xslt = xmlParser.xmlParse(`
                <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    <xsl:template match="data">
                        <p>{concat('Greeting: ', text)}</p>
                    </xsl:template>
                </xsl:stylesheet>
            `);

            const result = await xsltClass.xsltProcess(xml, xslt);
            expect(result).toContain('<p>Greeting: hello world</p>');
        });

        it('should evaluate concat function', async () => {
            const xml = xmlParser.xmlParse(`
                <data>
                    <first>Jane</first>
                    <last>Smith</last>
                </data>
            `);

            const xslt = xmlParser.xmlParse(`
                <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    <xsl:template match="data">
                        <p>{concat(first, ' ', last)}</p>
                    </xsl:template>
                </xsl:stylesheet>
            `);

            const result = await xsltClass.xsltProcess(xml, xslt);
            expect(result).toContain('<p>Jane Smith</p>');
        });

        it('should evaluate count function', async () => {
            const xml = xmlParser.xmlParse(`
                <data>
                    <item>A</item>
                    <item>B</item>
                    <item>C</item>
                </data>
            `);

            const xslt = xmlParser.xmlParse(`
                <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    <xsl:template match="data">
                        <p>Total items: {count(item)}</p>
                    </xsl:template>
                </xsl:stylesheet>
            `);

            const result = await xsltClass.xsltProcess(xml, xslt);
            expect(result).toContain('<p>Total items: 3</p>');
        });
    });

    describe('Escaping in Text Value Templates', () => {
        it('should handle escaped opening brace {{', async () => {
            const xml = xmlParser.xmlParse(`<data><value>test</value></data>`);

            const xslt = xmlParser.xmlParse(`
                <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    <xsl:template match="data">
                        <p>Use {{ for literal brace</p>
                    </xsl:template>
                </xsl:stylesheet>
            `);

            const result = await xsltClass.xsltProcess(xml, xslt);
            expect(result).toContain('<p>Use { for literal brace</p>');
        });

        it('should handle escaped closing brace }}', async () => {
            const xml = xmlParser.xmlParse(`<data><value>test</value></data>`);

            const xslt = xmlParser.xmlParse(`
                <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    <xsl:template match="data">
                        <p>Use }} for literal brace</p>
                    </xsl:template>
                </xsl:stylesheet>
            `);

            const result = await xsltClass.xsltProcess(xml, xslt);
            expect(result).toContain('<p>Use } for literal brace</p>');
        });

        it('should handle both escaped braces together', async () => {
            const xml = xmlParser.xmlParse(`<data><value>test</value></data>`);

            const xslt = xmlParser.xmlParse(`
                <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    <xsl:template match="data">
                        <p>Code: {{ value }}</p>
                    </xsl:template>
                </xsl:stylesheet>
            `);

            const result = await xsltClass.xsltProcess(xml, xslt);
            expect(result).toContain('<p>Code: { value }</p>');
        });

        it('should mix literal and evaluated expressions', async () => {
            const xml = xmlParser.xmlParse(`
                <data>
                    <name>Bob</name>
                </data>
            `);

            const xslt = xmlParser.xmlParse(`
                <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    <xsl:template match="data">
                        <p>{{ name }} evaluates to {name}</p>
                    </xsl:template>
                </xsl:stylesheet>
            `);

            const result = await xsltClass.xsltProcess(xml, xslt);
            expect(result).toContain('<p>{ name } evaluates to Bob</p>');
        });
    });

    describe('Variables in Text Value Templates', () => {
        it('should access stylesheet variables', async () => {
            const xml = xmlParser.xmlParse(`<data/>`);

            const xslt = xmlParser.xmlParse(`
                <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    <xsl:variable name="greeting" select="'Hello'"/>
                    <xsl:template match="data">
                        <p>{$greeting}, World!</p>
                    </xsl:template>
                </xsl:stylesheet>
            `);

            const result = await xsltClass.xsltProcess(xml, xslt);
            expect(result).toContain('<p>Hello, World!</p>');
        });

        it('should access template variables', async () => {
            const xml = xmlParser.xmlParse(`<data><value>123</value></data>`);

            const xslt = xmlParser.xmlParse(`
                <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    <xsl:template match="data">
                        <xsl:variable name="num" select="number(value)"/>
                        <p>Double: {$num * 2}</p>
                    </xsl:template>
                </xsl:stylesheet>
            `);

            const result = await xsltClass.xsltProcess(xml, xslt);
            expect(result).toContain('<p>Double: 246</p>');
        });
    });

    describe('Nested Braces in Text Value Templates', () => {
        it('should handle nested braces in expressions', async () => {
            const xml = xmlParser.xmlParse(`
                <data>
                    <values>
                        <val>1</val>
                        <val>2</val>
                        <val>3</val>
                    </values>
                </data>
            `);

            const xslt = xmlParser.xmlParse(`
                <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    <xsl:template match="data">
                        <p>First: {values/val[1]}</p>
                    </xsl:template>
                </xsl:stylesheet>
            `);

            const result = await xsltClass.xsltProcess(xml, xslt);
            expect(result).toContain('<p>First: 1</p>');
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty expressions', async () => {
            const xml = xmlParser.xmlParse(`<data/>`);

            const xslt = xmlParser.xmlParse(`
                <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    <xsl:template match="data">
                        <p>Value: {/data/missing}</p>
                    </xsl:template>
                </xsl:stylesheet>
            `);

            const result = await xsltClass.xsltProcess(xml, xslt);
            expect(result).toContain('<p>Value: </p>');
        });

        it('should handle text with no expressions', async () => {
            const xml = xmlParser.xmlParse(`<data/>`);

            const xslt = xmlParser.xmlParse(`
                <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    <xsl:template match="data">
                        <p>Plain text without expressions</p>
                    </xsl:template>
                </xsl:stylesheet>
            `);

            const result = await xsltClass.xsltProcess(xml, xslt);
            expect(result).toContain('<p>Plain text without expressions</p>');
        });

        it('should handle unmatched opening brace as literal', async () => {
            const xml = xmlParser.xmlParse(`<data/>`);

            const xslt = xmlParser.xmlParse(`
                <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    <xsl:template match="data">
                        <p>This has an unmatched {</p>
                    </xsl:template>
                </xsl:stylesheet>
            `);

            const result = await xsltClass.xsltProcess(xml, xslt);
            expect(result).toContain('<p>This has an unmatched {</p>');
        });

        it('should handle unmatched closing brace as literal', async () => {
            const xml = xmlParser.xmlParse(`<data/>`);

            const xslt = xmlParser.xmlParse(`
                <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    <xsl:template match="data">
                        <p>This has an unmatched }</p>
                    </xsl:template>
                </xsl:stylesheet>
            `);

            const result = await xsltClass.xsltProcess(xml, xslt);
            expect(result).toContain('<p>This has an unmatched }</p>');
        });
    });

    describe('Version Checking', () => {
        it('should NOT apply text value templates in XSLT 2.0', async () => {
            const xml = xmlParser.xmlParse(`
                <data>
                    <name>Alice</name>
                </data>
            `);

            const xslt = xmlParser.xmlParse(`
                <xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    <xsl:template match="data">
                        <p>Hello, {name}!</p>
                    </xsl:template>
                </xsl:stylesheet>
            `);

            const result = await xsltClass.xsltProcess(xml, xslt);
            // In XSLT 2.0, braces should be treated as literal text
            expect(result).toContain('<p>Hello, {name}!</p>');
        });

        it('should NOT apply text value templates in XSLT 1.0', async () => {
            const xml = xmlParser.xmlParse(`
                <data>
                    <name>Alice</name>
                </data>
            `);

            const xslt = xmlParser.xmlParse(`
                <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    <xsl:template match="data">
                        <p>Hello, {name}!</p>
                    </xsl:template>
                </xsl:stylesheet>
            `);

            const result = await xsltClass.xsltProcess(xml, xslt);
            // In XSLT 1.0, braces should be treated as literal text
            expect(result).toContain('<p>Hello, {name}!</p>');
        });
    });

    describe('Complex Scenarios', () => {
        it('should work with conditional expressions', async () => {
            const xml = xmlParser.xmlParse(`
                <data>
                    <count>5</count>
                </data>
            `);

            const xslt = xmlParser.xmlParse(`
                <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    <xsl:template match="data">
                        <p>Status: {if (count > 3) then 'High' else 'Low'}</p>
                    </xsl:template>
                </xsl:stylesheet>
            `);

            const result = await xsltClass.xsltProcess(xml, xslt);
            expect(result).toContain('<p>Status: High</p>');
        });

        it('should work within for-each', async () => {
            const xml = xmlParser.xmlParse(`
                <data>
                    <item>A</item>
                    <item>B</item>
                    <item>C</item>
                </data>
            `);

            const xslt = xmlParser.xmlParse(`
                <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    <xsl:template match="data">
                        <ul>
                            <xsl:for-each select="item">
                                <li>Item {position()}: {.}</li>
                            </xsl:for-each>
                        </ul>
                    </xsl:template>
                </xsl:stylesheet>
            `);

            const result = await xsltClass.xsltProcess(xml, xslt);
            expect(result).toContain('<li>Item 1: A</li>');
            expect(result).toContain('<li>Item 2: B</li>');
            expect(result).toContain('<li>Item 3: C</li>');
        });

        it('should work with path expressions', async () => {
            const xml = xmlParser.xmlParse(`
                <data>
                    <person>
                        <name>John</name>
                        <age>30</age>
                    </person>
                </data>
            `);

            const xslt = xmlParser.xmlParse(`
                <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    <xsl:template match="data">
                        <p>{person/name} is {person/age} years old.</p>
                    </xsl:template>
                </xsl:stylesheet>
            `);

            const result = await xsltClass.xsltProcess(xml, xslt);
            expect(result).toContain('<p>John is 30 years old.</p>');
        });
    });

    describe('Error Handling', () => {
        it('should handle invalid XPath expressions gracefully', async () => {
            const xml = xmlParser.xmlParse(`<data/>`);

            const xslt = xmlParser.xmlParse(`
                <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    <xsl:template match="data">
                        <p>{invalid xpath :::: here}</p>
                    </xsl:template>
                </xsl:stylesheet>
            `);

            await expect(xsltClass.xsltProcess(xml, xslt)).rejects.toThrow();
        });
    });
});
