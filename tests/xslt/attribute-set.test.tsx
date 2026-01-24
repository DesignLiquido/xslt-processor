import { Xslt } from '../../src/xslt';
import { XmlParser } from '../../src/dom';

describe('xsl:attribute-set', () => {
    let xslt: Xslt;
    let xmlParser: XmlParser;

    beforeEach(() => {
        xslt = new Xslt();
        xmlParser = new XmlParser();
    });

    /**
     * Test 1: Basic attribute set application
     */
    it('should apply attribute set to element', async () => {
        const styleSheet = `
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                <xsl:attribute-set name="highlight">
                    <xsl:attribute name="class">highlight</xsl:attribute>
                </xsl:attribute-set>
                <xsl:template match="/">
                    <result>
                        <xsl:element name="div" use-attribute-sets="highlight">
                            <xsl:text>Content</xsl:text>
                        </xsl:element>
                    </result>
                </xsl:template>
            </xsl:stylesheet>
        `;

        const xmlDoc = '<root/>';

        const styleDoc = xmlParser.xmlParse(styleSheet);
        const doc = xmlParser.xmlParse(xmlDoc);

        const result = await xslt.xsltProcess(doc, styleDoc);
        expect(result).toContain('<div class="highlight">');
        expect(result).toContain('Content');
    });

    /**
     * Test 2: Multiple attributes in one attribute set
     */
    it('should apply multiple attributes from single attribute set', async () => {
        const styleSheet = `
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                <xsl:attribute-set name="styled">
                    <xsl:attribute name="class">highlight</xsl:attribute>
                    <xsl:attribute name="data-version">1.0</xsl:attribute>
                    <xsl:attribute name="id">main</xsl:attribute>
                </xsl:attribute-set>
                <xsl:template match="/">
                    <xsl:element name="div" use-attribute-sets="styled">
                        <xsl:text>Styled content</xsl:text>
                    </xsl:element>
                </xsl:template>
            </xsl:stylesheet>
        `;

        const xmlDoc = '<root/>';

        const styleDoc = xmlParser.xmlParse(styleSheet);
        const doc = xmlParser.xmlParse(xmlDoc);

        const result = await xslt.xsltProcess(doc, styleDoc);
        expect(result).toContain('class="highlight"');
        expect(result).toContain('data-version="1.0"');
        expect(result).toContain('id="main"');
    });

    /**
     * Test 3: Multiple attribute sets applied to single element
     */
    it('should apply multiple attribute sets to element', async () => {
        const styleSheet = `
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                <xsl:attribute-set name="colors">
                    <xsl:attribute name="color">red</xsl:attribute>
                    <xsl:attribute name="background">white</xsl:attribute>
                </xsl:attribute-set>
                <xsl:attribute-set name="sizing">
                    <xsl:attribute name="width">100px</xsl:attribute>
                    <xsl:attribute name="height">50px</xsl:attribute>
                </xsl:attribute-set>
                <xsl:template match="/">
                    <xsl:element name="div" use-attribute-sets="colors sizing">
                        <xsl:text>Multi-set</xsl:text>
                    </xsl:element>
                </xsl:template>
            </xsl:stylesheet>
        `;

        const xmlDoc = '<root/>';

        const styleDoc = xmlParser.xmlParse(styleSheet);
        const doc = xmlParser.xmlParse(xmlDoc);

        const result = await xslt.xsltProcess(doc, styleDoc);
        expect(result).toContain('color="red"');
        expect(result).toContain('background="white"');
        expect(result).toContain('width="100px"');
        expect(result).toContain('height="50px"');
    });

    /**
     * Test 4: Nested attribute sets (attribute set referencing other attribute sets)
     */
    it('should handle nested attribute sets', async () => {
        const styleSheet = `
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                <xsl:attribute-set name="base">
                    <xsl:attribute name="class">base</xsl:attribute>
                </xsl:attribute-set>
                <xsl:attribute-set name="extended" use-attribute-sets="base">
                    <xsl:attribute name="class">extended</xsl:attribute>
                    <xsl:attribute name="data-extended">true</xsl:attribute>
                </xsl:attribute-set>
                <xsl:template match="/">
                    <xsl:element name="div" use-attribute-sets="extended">
                        <xsl:text>Nested</xsl:text>
                    </xsl:element>
                </xsl:template>
            </xsl:stylesheet>
        `;

        const xmlDoc = '<root/>';

        const styleDoc = xmlParser.xmlParse(styleSheet);
        const doc = xmlParser.xmlParse(xmlDoc);

        const result = await xslt.xsltProcess(doc, styleDoc);
        // The later class="extended" should override the earlier class="base"
        expect(result).toContain('class="extended"');
        expect(result).toContain('data-extended="true"');
    });

    /**
     * Test 5: Attribute set with dynamic values from context
     */
    it('should evaluate dynamic attribute values from context', async () => {
        const styleSheet = `
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                <xsl:attribute-set name="dynamic">
                    <xsl:attribute name="id"><xsl:value-of select="//item/@id"/></xsl:attribute>
                    <xsl:attribute name="name"><xsl:value-of select="//item/@name"/></xsl:attribute>
                </xsl:attribute-set>
                <xsl:template match="/">
                    <xsl:element name="div" use-attribute-sets="dynamic">
                        <xsl:text>Dynamic</xsl:text>
                    </xsl:element>
                </xsl:template>
            </xsl:stylesheet>
        `;

        const xmlDoc = '<root><item id="123" name="test-item"/></root>';

        const styleDoc = xmlParser.xmlParse(styleSheet);
        const doc = xmlParser.xmlParse(xmlDoc);

        const result = await xslt.xsltProcess(doc, styleDoc);
        expect(result).toContain('id="123"');
        expect(result).toContain('name="test-item"');
    });

    /**
     * Test 6: Literal result element with use-attribute-sets
     */
    it('should apply attribute sets on literal result elements', async () => {
        const styleSheet = `
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                <xsl:attribute-set name="literal-attrs">
                    <xsl:attribute name="class">from-set</xsl:attribute>
                    <xsl:attribute name="data-type">literal</xsl:attribute>
                </xsl:attribute-set>
                <xsl:template match="/">
                    <result>
                        <div use-attribute-sets="literal-attrs">
                            <xsl:text>Literal with sets</xsl:text>
                        </div>
                    </result>
                </xsl:template>
            </xsl:stylesheet>
        `;

        const xmlDoc = '<root/>';

        const styleDoc = xmlParser.xmlParse(styleSheet);
        const doc = xmlParser.xmlParse(xmlDoc);

        const result = await xslt.xsltProcess(doc, styleDoc);
        expect(result).toContain('<div class="from-set"');
        expect(result).toContain('data-type="literal"');
    });

    /**
     * Test 7: Attribute set with empty value
     */
    it('should handle attribute sets with empty values', async () => {
        const styleSheet = `
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                <xsl:attribute-set name="empty">
                    <xsl:attribute name="empty-attr"></xsl:attribute>
                </xsl:attribute-set>
                <xsl:template match="/">
                    <xsl:element name="div" use-attribute-sets="empty">
                        <xsl:text>With empty</xsl:text>
                    </xsl:element>
                </xsl:template>
            </xsl:stylesheet>
        `;

        const xmlDoc = '<root/>';

        const styleDoc = xmlParser.xmlParse(styleSheet);
        const doc = xmlParser.xmlParse(xmlDoc);

        const result = await xslt.xsltProcess(doc, styleDoc);
        expect(result).toContain('empty-attr=""');
    });

    /**
     * Test 8: Child attributes override attribute set attributes
     */
    it('should allow child attributes to override attribute set attributes', async () => {
        const styleSheet = `
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                <xsl:attribute-set name="override">
                    <xsl:attribute name="class">from-set</xsl:attribute>
                    <xsl:attribute name="id">set-id</xsl:attribute>
                </xsl:attribute-set>
                <xsl:template match="/">
                    <xsl:element name="div" use-attribute-sets="override">
                        <xsl:attribute name="class">from-child</xsl:attribute>
                    </xsl:element>
                </xsl:template>
            </xsl:stylesheet>
        `;

        const xmlDoc = '<root/>';

        const styleDoc = xmlParser.xmlParse(styleSheet);
        const doc = xmlParser.xmlParse(xmlDoc);

        const result = await xslt.xsltProcess(doc, styleDoc);
        // Child attribute should override set attribute
        expect(result).toContain('class="from-child"');
        // Set attribute that wasn't overridden should still be there
        expect(result).toContain('id="set-id"');
    });

    /**
     * Test 9: Missing attribute set is silently ignored
     */
    it('should silently ignore missing attribute sets', async () => {
        const styleSheet = `
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                <xsl:attribute-set name="exists">
                    <xsl:attribute name="present">yes</xsl:attribute>
                </xsl:attribute-set>
                <xsl:template match="/">
                    <xsl:element name="div" use-attribute-sets="exists missing-set">
                        <xsl:text>Missing ignored</xsl:text>
                    </xsl:element>
                </xsl:template>
            </xsl:stylesheet>
        `;

        const xmlDoc = '<root/>';

        const styleDoc = xmlParser.xmlParse(styleSheet);
        const doc = xmlParser.xmlParse(xmlDoc);

        const result = await xslt.xsltProcess(doc, styleDoc);
        // Should still apply the existing attribute set
        expect(result).toContain('present="yes"');
        // Should not throw error for missing set
        expect(result).toContain('<div');
    });

    /**
     * Test 10: Attribute sets with multiple references (recursion prevention)
     */
    it('should prevent infinite recursion in attribute set references', async () => {
        const styleSheet = `
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                <xsl:attribute-set name="set-a" use-attribute-sets="set-b">
                    <xsl:attribute name="a">from-a</xsl:attribute>
                </xsl:attribute-set>
                <xsl:attribute-set name="set-b" use-attribute-sets="set-a">
                    <xsl:attribute name="b">from-b</xsl:attribute>
                </xsl:attribute-set>
                <xsl:template match="/">
                    <xsl:element name="div" use-attribute-sets="set-a">
                        <xsl:text>Recursive</xsl:text>
                    </xsl:element>
                </xsl:template>
            </xsl:stylesheet>
        `;

        const xmlDoc = '<root/>';

        const styleDoc = xmlParser.xmlParse(styleSheet);
        const doc = xmlParser.xmlParse(xmlDoc);

        // Should not hang or throw - should handle recursion gracefully
        const result = await xslt.xsltProcess(doc, styleDoc);
        expect(result).toContain('<div');
    });

    /**
     * Test 11: Attribute set with xsl:value-of from elements in context
     */
    it('should process attribute values using XPath expressions', async () => {
        const styleSheet = `
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                <xsl:attribute-set name="from-xpath">
                    <xsl:attribute name="count"><xsl:value-of select="count(//item)"/></xsl:attribute>
                </xsl:attribute-set>
                <xsl:template match="/">
                    <xsl:element name="div" use-attribute-sets="from-xpath">
                        <xsl:text>Count items</xsl:text>
                    </xsl:element>
                </xsl:template>
            </xsl:stylesheet>
        `;

        const xmlDoc = '<root><item>1</item><item>2</item><item>3</item></root>';

        const styleDoc = xmlParser.xmlParse(styleSheet);
        const doc = xmlParser.xmlParse(xmlDoc);

        const result = await xslt.xsltProcess(doc, styleDoc);
        expect(result).toContain('count="3"');
    });

    /**
     * Test 12: Attribute set in literal element combined with explicit attributes
     */
    it('should combine literal element attributes with attribute set attributes', async () => {
        const styleSheet = `
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                <xsl:attribute-set name="set-attrs">
                    <xsl:attribute name="from-set">yes</xsl:attribute>
                </xsl:attribute-set>
                <xsl:template match="/">
                    <div use-attribute-sets="set-attrs" explicit="also-yes">
                        <xsl:text>Both attributes</xsl:text>
                    </div>
                </xsl:template>
            </xsl:stylesheet>
        `;

        const xmlDoc = '<root/>';

        const styleDoc = xmlParser.xmlParse(styleSheet);
        const doc = xmlParser.xmlParse(xmlDoc);

        const result = await xslt.xsltProcess(doc, styleDoc);
        expect(result).toContain('from-set="yes"');
        expect(result).toContain('explicit="also-yes"');
    });
});
