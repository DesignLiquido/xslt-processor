import { Xslt } from '../../src/xslt';
import { XmlParser } from '../../src/dom';

describe('xsl:fallback', () => {
    let xslt: Xslt;
    let xmlParser: XmlParser;

    beforeEach(() => {
        xslt = new Xslt();
        xmlParser = new XmlParser();
    });

    /**
     * Test 1: Extension element with fallback should execute fallback content
     */
    it('should execute fallback for unknown extension element', async () => {
        const styleSheet = `
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                           xmlns:ext="http://example.com/ext"
                           version="1.0">
                <xsl:template match="/">
                    <result>
                        <ext:unknown-element>
                            <xsl:fallback>
                                <xsl:text>Fallback executed</xsl:text>
                            </xsl:fallback>
                        </ext:unknown-element>
                    </result>
                </xsl:template>
            </xsl:stylesheet>
        `;

        const xmlDoc = '<root/>';

        const styleDoc = xmlParser.xmlParse(styleSheet);
        const doc = xmlParser.xmlParse(xmlDoc);

        const result = await xslt.xsltProcess(doc, styleDoc);
        expect(result).toContain('Fallback executed');
    });

    /**
     * Test 2: Extension element without fallback should be treated as literal element
     */
    it('should treat extension element without fallback as literal element', async () => {
        const styleSheet = `
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                           xmlns:ext="http://example.com/ext"
                           version="1.0">
                <xsl:template match="/">
                    <result>
                        <ext:custom-element attr="value">
                            <xsl:text>Content</xsl:text>
                        </ext:custom-element>
                    </result>
                </xsl:template>
            </xsl:stylesheet>
        `;

        const xmlDoc = '<root/>';

        const styleDoc = xmlParser.xmlParse(styleSheet);
        const doc = xmlParser.xmlParse(xmlDoc);

        const result = await xslt.xsltProcess(doc, styleDoc);
        expect(result).toContain('<ext:custom-element');
        expect(result).toContain('Content');
        expect(result).toContain('attr="value"');
    });

    /**
     * Test 3: Fallback with complex XSLT instructions
     */
    it('should execute fallback with XSLT instructions', async () => {
        const styleSheet = `
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                           xmlns:ext="http://example.com/ext"
                           version="1.0">
                <xsl:template match="/">
                    <result>
                        <ext:unknown>
                            <xsl:fallback>
                                <div class="fallback">
                                    <xsl:choose>
                                        <xsl:when test="true()">
                                            <span>Fallback with choose</span>
                                        </xsl:when>
                                        <xsl:otherwise>
                                            <span>Otherwise</span>
                                        </xsl:otherwise>
                                    </xsl:choose>
                                </div>
                            </xsl:fallback>
                        </ext:unknown>
                    </result>
                </xsl:template>
            </xsl:stylesheet>
        `;

        const xmlDoc = '<root/>';

        const styleDoc = xmlParser.xmlParse(styleSheet);
        const doc = xmlParser.xmlParse(xmlDoc);

        const result = await xslt.xsltProcess(doc, styleDoc);
        expect(result).toContain('Fallback with choose');
        expect(result).not.toContain('Otherwise');
        expect(result).toContain('<div class="fallback">');
    });

    /**
     * Test 4: Nested extension elements with fallbacks
     */
    it('should handle nested extension elements with fallbacks', async () => {
        const styleSheet = `
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                           xmlns:ext="http://example.com/ext"
                           version="1.0">
                <xsl:template match="/">
                    <result>
                        <ext:outer>
                            <xsl:fallback>
                                <outer-fallback>
                                    <ext:inner>
                                        <xsl:fallback>
                                            <inner-fallback>Nested fallback</inner-fallback>
                                        </xsl:fallback>
                                    </ext:inner>
                                </outer-fallback>
                            </xsl:fallback>
                        </ext:outer>
                    </result>
                </xsl:template>
            </xsl:stylesheet>
        `;

        const xmlDoc = '<root/>';

        const styleDoc = xmlParser.xmlParse(styleSheet);
        const doc = xmlParser.xmlParse(xmlDoc);

        const result = await xslt.xsltProcess(doc, styleDoc);
        expect(result).toContain('Nested fallback');
        expect(result).toContain('<outer-fallback>');
        expect(result).toContain('<inner-fallback>');
    });

    /**
     * Test 5: Error when fallback is misused (not child of extension element)
     */
    it('should throw error when fallback is used outside extension element', async () => {
        const styleSheet = `
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                           version="1.0">
                <xsl:template match="/">
                    <result>
                        <xsl:fallback>
                            <xsl:text>Invalid fallback</xsl:text>
                        </xsl:fallback>
                    </result>
                </xsl:template>
            </xsl:stylesheet>
        `;

        const xmlDoc = '<root/>';

        const styleDoc = xmlParser.xmlParse(styleSheet);
        const doc = xmlParser.xmlParse(xmlDoc);

        await expect(xslt.xsltProcess(doc, styleDoc)).rejects.toThrow(
            '<xsl:fallback> must be a direct child of an extension element'
        );
    });

    /**
     * Test 6: Fallback with multiple children (only direct xsl:fallback is processed)
     */
    it('should only process first xsl:fallback child, ignore others', async () => {
        const styleSheet = `
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                           xmlns:ext="http://example.com/ext"
                           version="1.0">
                <xsl:template match="/">
                    <result>
                        <ext:element>
                            <other>Not fallback</other>
                            <xsl:fallback>
                                <xsl:text>First fallback</xsl:text>
                            </xsl:fallback>
                            <xsl:fallback>
                                <xsl:text>Second fallback</xsl:text>
                            </xsl:fallback>
                        </ext:element>
                    </result>
                </xsl:template>
            </xsl:stylesheet>
        `;

        const xmlDoc = '<root/>';

        const styleDoc = xmlParser.xmlParse(styleSheet);
        const doc = xmlParser.xmlParse(xmlDoc);

        const result = await xslt.xsltProcess(doc, styleDoc);
        expect(result).toContain('First fallback');
        expect(result).not.toContain('Second fallback');
    });

    /**
     * Test 7: Fallback with input document context
     */
    it('should execute fallback with correct input context', async () => {
        const styleSheet = `
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                           xmlns:ext="http://example.com/ext"
                           version="1.0">
                <xsl:template match="root">
                    <result>
                        <ext:custom>
                            <xsl:fallback>
                                <item>Value: <xsl:value-of select="item"/></item>
                            </xsl:fallback>
                        </ext:custom>
                    </result>
                </xsl:template>
            </xsl:stylesheet>
        `;

        const xmlDoc = '<root><item>test-value</item></root>';

        const styleDoc = xmlParser.xmlParse(styleSheet);
        const doc = xmlParser.xmlParse(xmlDoc);

        const result = await xslt.xsltProcess(doc, styleDoc);
        expect(result).toContain('Value: test-value');
    });

    /**
     * Test 8: Extension element with attributes (literal element without fallback)
     */
    it('should preserve extension element attributes when no fallback', async () => {
        const styleSheet = `
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                           xmlns:ext="http://example.com/ext"
                           version="1.0">
                <xsl:template match="/">
                    <result>
                        <ext:element id="test" data-value="123">
                            Content here
                        </ext:element>
                    </result>
                </xsl:template>
            </xsl:stylesheet>
        `;

        const xmlDoc = '<root/>';

        const styleDoc = xmlParser.xmlParse(styleSheet);
        const doc = xmlParser.xmlParse(xmlDoc);

        const result = await xslt.xsltProcess(doc, styleDoc);
        expect(result).toContain('id="test"');
        expect(result).toContain('data-value="123"');
        expect(result).toContain('Content here');
    });

    /**
     * Test 9: Empty fallback should still work
     */
    it('should handle empty fallback element', async () => {
        const styleSheet = `
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                           xmlns:ext="http://example.com/ext"
                           version="1.0">
                <xsl:template match="/">
                    <result>
                        <ext:element>
                            <xsl:fallback/>
                        </ext:element>
                    </result>
                </xsl:template>
            </xsl:stylesheet>
        `;

        const xmlDoc = '<root/>';

        const styleDoc = xmlParser.xmlParse(styleSheet);
        const doc = xmlParser.xmlParse(xmlDoc);

        const result = await xslt.xsltProcess(doc, styleDoc);
        // Should execute without error, result element should be self-closing since empty
        expect(result).toContain('<result');
    });

    /**
     * Test 10: Fallback in template with xsl:for-each
     */
    it('should execute fallback for each iteration', async () => {
        const styleSheet = `
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                           xmlns:ext="http://example.com/ext"
                           version="1.0">
                <xsl:template match="/">
                    <result>
                        <xsl:for-each select="//item">
                            <ext:process>
                                <xsl:fallback>
                                    <processed>
                                        <xsl:value-of select="."/>
                                    </processed>
                                </xsl:fallback>
                            </ext:process>
                        </xsl:for-each>
                    </result>
                </xsl:template>
            </xsl:stylesheet>
        `;

        const xmlDoc = '<root><item>A</item><item>B</item><item>C</item></root>';

        const styleDoc = xmlParser.xmlParse(styleSheet);
        const doc = xmlParser.xmlParse(xmlDoc);

        const result = await xslt.xsltProcess(doc, styleDoc);
        expect(result).toContain('<processed>A</processed>');
        expect(result).toContain('<processed>B</processed>');
        expect(result).toContain('<processed>C</processed>');
    });
});
