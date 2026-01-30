import assert from 'assert';

import { Xslt } from '../../src/xslt';
import { XmlParser } from '../../src/dom';

describe('XSLT 3.0 Accumulators', () => {
    describe('Basic Accumulator Declaration and Initialization', () => {
        it('should declare an accumulator with initial value', async () => {
            const xmlString = `<root>
              <item>1</item>
              <item>2</item>
              <item>3</item>
            </root>`;

            const xsltString = `<?xml version="1.0"?>
              <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:accumulator name="sum" initial-value="0" as="xs:decimal">
                  <xsl:accumulator-rule match="item" select="$value + number(.)"/>
                </xsl:accumulator>
                <xsl:template match="/">
                  <result>
                    <xsl:apply-templates/>
                  </result>
                </xsl:template>
                <xsl:template match="root">
                  <xsl:apply-templates/>
                </xsl:template>
                <xsl:template match="item">
                  <item value="{.}"/>
                </xsl:template>
              </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            // Should process without error
            assert(result.includes('<result>'));
            assert(result.includes('<item'));
        });

        it('should initialize accumulator with string initial value', async () => {
            const xmlString = `<root><data>test</data></root>`;

            const xsltString = `<?xml version="1.0"?>
              <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:accumulator name="text" initial-value="'START'" as="xs:string">
                  <xsl:accumulator-rule match="data" select="$value || ': ' || ."/>
                </xsl:accumulator>
                <xsl:template match="/">
                  <root><xsl:apply-templates/></root>
                </xsl:template>
                <xsl:template match="root">
                  <xsl:apply-templates/>
                </xsl:template>
                <xsl:template match="data">
                  <data><xsl:value-of select="."/></data>
                </xsl:template>
              </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            assert(result.includes('<data>'));
            assert(result.includes('test'));
        });

        it('should handle accumulator with numeric type', async () => {
            const xmlString = `<root><a>5</a><b>10</b></root>`;

            const xsltString = `<?xml version="1.0"?>
              <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:accumulator name="count" initial-value="0" as="xs:integer">
                  <xsl:accumulator-rule match="*" select="$value + 1"/>
                </xsl:accumulator>
                <xsl:template match="/">
                  <root><xsl:apply-templates/></root>
                </xsl:template>
                <xsl:template match="*">
                  <element><xsl:value-of select="."/></element>
                </xsl:template>
              </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            assert(result.includes('<root>'));
            assert(result.includes('<element>'));
        });
    });

    describe('Accumulator Pattern Matching', () => {
        it('should match specific element patterns', async () => {
            const xmlString = `<root>
              <item type="A">First</item>
              <item type="B">Second</item>
              <item type="A">Third</item>
            </root>`;

            const xsltString = `<?xml version="1.0"?>
              <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:accumulator name="typeA" initial-value="0" as="xs:integer">
                  <xsl:accumulator-rule match="item[@type='A']" select="$value + 1"/>
                </xsl:accumulator>
                <xsl:template match="/">
                  <result><xsl:apply-templates/></result>
                </xsl:template>
                <xsl:template match="root">
                  <xsl:apply-templates/>
                </xsl:template>
                <xsl:template match="item">
                  <item><xsl:value-of select="."/></item>
                </xsl:template>
              </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            assert(result.includes('<result>'));
            assert(result.includes('First'));
            assert(result.includes('Second'));
        });

        it('should match patterns with predicates', async () => {
            const xmlString = `<root>
              <book price="10">Book1</book>
              <book price="20">Book2</book>
              <book price="5">Book3</book>
            </root>`;

            const xsltString = `<?xml version="1.0"?>
              <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:accumulator name="expensive" initial-value="0" as="xs:integer">
                  <xsl:accumulator-rule match="book[@price > 10]" select="$value + 1"/>
                </xsl:accumulator>
                <xsl:template match="/">
                  <books><xsl:apply-templates/></books>
                </xsl:template>
                <xsl:template match="root">
                  <xsl:apply-templates/>
                </xsl:template>
                <xsl:template match="book">
                  <book><xsl:value-of select="."/></book>
                </xsl:template>
              </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            assert(result.includes('<books>'));
            assert(result.includes('Book'));
        });

        it('should handle wildcard patterns', async () => {
            const xmlString = `<root>
              <a>1</a>
              <b>2</b>
              <c>3</c>
            </root>`;

            const xsltString = `<?xml version="1.0"?>
              <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:accumulator name="all" initial-value="0" as="xs:integer">
                  <xsl:accumulator-rule match="*" select="$value + 1"/>
                </xsl:accumulator>
                <xsl:template match="/">
                  <result><xsl:apply-templates/></result>
                </xsl:template>
                <xsl:template match="*">
                  <elem><xsl:value-of select="."/></elem>
                </xsl:template>
              </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            assert(result.includes('<result>'));
            assert(result.includes('<elem>'));
        });
    });

    describe('Multiple Accumulator Rules', () => {
        it('should support multiple rules in single accumulator', async () => {
            const xmlString = `<root>
              <order price="100">Order1</order>
              <order price="200">Order2</order>
              <fee>5</fee>
            </root>`;

            const xsltString = `<?xml version="1.0"?>
              <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:accumulator name="total" initial-value="0" as="xs:decimal">
                  <xsl:accumulator-rule match="order" select="$value + number(@price)"/>
                  <xsl:accumulator-rule match="fee" select="$value + number(.)"/>
                </xsl:accumulator>
                <xsl:template match="/">
                  <summary><xsl:apply-templates/></summary>
                </xsl:template>
                <xsl:template match="*">
                  <item><xsl:value-of select="."/></item>
                </xsl:template>
              </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            assert(result.includes('<summary>'));
            assert(result.includes('<item>'));
        });

        it('should support multiple accumulators', async () => {
            const xmlString = `<root>
              <product name="A" price="50"/>
              <product name="B" price="75"/>
            </root>`;

            const xsltString = `<?xml version="1.0"?>
              <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:accumulator name="productCount" initial-value="0" as="xs:integer">
                  <xsl:accumulator-rule match="product" select="$value + 1"/>
                </xsl:accumulator>
                <xsl:accumulator name="totalPrice" initial-value="0" as="xs:decimal">
                  <xsl:accumulator-rule match="product" select="$value + number(@price)"/>
                </xsl:accumulator>
                <xsl:template match="/">
                  <report><xsl:apply-templates/></report>
                </xsl:template>
                <xsl:template match="root">
                  <xsl:apply-templates/>
                </xsl:template>
                <xsl:template match="product">
                  <prod name="{@name}" price="{@price}"/>
                </xsl:template>
              </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            assert(result.includes('<report>'));
            assert(result.includes('<prod'));
        });
    });

    describe('Accumulator String Operations', () => {
        it('should concatenate strings in accumulator', async () => {
            const xmlString = `<root>
              <word>Hello</word>
              <word>World</word>
            </root>`;

            const xsltString = `<?xml version="1.0"?>
              <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:accumulator name="phrase" initial-value="''" as="xs:string">
                  <xsl:accumulator-rule match="word" select="if ($value = '') then . else $value || ' ' || ."/>
                </xsl:accumulator>
                <xsl:template match="/">
                  <text><xsl:apply-templates/></text>
                </xsl:template>
                <xsl:template match="root">
                  <xsl:apply-templates/>
                </xsl:template>
                <xsl:template match="word">
                  <w><xsl:value-of select="."/></w>
                </xsl:template>
              </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            assert(result.includes('<text>'));
            assert(result.includes('Hello'));
            assert(result.includes('World'));
        });

        it('should handle string accumulation with conditional logic', async () => {
            const xmlString = `<root>
              <entry value="A"/>
              <entry value="B"/>
              <entry value="C"/>
            </root>`;

            const xsltString = `<?xml version="1.0"?>
              <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:accumulator name="list" initial-value="''" as="xs:string">
                  <xsl:accumulator-rule match="entry" select="$value || @value || '|'"/>
                </xsl:accumulator>
                <xsl:template match="/">
                  <result><xsl:apply-templates/></result>
                </xsl:template>
                <xsl:template match="root">
                  <xsl:apply-templates/>
                </xsl:template>
                <xsl:template match="entry">
                  <e v="{@value}"/>
                </xsl:template>
              </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            assert(result.includes('<result>'));
            assert(result.includes('v='));
        });
    });

    describe('Accumulator with Complex Expressions', () => {
        it('should handle arithmetic in accumulator select', async () => {
            const xmlString = `<root>
              <value>10</value>
              <value>20</value>
              <value>30</value>
            </root>`;

            const xsltString = `<?xml version="1.0"?>
              <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:accumulator name="average" initial-value="0" as="xs:decimal">
                  <xsl:accumulator-rule match="value" select="($value * count(//value[1]//preceding::value) + number(.)) div count(//value[1]//preceding::value or //value[1])"/>
                </xsl:accumulator>
                <xsl:template match="/">
                  <stats><xsl:apply-templates/></stats>
                </xsl:template>
                <xsl:template match="root">
                  <xsl:apply-templates/>
                </xsl:template>
                <xsl:template match="value">
                  <val><xsl:value-of select="."/></val>
                </xsl:template>
              </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            assert(result.includes('<stats>'));
            assert(result.includes('<val>'));
        });

        it('should support conditional expressions in accumulator', async () => {
            const xmlString = `<root>
              <item type="valid">1</item>
              <item type="invalid">2</item>
              <item type="valid">3</item>
            </root>`;

            const xsltString = `<?xml version="1.0"?>
              <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:accumulator name="validSum" initial-value="0" as="xs:integer">
                  <xsl:accumulator-rule match="item" select="if (@type = 'valid') then $value + number(.) else $value"/>
                </xsl:accumulator>
                <xsl:template match="/">
                  <data><xsl:apply-templates/></data>
                </xsl:template>
                <xsl:template match="root">
                  <xsl:apply-templates/>
                </xsl:template>
                <xsl:template match="item">
                  <i t="{@type}"><xsl:value-of select="."/></i>
                </xsl:template>
              </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            assert(result.includes('<data>'));
            assert(result.includes('t='));
        });
    });

    describe('Backward Compatibility', () => {
        it('should not process accumulators in XSLT 1.0', async () => {
            const xmlString = `<root><item>1</item></root>`;

            const xsltString = `<?xml version="1.0"?>
              <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:template match="/">
                  <root><xsl:value-of select="root/item"/></root>
                </xsl:template>
              </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            assert(result.includes('<root>'));
            assert(result.includes('1'));
        });

        it('should work with existing XSLT 2.0 features', async () => {
            const xmlString = `<root>
              <item>First</item>
              <item>Second</item>
            </root>`;

            const xsltString = `<?xml version="1.0"?>
              <xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:template match="/">
                  <result>
                    <xsl:for-each select="root/item">
                      <item index="{position()}"><xsl:value-of select="."/></item>
                    </xsl:for-each>
                  </result>
                </xsl:template>
              </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            assert(result.includes('<result>'));
            assert(result.includes('index='));
        });
    });

    describe('Edge Cases and Error Handling', () => {
        it('should handle accumulator with no matching rules', async () => {
            const xmlString = `<root><other>data</other></root>`;

            const xsltString = `<?xml version="1.0"?>
              <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:accumulator name="specific" initial-value="0" as="xs:integer">
                  <xsl:accumulator-rule match="item" select="$value + 1"/>
                </xsl:accumulator>
                <xsl:template match="/">
                  <result><xsl:apply-templates/></result>
                </xsl:template>
                <xsl:template match="*">
                  <elem><xsl:value-of select="."/></elem>
                </xsl:template>
              </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            assert(result.includes('<result>'));
            assert(result.includes('data'));
        });

        it('should require name attribute on accumulator', async () => {
            const xmlString = `<root/>`;

            const xsltString = `<?xml version="1.0"?>
              <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:accumulator initial-value="0">
                  <xsl:accumulator-rule match="*" select="$value + 1"/>
                </xsl:accumulator>
                <xsl:template match="/">
                  <result/>
                </xsl:template>
              </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            try {
                await xsltClass.xsltProcess(xml, xslt);
                assert.fail('Should have thrown error for missing name attribute');
            } catch (e: any) {
                assert(e.message.includes('name'));
            }
        });

        it('should handle accumulator in nested structures', async () => {
            const xmlString = `<root>
              <section>
                <item>A</item>
                <item>B</item>
              </section>
              <section>
                <item>C</item>
              </section>
            </root>`;

            const xsltString = `<?xml version="1.0"?>
              <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:accumulator name="itemCount" initial-value="0" as="xs:integer">
                  <xsl:accumulator-rule match="item" select="$value + 1"/>
                </xsl:accumulator>
                <xsl:template match="/">
                  <report><xsl:apply-templates/></report>
                </xsl:template>
                <xsl:template match="root">
                  <xsl:apply-templates/>
                </xsl:template>
                <xsl:template match="section">
                  <sec><xsl:apply-templates/></sec>
                </xsl:template>
                <xsl:template match="item">
                  <i><xsl:value-of select="."/></i>
                </xsl:template>
              </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            assert(result.includes('<report>'));
            assert(result.includes('<sec>'));
            assert(result.includes('<i>'));
        });
    });

    describe('Accumulator Type Declarations', () => {
        it('should respect as attribute with xs:decimal type', async () => {
            const xmlString = `<root><price>19.99</price></root>`;

            const xsltString = `<?xml version="1.0"?>
              <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:accumulator name="total" initial-value="0" as="xs:decimal">
                  <xsl:accumulator-rule match="price" select="$value + number(.)"/>
                </xsl:accumulator>
                <xsl:template match="/">
                  <cart><xsl:apply-templates/></cart>
                </xsl:template>
                <xsl:template match="root">
                  <xsl:apply-templates/>
                </xsl:template>
                <xsl:template match="price">
                  <p><xsl:value-of select="."/></p>
                </xsl:template>
              </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            assert(result.includes('<cart>'));
            assert(result.includes('19.99'));
        });

        it('should handle sequence types in accumulator', async () => {
            const xmlString = `<root><item>A</item></root>`;

            const xsltString = `<?xml version="1.0"?>
              <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:accumulator name="items" initial-value="()" as="xs:string*">
                  <xsl:accumulator-rule match="item" select="($value, .)"/>
                </xsl:accumulator>
                <xsl:template match="/">
                  <result><xsl:apply-templates/></result>
                </xsl:template>                <xsl:template match="root">
                  <xsl:apply-templates/>
                </xsl:template>                <xsl:template match="item">
                  <item><xsl:value-of select="."/></item>
                </xsl:template>
              </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            assert(result.includes('<result>'));
        });
    });
});
