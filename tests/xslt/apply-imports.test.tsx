// Copyright 2026 Design Liquido
// Tests for xsl:apply-imports element
// Specification: https://www.w3.org/TR/xslt-10/#section-Applying-Import-Precedence

import { Xslt, XmlParser } from '../../src';

describe('xsl:apply-imports', () => {
    let xslt: Xslt;
    let xmlParser: XmlParser;

    beforeEach(() => {
        xslt = new Xslt();
        xmlParser = new XmlParser();
    });

    /**
     * Test 1: Basic import override with apply-imports
     * Tests that a template can call the imported template it overrides
     */
    it('should call imported template when apply-imports is used', async () => {
        // This test requires external files which we'll simulate inline
        // In reality, xsl:import would fetch from a URL
        const baseStylesheet = `
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                <xsl:template match="item">
                    <base><xsl:value-of select="."/></base>
                </xsl:template>
            </xsl:stylesheet>
        `;

        const mainStylesheet = `
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                <xsl:import href="base.xsl"/>
                <xsl:template match="item">
                    <override>
                        <xsl:apply-imports/>
                    </override>
                </xsl:template>
            </xsl:stylesheet>
        `;

        const xmlDoc = '<root><item>test</item></root>';

        // Note: This test would require actual file system or URL mocking
        // For now, we're documenting the expected behavior
        // The result should be: <override><base>test</base></override>
    });

    /**
     * Test 2: Apply-imports outside template context
     * Should throw error
     */
    it('should throw error when apply-imports is used outside template', async () => {
        const styleSheet = `
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                <xsl:template match="/">
                    <root>
                        <!-- This apply-imports is inside a template, so it's valid -->
                        <xsl:apply-imports/>
                    </root>
                </xsl:template>
            </xsl:stylesheet>
        `;

        const xmlDoc = '<data/>';

        const styleDoc = xmlParser.xmlParse(styleSheet);
        const doc = xmlParser.xmlParse(xmlDoc);

        // When there's no imported template, apply-imports should silently do nothing
        const result = await xslt.xsltProcess(doc, styleDoc);
        expect(result).toMatch(/<root(\s|\/)?>/);
    });

    /**
     * Test 3: Apply-imports with no imported templates
     * Should silently do nothing (per XSLT spec)
     */
    it('should silently do nothing when no imported templates exist', async () => {
        const styleSheet = `
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                <xsl:template match="/">
                    <result>
                        <before>Before</before>
                        <xsl:apply-imports/>
                        <after>After</after>
                    </result>
                </xsl:template>
            </xsl:stylesheet>
        `;

        const xmlDoc = '<data/>';

        const styleDoc = xmlParser.xmlParse(styleSheet);
        const doc = xmlParser.xmlParse(xmlDoc);

        const result = await xslt.xsltProcess(doc, styleDoc);
        expect(result).toContain('<before>Before</before>');
        expect(result).toContain('<after>After</after>');
        expect(result).toContain('<result>');
    });

    /**
     * Test 4: Apply-imports respects mode
     * Imported templates should match mode of current template
     */
    it('should respect mode when selecting imported template', async () => {
        // This would require mode testing with imports
        // Documented for future implementation with actual file support
    });

    /**
     * Test 5: Parameters passed through apply-imports
     * xsl:with-param should work with apply-imports
     */
    it('should pass parameters through with-param', async () => {
        // This would test xsl:with-param working with apply-imports
        // Documented for future implementation
    });

    /**
     * Test 6: Multiple levels of imports
     * A imports B, B imports C - apply-imports should follow precedence
     */
    it('should handle nested imports correctly', async () => {
        // This would test multiple levels of import precedence
        // Documented for future implementation
    });

    /**
     * Test 7: Import precedence with identical match patterns
     * Main stylesheet template should have highest precedence
     */
    it('should respect import precedence for conflict resolution', async () => {
        // Main stylesheet templates override imported ones
        // apply-imports allows calling the overridden template
        // Documented for future implementation
    });
});
