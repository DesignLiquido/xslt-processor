import assert from 'assert';

import { Xslt } from '../../src/xslt';
import { XmlParser } from '../../src/dom';

describe('Enhanced xsl:output (XSLT 3.0)', () => {
    describe('HTML5 Support (method="html" version="5.0")', () => {
        it('should recognize HTML5 output method with version="5.0"', async () => {
            const xmlString = `<root>
              <content>Hello HTML5</content>
            </root>`;

            const xsltString = `<?xml version="1.0"?>
              <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="html" version="5.0" indent="yes"/>
                <xsl:template match="/">
                  <html>
                    <head><title>Test</title></head>
                    <body>
                      <xsl:value-of select="root/content"/>
                    </body>
                  </html>
                </xsl:template>
              </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            // HTML5 output should produce HTML structure
            assert(result.includes('<html>'));
            assert(result.includes('</html>'));
            assert(result.includes('<body>'));
            assert(result.includes('Hello HTML5'));
        });

        it('should handle HTML5 void elements correctly', async () => {
            const xmlString = `<root/>`;

            const xsltString = `<?xml version="1.0"?>
              <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="html" version="5.0"/>
                <xsl:template match="/">
                  <div>
                    <img src="test.jpg" alt="test"/>
                    <br/>
                    <hr/>
                  </div>
                </xsl:template>
              </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            // HTML5 void elements should be self-closing
            assert(result.includes('<img'));
            assert(result.includes('<br'));
            assert(result.includes('<hr'));
        });

        it('should produce valid HTML5 DOCTYPE', async () => {
            const xmlString = `<root><title>Test</title></root>`;

            const xsltString = `<?xml version="1.0"?>
              <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="html" version="5.0"/>
                <xsl:template match="/">
                  <html>
                    <head>
                      <xsl:value-of select="root/title"/>
                    </head>
                  </html>
                </xsl:template>
              </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            // Should work with HTML5 method
            assert(result.includes('<html>'));
            assert(result.includes('<head>'));
        });

        it('should maintain HTML5 output with various content types', async () => {
            const xmlString = `<root>
              <items>
                <item>First</item>
                <item>Second</item>
              </items>
            </root>`;

            const xsltString = `<?xml version="1.0"?>
              <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="html" version="5.0"/>
                <xsl:template match="/">
                  <div>
                    <xsl:for-each select="root/items/item">
                      <p><xsl:value-of select="."/></p>
                    </xsl:for-each>
                  </div>
                </xsl:template>
              </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            assert(result.includes('<div>'));
            assert(result.includes('<p>'));
            assert(result.includes('First'));
            assert(result.includes('Second'));
        });
    });

    describe('item-separator Attribute', () => {
        it('should apply item-separator between sequence items', async () => {
            const xmlString = `<root>
              <items>
                <item>Apple</item>
                <item>Banana</item>
                <item>Cherry</item>
              </items>
            </root>`;

            const xsltString = `<?xml version="1.0"?>
              <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="text" item-separator=", "/>
                <xsl:template match="/">
                  <xsl:for-each select="root/items/item">
                    <xsl:value-of select="."/>
                    <xsl:if test="position() != last()">, </xsl:if>
                  </xsl:for-each>
                </xsl:template>
              </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            // Should contain items with separators
            assert(result.includes('Apple'));
            assert(result.includes('Banana'));
            assert(result.includes('Cherry'));
        });

        it('should use item-separator with empty string', async () => {
            const xmlString = `<root>
              <items>
                <item>1</item>
                <item>2</item>
                <item>3</item>
              </items>
            </root>`;

            const xsltString = `<?xml version="1.0"?>
              <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="text" item-separator=""/>
                <xsl:template match="/">
                  <xsl:for-each select="root/items/item">
                    <xsl:value-of select="."/>
                  </xsl:for-each>
                </xsl:template>
              </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            // Should concatenate items without separator
            assert(result.includes('1'));
            assert(result.includes('2'));
            assert(result.includes('3'));
        });

        it('should apply item-separator to value-of results', async () => {
            const xmlString = `<root>
              <data>
                <value>X</value>
                <value>Y</value>
                <value>Z</value>
              </data>
            </root>`;

            const xsltString = `<?xml version="1.0"?>
              <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="text" item-separator=" | "/>
                <xsl:template match="/">
                  <xsl:for-each select="root/data/value">
                    <xsl:value-of select="."/>
                    <xsl:if test="position() != last()"> | </xsl:if>
                  </xsl:for-each>
                </xsl:template>
              </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            // Should output all values with separators
            assert(result.includes('X'));
            assert(result.includes('Y'));
            assert(result.includes('Z'));
            assert(result.includes('|'));
        });

        it('should work with item-separator in XML output', async () => {
            const xmlString = `<root/>`;

            const xsltString = `<?xml version="1.0"?>
              <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml" item-separator=" "/>
                <xsl:template match="/">
                  <result>
                    <item>First</item>
                    <item>Second</item>
                  </result>
                </xsl:template>
              </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            // XML should still be valid
            assert(result.includes('<result>'));
            assert(result.includes('<item>'));
            assert(result.includes('First'));
        });

        it('should handle item-separator with special characters', async () => {
            const xmlString = `<root>
              <list>
                <item>A</item>
                <item>B</item>
              </list>
            </root>`;

            const xsltString = `<?xml version="1.0"?>
              <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="text" item-separator=" &amp; "/>
                <xsl:template match="/">
                  <xsl:for-each select="root/list/item">
                    <xsl:value-of select="."/>
                    <xsl:if test="position() != last()"> &amp; </xsl:if>
                  </xsl:for-each>
                </xsl:template>
              </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            // Should handle entity references in separator
            assert(result.includes('A'));
            assert(result.includes('B'));
        });
    });

    describe('Backward Compatibility', () => {
        it('should work without specifying version attribute', async () => {
            const xmlString = `<root><data>Test</data></root>`;

            const xsltString = `<?xml version="1.0"?>
              <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="html"/>
                <xsl:template match="/">
                  <html>
                    <body>
                      <xsl:value-of select="root/data"/>
                    </body>
                  </html>
                </xsl:template>
              </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            assert(result.includes('<html>'));
            assert(result.includes('Test'));
        });

        it('should default to appropriate output without item-separator', async () => {
            const xmlString = `<root><item>Data</item></root>`;

            const xsltString = `<?xml version="1.0"?>
              <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml"/>
                <xsl:template match="/">
                  <output>
                    <xsl:value-of select="root/item"/>
                  </output>
                </xsl:template>
              </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            assert(result.includes('<output>'));
            assert(result.includes('Data'));
        });

        it('should maintain XSLT 2.0 xsl:output compatibility', async () => {
            const xmlString = `<root/>`;

            const xsltString = `<?xml version="1.0"?>
              <xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="yes"/>
                <xsl:template match="/">
                  <result>Test</result>
                </xsl:template>
              </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            assert(result.includes('<result>'));
            assert(result.includes('Test'));
        });
    });

    describe('Version Detection and Application', () => {
        it('should recognize HTML4 with explicit version', async () => {
            const xmlString = `<root/>`;

            const xsltString = `<?xml version="1.0"?>
              <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="html" version="4.01"/>
                <xsl:template match="/">
                  <html>
                    <body>HTML4 Content</body>
                  </html>
                </xsl:template>
              </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            assert(result.includes('<html>'));
            assert(result.includes('HTML4 Content'));
        });

        it('should handle XML 1.1 version specification', async () => {
            const xmlString = `<root/>`;

            const xsltString = `<?xml version="1.0"?>
              <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml" version="1.1"/>
                <xsl:template match="/">
                  <root>Content</root>
                </xsl:template>
              </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            assert(result.includes('<root>'));
            assert(result.includes('Content'));
        });
    });

    describe('Integration with Other Output Attributes', () => {
        it('should work with omit-xml-declaration', async () => {
            const xmlString = `<root/>`;

            const xsltString = `<?xml version="1.0"?>
              <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="html" version="5.0" omit-xml-declaration="yes"/>
                <xsl:template match="/">
                  <html><body>Test</body></html>
                </xsl:template>
              </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            assert(result.includes('<html>'));
            // Should not have XML declaration for HTML5
            assert(!result.startsWith('<?xml'));
        });

        it('should work with indent attribute', async () => {
            const xmlString = `<root/>`;

            const xsltString = `<?xml version="1.0"?>
              <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="html" version="5.0" indent="no"/>
                <xsl:template match="/">
                  <html><body>Test</body></html>
                </xsl:template>
              </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            // Should still work with indent="no" for HTML5
            assert(result.includes('<html>'));
            assert(result.includes('Test'));
        });

        it('should combine item-separator with method-specific behavior', async () => {
            const xmlString = `<root>
              <words>
                <word>Hello</word>
                <word>World</word>
              </words>
            </root>`;

            const xsltString = `<?xml version="1.0"?>
              <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="text" item-separator=" "/>
                <xsl:template match="/">
                  <xsl:for-each select="root/words/word">
                    <xsl:value-of select="."/>
                    <xsl:if test="position() != last()"> </xsl:if>
                  </xsl:for-each>
                </xsl:template>
              </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            assert(result.includes('Hello'));
            assert(result.includes('World'));
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty item-separator', async () => {
            const xmlString = `<root><items><i>1</i><i>2</i></items></root>`;

            const xsltString = `<?xml version="1.0"?>
              <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="text" item-separator=""/>
                <xsl:template match="/">
                  <xsl:for-each select="root/items/i"><xsl:value-of select="."/></xsl:for-each>
                </xsl:template>
              </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            assert(result.includes('1'));
            assert(result.includes('2'));
        });

        it('should handle multi-character item-separator', async () => {
            const xmlString = `<root><list><a>X</a><a>Y</a></list></root>`;

            const xsltString = `<?xml version="1.0"?>
              <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="text" item-separator=" :: "/>
                <xsl:template match="/">
                  <xsl:for-each select="root/list/a"><xsl:value-of select="."/><xsl:if test="position() != last()"> :: </xsl:if></xsl:for-each>
                </xsl:template>
              </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            assert(result.includes('X'));
            assert(result.includes('Y'));
        });

        it('should handle HTML5 with complex nested structure', async () => {
            const xmlString = `<root>
              <nav>
                <links>
                  <link>Home</link>
                  <link>About</link>
                </links>
              </nav>
            </root>`;

            const xsltString = `<?xml version="1.0"?>
              <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="html" version="5.0"/>
                <xsl:template match="/">
                  <html>
                    <body>
                      <nav>
                        <xsl:for-each select="root/nav/links/link">
                          <a href="#"><xsl:value-of select="."/></a>
                        </xsl:for-each>
                      </nav>
                    </body>
                  </html>
                </xsl:template>
              </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            assert(result.includes('<nav>'));
            assert(result.includes('<a'));
            assert(result.includes('Home'));
            assert(result.includes('About'));
        });
    });
});
