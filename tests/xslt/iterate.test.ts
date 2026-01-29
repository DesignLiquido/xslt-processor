import assert from 'assert';

import { XmlParser } from "../../src/dom";
import { Xslt } from "../../src/xslt";

describe('xsl:iterate (XSLT 3.0)', () => {
    const xsltClass = new Xslt();
    const xmlParser = new XmlParser();

    describe('Basic Iteration', () => {
        it('should iterate over a node sequence and output values', async () => {
            const xmlString = `<root>
                <n>1</n>
                <n>2</n>
                <n>3</n>
            </root>`;

            const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml" omit-xml-declaration="yes"/>
                <xsl:template match="/">
                    <result>
                        <xsl:iterate select="//n">
                            <xsl:param name="sum" select="0"/>
                            <item><xsl:value-of select="."/></item>
                            <xsl:next-iteration>
                                <xsl:with-param name="sum" select="$sum + number(.)"/>
                            </xsl:next-iteration>
                        </xsl:iterate>
                    </result>
                </xsl:template>
            </xsl:stylesheet>`;

            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            // Should iterate through items outputting values
            assert(result.includes('<item>1</item>'), `Expected to find '<item>1</item>', got: ${result}`);
            assert(result.includes('<item>3</item>'), `Expected to find '<item>3</item>', got: ${result}`);
        });

        it('should process on-completion after iteration finishes', async () => {
            const xmlString = `<root>
                <n>1</n>
                <n>2</n>
                <n>3</n>
            </root>`;

            const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml" omit-xml-declaration="yes"/>
                <xsl:template match="/">
                    <result>
                        <xsl:iterate select="//n">
                            <xsl:param name="count" select="0"/>
                            <xsl:next-iteration>
                                <xsl:with-param name="count" select="$count + 1"/>
                            </xsl:next-iteration>
                            <xsl:on-completion>
                                <final><xsl:value-of select="$count"/></final>
                            </xsl:on-completion>
                        </xsl:iterate>
                    </result>
                </xsl:template>
            </xsl:stylesheet>`;

            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            // Should contain final count of 3
            assert(result.includes('<final>3</final>'), `Expected to find '<final>3</final>', got: ${result}`);
        });
    });

    describe('Accumulator Operations', () => {
        it('should accumulate sum across iterations', async () => {
            const xmlString = `<root>
                <n>2</n>
                <n>3</n>
                <n>5</n>
            </root>`;

            const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml" omit-xml-declaration="yes"/>
                <xsl:template match="/">
                    <result>
                        <xsl:iterate select="//n">
                            <xsl:param name="total" select="0"/>
                            <xsl:next-iteration>
                                <xsl:with-param name="total" select="$total + number(.)"/>
                            </xsl:next-iteration>
                            <xsl:on-completion>
                                <sum><xsl:value-of select="$total"/></sum>
                            </xsl:on-completion>
                        </xsl:iterate>
                    </result>
                </xsl:template>
            </xsl:stylesheet>`;

            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            // Sum should be 10
            assert(result.includes('<sum>10</sum>'), `Expected to find '<sum>10</sum>', got: ${result}`);
        });

        it('should handle string concatenation in accumulator', async () => {
            const xmlString = `<root>
                <c>a</c>
                <c>b</c>
                <c>c</c>
            </root>`;

            const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml" omit-xml-declaration="yes"/>
                <xsl:template match="/">
                    <result>
                        <xsl:iterate select="//c">
                            <xsl:param name="concat" select="''"/>
                            <xsl:next-iteration>
                                <xsl:with-param name="concat" select="$concat || ."/>
                            </xsl:next-iteration>
                            <xsl:on-completion>
                                <value><xsl:value-of select="$concat"/></value>
                            </xsl:on-completion>
                        </xsl:iterate>
                    </result>
                </xsl:template>
            </xsl:stylesheet>`;

            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            // Should concatenate to 'abc'
            assert(result.includes('<value>abc</value>'), `Expected to find '<value>abc</value>', got: ${result}`);
        });
    });

    describe('Multiple Accumulators', () => {
        it('should support multiple iteration parameters', async () => {
            const xmlString = `<root>
                <v>1</v>
                <v>2</v>
                <v>3</v>
                <v>4</v>
            </root>`;

            const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml" omit-xml-declaration="yes"/>
                <xsl:template match="/">
                    <result>
                        <xsl:iterate select="//v">
                            <xsl:param name="sum" select="0"/>
                            <xsl:param name="count" select="0"/>
                            <xsl:next-iteration>
                                <xsl:with-param name="sum" select="$sum + number(.)"/>
                                <xsl:with-param name="count" select="$count + 1"/>
                            </xsl:next-iteration>
                            <xsl:on-completion>
                                <stats>
                                    <total><xsl:value-of select="$sum"/></total>
                                    <items><xsl:value-of select="$count"/></items>
                                </stats>
                            </xsl:on-completion>
                        </xsl:iterate>
                    </result>
                </xsl:template>
            </xsl:stylesheet>`;

            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            // Should have sum=10 and count=4
            assert(result.includes('<total>10</total>'), `Expected to find '<total>10</total>', got: ${result}`);
            assert(result.includes('<items>4</items>'), `Expected to find '<items>4</items>', got: ${result}`);
        });
    });

    describe('Complex Iteration Scenarios', () => {
        it('should iterate over node sequences and calculate product', async () => {
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
                        <xsl:iterate select="//item">
                            <xsl:param name="prod" select="1"/>
                            <node><xsl:value-of select="."/></node>
                            <xsl:next-iteration>
                                <xsl:with-param name="prod" select="$prod * number(.)"/>
                            </xsl:next-iteration>
                            <xsl:on-completion>
                                <product><xsl:value-of select="$prod"/></product>
                            </xsl:on-completion>
                        </xsl:iterate>
                    </result>
                </xsl:template>
            </xsl:stylesheet>`;

            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            // Product should be 1*2*3 = 6
            assert(result.includes('<product>6</product>'), `Expected to find '<product>6</product>', got: ${result}`);
        });

        it('should accumulate value without iteration body output', async () => {
            const xmlString = `<root>
                <v>1</v>
                <v>2</v>
                <v>3</v>
            </root>`;

            const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml" omit-xml-declaration="yes"/>
                <xsl:template match="/">
                    <result>
                        <xsl:iterate select="//v">
                            <xsl:param name="n" select="0"/>
                            <xsl:next-iteration>
                                <xsl:with-param name="n" select="$n + number(.)"/>
                            </xsl:next-iteration>
                            <xsl:on-completion>
                                <final><xsl:value-of select="$n"/></final>
                            </xsl:on-completion>
                        </xsl:iterate>
                    </result>
                </xsl:template>
            </xsl:stylesheet>`;

            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            // Should have completion output but no iteration body items
            assert(result.includes('<final>6</final>'), `Expected to find '<final>6</final>', got: ${result}`);
        });
    });

    describe('Error Handling', () => {
        it('should work without on-completion element', async () => {
            const xmlString = `<root>
                <n>1</n>
                <n>2</n>
            </root>`;

            const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml" omit-xml-declaration="yes"/>
                <xsl:template match="/">
                    <result>
                        <xsl:iterate select="//n">
                            <xsl:param name="x" select="0"/>
                            <item><xsl:value-of select="."/></item>
                            <xsl:next-iteration>
                                <xsl:with-param name="x" select="$x + 1"/>
                            </xsl:next-iteration>
                        </xsl:iterate>
                    </result>
                </xsl:template>
            </xsl:stylesheet>`;

            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            // This should work - iterate can work without on-completion
            const result = await xsltClass.xsltProcess(xml, xslt);
            assert(result.includes('result'), `Expected result element in: ${result}`);
        });
    });
});
