import assert from 'assert';

import { XmlParser } from "../../src/dom";
import { Xslt } from "../../src/xslt";

describe('xsl:evaluate (XSLT 3.0)', () => {
    const xsltClass = new Xslt();
    const xmlParser = new XmlParser();

    describe('Basic Evaluation', () => {
        it('should evaluate a simple XPath expression', async () => {
            const xmlString = `<root>
                <value>42</value>
            </root>`;

            const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml" omit-xml-declaration="yes"/>
                <xsl:template match="/">
                    <result>
                        <xsl:evaluate xpath="'//value'"/>
                    </result>
                </xsl:template>
            </xsl:stylesheet>`;

            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            assert(result.includes('42'), `Expected to find '42', got: ${result}`);
        });

        it('should evaluate numeric expressions', async () => {
            const xmlString = `<root><value>10</value></root>`;

            const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml" omit-xml-declaration="yes"/>
                <xsl:template match="/">
                    <result>
                        <xsl:evaluate xpath="2 + 3"/>
                    </result>
                </xsl:template>
            </xsl:stylesheet>`;

            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            assert(result.includes('5'), `Expected to find '5', got: ${result}`);
        });

        it('should evaluate string expressions', async () => {
            const xmlString = `<root/>`;

            const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml" omit-xml-declaration="yes"/>
                <xsl:template match="/">
                    <result>
                        <xsl:evaluate xpath="'concat(&quot;Hello&quot;, &quot; &quot;, &quot;World&quot;)'"/>
                    </result>
                </xsl:template>
            </xsl:stylesheet>`;

            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            assert(result.includes('Hello World'), `Expected to find 'Hello World', got: ${result}`);
        });
    });

    describe('Dynamic XPath Construction', () => {
        it('should use variables in the xpath attribute', async () => {
            const xmlString = `<root>
                <item value="test1"/>
                <item value="test2"/>
            </root>`;

            const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml" omit-xml-declaration="yes"/>
                <xsl:template match="/">
                    <xsl:variable name="element-name" select="'item'"/>
                    <result>
                        <xsl:evaluate xpath="'//' || $element-name"/>
                    </result>
                </xsl:template>
            </xsl:stylesheet>`;

            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            assert(result.includes('test1'), `Expected to find 'test1', got: ${result}`);
            assert(result.includes('test2'), `Expected to find 'test2', got: ${result}`);
        });

        it('should handle complex concatenation expressions', async () => {
            const xmlString = `<root>
                <div1><p>Paragraph 1</p></div1>
                <div2><p>Paragraph 2</p></div2>
            </root>`;

            const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml" omit-xml-declaration="yes"/>
                <xsl:template match="/">
                    <xsl:variable name="elem" select="'div'"/>
                    <xsl:variable name="idx" select="'1'"/>
                    <result>
                        <xsl:evaluate xpath="'//' || $elem || $idx || '/p/text()'"/>
                    </result>
                </xsl:template>
            </xsl:stylesheet>`;

            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            assert(result.includes('Paragraph 1'), `Expected to find 'Paragraph 1', got: ${result}`);
        });
    });

    describe('Context Item Handling', () => {
        it('should respect context-item attribute', async () => {
            const xmlString = `<root>
                <section>
                    <heading>Section 1</heading>
                    <content>Content 1</content>
                </section>
                <section>
                    <heading>Section 2</heading>
                    <content>Content 2</content>
                </section>
            </root>`;

            const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml" omit-xml-declaration="yes"/>
                <xsl:template match="/">
                    <result>
                        <xsl:for-each select="//section">
                            <section>
                                <xsl:evaluate xpath="'heading/text()'" context-item="."/>
                            </section>
                        </xsl:for-each>
                    </result>
                </xsl:template>
            </xsl:stylesheet>`;

            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            assert(result.includes('Section 1'), `Expected to find 'Section 1', got: ${result}`);
            assert(result.includes('Section 2'), `Expected to find 'Section 2', got: ${result}`);
        });

        it('should use current context when context-item is not specified', async () => {
            const xmlString = `<root>
                <items>
                    <item>Item 1</item>
                    <item>Item 2</item>
                </items>
            </root>`;

            const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml" omit-xml-declaration="yes"/>
                <xsl:template match="/">
                    <result>
                        <xsl:for-each select="//items">
                            <xsl:evaluate xpath="'./item/text()'"/>
                        </xsl:for-each>
                    </result>
                </xsl:template>
            </xsl:stylesheet>`;

            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            assert(result.includes('Item 1'), `Expected to find 'Item 1', got: ${result}`);
            assert(result.includes('Item 2'), `Expected to find 'Item 2', got: ${result}`);
        });
    });

    describe('Function Calls', () => {
        it('should evaluate XPath functions dynamically', async () => {
            const xmlString = `<root>
                <value>123</value>
            </root>`;

            const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml" omit-xml-declaration="yes"/>
                <xsl:template match="/">
                    <xsl:variable name="xpath-expr" select="'//value/text()'"/>
                    <result>
                        <xsl:evaluate xpath="$xpath-expr"/>
                    </result>
                </xsl:template>
            </xsl:stylesheet>`;

            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            assert(result.includes('123'), `Expected to find '123', got: ${result}`);
        });
    });

    describe('Complex XPath Expressions', () => {
        it('should evaluate complex predicates', async () => {
            const xmlString = `<root>
                <item id="1">First</item>
                <item id="2">Second</item>
                <item id="3">Third</item>
            </root>`;

            const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml" omit-xml-declaration="yes"/>
                <xsl:template match="/">
                    <xsl:variable name="id" select="2"/>
                    <result>
                        <xsl:evaluate xpath="'//item[@id = $id]/text()'"/>
                    </result>
                </xsl:template>
            </xsl:stylesheet>`;

            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            assert(result.includes('Second'), `Expected to find 'Second', got: ${result}`);
        });

        it('should evaluate count expressions', async () => {
            const xmlString = `<root>
                <item>1</item>
                <item>2</item>
                <item>3</item>
            </root>`;

            const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml" omit-xml-declaration="yes"/>
                <xsl:template match="/">
                    <result>
                        <xsl:evaluate xpath="'count(//item)'"/>
                    </result>
                </xsl:template>
            </xsl:stylesheet>`;

            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            assert(result.includes('3'), `Expected to find '3', got: ${result}`);
        });
    });

    describe('Error Handling', () => {
        it('should throw error if xpath attribute is missing', async () => {
            const xmlString = `<root/>`;

            const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml" omit-xml-declaration="yes"/>
                <xsl:template match="/">
                    <result>
                        <xsl:evaluate/>
                    </result>
                </xsl:template>
            </xsl:stylesheet>`;

            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            try {
                await xsltClass.xsltProcess(xml, xslt);
                assert.fail('Expected error for missing xpath attribute');
            } catch (error: any) {
                assert(error.message.includes('requires an xpath attribute'), 
                    `Expected error about xpath attribute, got: ${error.message}`);
            }
        });

        it('should handle malformed XPath expressions gracefully', async () => {
            const xmlString = `<root/>`;

            const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml" omit-xml-declaration="yes"/>
                <xsl:template match="/">
                    <result>
                        <xsl:evaluate xpath="'//['"/>
                    </result>
                </xsl:template>
            </xsl:stylesheet>`;

            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            try {
                await xsltClass.xsltProcess(xml, xslt);
                assert.fail('Expected error for malformed XPath');
            } catch (error: any) {
                assert(error.message.toLowerCase().includes('error'), 
                    `Expected error message, got: ${error.message}`);
            }
        });
    });

    describe('Integration with Variables', () => {
        it('should evaluate XPath with variables from stylesheet scope', async () => {
            const xmlString = `<root>
                <value>100</value>
            </root>`;

            const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml" omit-xml-declaration="yes"/>
                <xsl:template match="/">
                    <xsl:variable name="base" select="10"/>
                    <xsl:variable name="multiplier" select="5"/>
                    <result>
                        <xsl:evaluate xpath="'$base * $multiplier'"/>
                    </result>
                </xsl:template>
            </xsl:stylesheet>`;

            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            assert(result.includes('50'), `Expected to find '50', got: ${result}`);
        });
    });

    describe('Empty and Edge Cases', () => {
        it('should handle empty expression results', async () => {
            const xmlString = `<root/>`;

            const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml" omit-xml-declaration="yes"/>
                <xsl:template match="/">
                    <result>
                        <xsl:evaluate xpath="'()'"/>
                    </result>
                </xsl:template>
            </xsl:stylesheet>`;

            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            assert(result.includes('<result'), `Expected result element, got: ${result}`);
        });
    });
});
