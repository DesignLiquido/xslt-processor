import assert from 'assert';

import { XmlParser } from "../../src/dom";
import { Xslt } from "../../src/xslt";

describe('xsl:for-each-group (XSLT 2.0)', () => {
    describe('group-by', () => {
        it('should group items by a key expression', async () => {
            const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
            <employees>
                <employee><name>Alice</name><dept>Engineering</dept></employee>
                <employee><name>Bob</name><dept>Sales</dept></employee>
                <employee><name>Carol</name><dept>Engineering</dept></employee>
                <employee><name>Dave</name><dept>Sales</dept></employee>
                <employee><name>Eve</name><dept>Engineering</dept></employee>
            </employees>`;

            const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml" omit-xml-declaration="yes"/>
                <xsl:template match="/">
                    <result>
                        <xsl:for-each-group select="//employee" group-by="dept">
                            <department name="{current-grouping-key()}">
                                <xsl:for-each select="current-group()">
                                    <member><xsl:value-of select="name"/></member>
                                </xsl:for-each>
                            </department>
                        </xsl:for-each-group>
                    </result>
                </xsl:template>
            </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            const outXmlString = await xsltClass.xsltProcess(xml, xslt);

            // Engineering appears first in document order, so it should be first
            assert.ok(outXmlString.includes('<department name="Engineering">'));
            assert.ok(outXmlString.includes('<department name="Sales">'));
            // Engineering group should have Alice, Carol, Eve
            assert.ok(outXmlString.includes('<member>Alice</member>'));
            assert.ok(outXmlString.includes('<member>Carol</member>'));
            assert.ok(outXmlString.includes('<member>Eve</member>'));
            // Sales group should have Bob, Dave
            assert.ok(outXmlString.includes('<member>Bob</member>'));
            assert.ok(outXmlString.includes('<member>Dave</member>'));
        });

        it('should handle numeric grouping keys', async () => {
            const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
            <items>
                <item><name>A</name><category>1</category></item>
                <item><name>B</name><category>2</category></item>
                <item><name>C</name><category>1</category></item>
                <item><name>D</name><category>2</category></item>
            </items>`;

            const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml" omit-xml-declaration="yes"/>
                <xsl:template match="/">
                    <result>
                        <xsl:for-each-group select="//item" group-by="category">
                            <group key="{current-grouping-key()}" count="{count(current-group())}"/>
                        </xsl:for-each-group>
                    </result>
                </xsl:template>
            </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            const outXmlString = await xsltClass.xsltProcess(xml, xslt);

            assert.ok(outXmlString.includes('<group key="1" count="2"/>'));
            assert.ok(outXmlString.includes('<group key="2" count="2"/>'));
        });

        it('should handle empty groups gracefully', async () => {
            const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
            <items></items>`;

            const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml" omit-xml-declaration="yes"/>
                <xsl:template match="/">
                    <result>
                        <xsl:for-each-group select="//item" group-by="category">
                            <group key="{current-grouping-key()}"/>
                        </xsl:for-each-group>
                    </result>
                </xsl:template>
            </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            const outXmlString = await xsltClass.xsltProcess(xml, xslt);

            // <result/> and <result></result> are semantically equivalent
            assert.ok(outXmlString === '<result/>' || outXmlString === '<result></result>');
        });
    });

    describe('group-adjacent', () => {
        it('should group adjacent items with the same key', async () => {
            const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
            <log>
                <entry level="INFO">Starting</entry>
                <entry level="INFO">Processing</entry>
                <entry level="ERROR">Failed</entry>
                <entry level="ERROR">Retrying</entry>
                <entry level="INFO">Recovered</entry>
            </log>`;

            const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml" omit-xml-declaration="yes"/>
                <xsl:template match="/">
                    <result>
                        <xsl:for-each-group select="//entry" group-adjacent="@level">
                            <block level="{current-grouping-key()}" count="{count(current-group())}">
                                <xsl:for-each select="current-group()">
                                    <msg><xsl:value-of select="."/></msg>
                                </xsl:for-each>
                            </block>
                        </xsl:for-each-group>
                    </result>
                </xsl:template>
            </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            const outXmlString = await xsltClass.xsltProcess(xml, xslt);

            // Should create 3 blocks: INFO(2), ERROR(2), INFO(1)
            assert.ok(outXmlString.includes('<block level="INFO" count="2">'));
            assert.ok(outXmlString.includes('<block level="ERROR" count="2">'));
            assert.ok(outXmlString.includes('<block level="INFO" count="1">'));
            assert.ok(outXmlString.includes('<msg>Starting</msg>'));
            assert.ok(outXmlString.includes('<msg>Failed</msg>'));
            assert.ok(outXmlString.includes('<msg>Recovered</msg>'));
        });

        it('should create separate groups for non-adjacent items with same key', async () => {
            const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
            <items>
                <item type="A">1</item>
                <item type="B">2</item>
                <item type="A">3</item>
            </items>`;

            const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml" omit-xml-declaration="yes"/>
                <xsl:template match="/">
                    <result>
                        <xsl:for-each-group select="//item" group-adjacent="@type">
                            <group key="{current-grouping-key()}">
                                <xsl:for-each select="current-group()">
                                    <val><xsl:value-of select="."/></val>
                                </xsl:for-each>
                            </group>
                        </xsl:for-each-group>
                    </result>
                </xsl:template>
            </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            const outXmlString = await xsltClass.xsltProcess(xml, xslt);

            // Should create 3 groups: A(1), B(2), A(3) - not merged
            assert.equal(outXmlString, '<result><group key="A"><val>1</val></group><group key="B"><val>2</val></group><group key="A"><val>3</val></group></result>');
        });
    });

    describe('group-starting-with', () => {
        it('should start new groups when pattern matches', async () => {
            const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
            <document>
                <h1>Chapter 1</h1>
                <p>Intro paragraph</p>
                <p>More content</p>
                <h1>Chapter 2</h1>
                <p>Another intro</p>
                <h1>Chapter 3</h1>
            </document>`;

            const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml" omit-xml-declaration="yes"/>
                <xsl:template match="/">
                    <result>
                        <xsl:for-each-group select="//document/*" group-starting-with="h1">
                            <chapter>
                                <title><xsl:value-of select="current-group()[1]"/></title>
                                <content-count><xsl:value-of select="count(current-group()) - 1"/></content-count>
                            </chapter>
                        </xsl:for-each-group>
                    </result>
                </xsl:template>
            </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            const outXmlString = await xsltClass.xsltProcess(xml, xslt);

            assert.ok(outXmlString.includes('<title>Chapter 1</title>'));
            assert.ok(outXmlString.includes('<content-count>2</content-count>')); // 2 paragraphs
            assert.ok(outXmlString.includes('<title>Chapter 2</title>'));
            assert.ok(outXmlString.includes('<content-count>1</content-count>')); // 1 paragraph
            assert.ok(outXmlString.includes('<title>Chapter 3</title>'));
            assert.ok(outXmlString.includes('<content-count>0</content-count>')); // no paragraphs
        });

        it('should handle items before first match as initial group', async () => {
            const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
            <doc>
                <p>Preamble 1</p>
                <p>Preamble 2</p>
                <section>Section 1</section>
                <p>Content 1</p>
                <section>Section 2</section>
            </doc>`;

            const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml" omit-xml-declaration="yes"/>
                <xsl:template match="/">
                    <result>
                        <xsl:for-each-group select="//doc/*" group-starting-with="section">
                            <group count="{count(current-group())}">
                                <xsl:for-each select="current-group()">
                                    <item><xsl:value-of select="local-name()"/></item>
                                </xsl:for-each>
                            </group>
                        </xsl:for-each-group>
                    </result>
                </xsl:template>
            </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            const outXmlString = await xsltClass.xsltProcess(xml, xslt);

            // First group is preamble (2 items), then section groups
            assert.ok(outXmlString.includes('<group count="2">'));
            assert.ok(outXmlString.includes('<item>p</item>'));
            assert.ok(outXmlString.includes('<item>section</item>'));
        });
    });

    describe('group-ending-with', () => {
        it('should end groups when pattern matches', async () => {
            const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
            <doc>
                <p>Content 1</p>
                <p>Content 2</p>
                <br/>
                <p>Content 3</p>
                <br/>
                <p>Content 4</p>
            </doc>`;

            const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml" omit-xml-declaration="yes"/>
                <xsl:template match="/">
                    <result>
                        <xsl:for-each-group select="//doc/*" group-ending-with="br">
                            <paragraph count="{count(current-group())}"/>
                        </xsl:for-each-group>
                    </result>
                </xsl:template>
            </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            const outXmlString = await xsltClass.xsltProcess(xml, xslt);

            // Groups: [p, p, br], [p, br], [p]
            assert.ok(outXmlString.includes('<paragraph count="3"/>'));
            assert.ok(outXmlString.includes('<paragraph count="2"/>'));
            assert.ok(outXmlString.includes('<paragraph count="1"/>'));
        });

        it('should handle items after last match as final group', async () => {
            const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
            <items>
                <item>1</item>
                <end/>
                <item>2</item>
                <item>3</item>
                <item>4</item>
            </items>`;

            const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml" omit-xml-declaration="yes"/>
                <xsl:template match="/">
                    <result>
                        <xsl:for-each-group select="//items/*" group-ending-with="end">
                            <group>
                                <xsl:for-each select="current-group()">
                                    <n><xsl:value-of select="local-name()"/></n>
                                </xsl:for-each>
                            </group>
                        </xsl:for-each-group>
                    </result>
                </xsl:template>
            </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            const outXmlString = await xsltClass.xsltProcess(xml, xslt);

            // Groups: [item, end], [item, item, item]
            assert.ok(outXmlString.includes('<n>item</n><n>end</n>'));
            assert.ok(outXmlString.includes('<n>item</n><n>item</n><n>item</n>'));
        });
    });

    describe('current-group() function', () => {
        it('should return empty sequence outside for-each-group', async () => {
            const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
            <root><item>test</item></root>`;

            const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml" omit-xml-declaration="yes"/>
                <xsl:template match="/">
                    <result count="{count(current-group())}"/>
                </xsl:template>
            </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            const outXmlString = await xsltClass.xsltProcess(xml, xslt);

            assert.equal(outXmlString, '<result count="0"/>');
        });

        it('should allow iteration over current-group() items', async () => {
            const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
            <data>
                <num cat="odd">1</num>
                <num cat="even">2</num>
                <num cat="odd">3</num>
                <num cat="even">4</num>
            </data>`;

            const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml" omit-xml-declaration="yes"/>
                <xsl:template match="/">
                    <result>
                        <xsl:for-each-group select="//num" group-by="@cat">
                            <sum key="{current-grouping-key()}">
                                <xsl:value-of select="sum(current-group())"/>
                            </sum>
                        </xsl:for-each-group>
                    </result>
                </xsl:template>
            </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            const outXmlString = await xsltClass.xsltProcess(xml, xslt);

            // odd: 1+3=4, even: 2+4=6
            assert.ok(outXmlString.includes('<sum key="odd">4</sum>'));
            assert.ok(outXmlString.includes('<sum key="even">6</sum>'));
        });
    });

    describe('current-grouping-key() function', () => {
        it('should return empty string outside for-each-group', async () => {
            const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
            <root><item>test</item></root>`;

            const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml" omit-xml-declaration="yes"/>
                <xsl:template match="/">
                    <result key="{current-grouping-key()}"/>
                </xsl:template>
            </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            const outXmlString = await xsltClass.xsltProcess(xml, xslt);

            assert.equal(outXmlString, '<result key=""/>');
        });
    });

    describe('error handling', () => {
        it('should throw error for missing select attribute', async () => {
            const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
            <root><item>test</item></root>`;

            const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml" omit-xml-declaration="yes"/>
                <xsl:template match="/">
                    <xsl:for-each-group group-by="@type">
                        <group/>
                    </xsl:for-each-group>
                </xsl:template>
            </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            await assert.rejects(
                async () => await xsltClass.xsltProcess(xml, xslt),
                /select attribute/
            );
        });

        it('should throw error for missing grouping attribute', async () => {
            const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
            <root><item>test</item></root>`;

            const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml" omit-xml-declaration="yes"/>
                <xsl:template match="/">
                    <xsl:for-each-group select="//item">
                        <group/>
                    </xsl:for-each-group>
                </xsl:template>
            </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            await assert.rejects(
                async () => await xsltClass.xsltProcess(xml, xslt),
                /requires one of.*group-by/
            );
        });
    });
});
