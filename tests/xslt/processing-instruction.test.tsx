import { Xslt } from '../../src/xslt';
import { XmlParser } from '../../src/dom';

describe('xsl:processing-instruction', () => {
    let xslt: Xslt;
    let xmlParser: XmlParser;

    beforeEach(() => {
        xslt = new Xslt();
        xmlParser = new XmlParser();
    });

    /**
     * Test 1: Basic processing instruction creation
     */
    it('should create processing instruction in output', async () => {
        const xmlText = '<root />';
        const xsltText = `
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:template match="/">
                    <xsl:processing-instruction name="target">
                        <xsl:text>some data</xsl:text>
                    </xsl:processing-instruction>
                </xsl:template>
            </xsl:stylesheet>
        `;

        const xmlDoc = xmlParser.xmlParse(xmlText);
        const styleSheet = xmlParser.xmlParse(xsltText);

        const result = await xslt.xsltProcess(xmlDoc, styleSheet);

        expect(result).toContain('<?target some data?>');
    });

    /**
     * Test 2: Processing instruction with dynamic target
     */
    it('should support dynamic target via attribute value template', async () => {
        const xmlText = '<root name="mytarget" />';
        const xsltText = `
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:template match="/">
                    <xsl:processing-instruction name="{/root/@name}">
                        <xsl:text>dynamic target</xsl:text>
                    </xsl:processing-instruction>
                </xsl:template>
            </xsl:stylesheet>
        `;

        const xmlDoc = xmlParser.xmlParse(xmlText);
        const styleSheet = xmlParser.xmlParse(xsltText);

        const result = await xslt.xsltProcess(xmlDoc, styleSheet);

        expect(result).toContain('<?mytarget dynamic target?>');
    });

    /**
     * Test 3: Processing instruction with XSLT instructions in content
     */
    it('should handle complex content with XSLT instructions', async () => {
        const xmlText = '<root><item>value1</item><item>value2</item></root>';
        const xsltText = `
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:template match="/">
                    <xsl:processing-instruction name="items">
                        <xsl:for-each select="//item">
                            <xsl:value-of select="."/>
                            <xsl:if test="position() &lt; last()">
                                <xsl:text>,</xsl:text>
                            </xsl:if>
                        </xsl:for-each>
                    </xsl:processing-instruction>
                </xsl:template>
            </xsl:stylesheet>
        `;

        const xmlDoc = xmlParser.xmlParse(xmlText);
        const styleSheet = xmlParser.xmlParse(xsltText);

        const result = await xslt.xsltProcess(xmlDoc, styleSheet);

        expect(result).toContain('<?items value1,value2?>');
    });

    /**
     * Test 4: Empty processing instruction data
     */
    it('should create PI with empty data if content is empty', async () => {
        const xmlText = '<root />';
        const xsltText = `
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:template match="/">
                    <xsl:processing-instruction name="empty-pi" />
                </xsl:template>
            </xsl:stylesheet>
        `;

        const xmlDoc = xmlParser.xmlParse(xmlText);
        const styleSheet = xmlParser.xmlParse(xsltText);

        const result = await xslt.xsltProcess(xmlDoc, styleSheet);

        expect(result).toContain('<?empty-pi?>');
    });

    /**
     * Test 5: Error on reserved "xml" target
     */
    it('should error when target is "xml"', async () => {
        const xmlText = '<root />';
        const xsltText = `
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:template match="/">
                    <xsl:processing-instruction name="xml">
                        <xsl:text>not allowed</xsl:text>
                    </xsl:processing-instruction>
                </xsl:template>
            </xsl:stylesheet>
        `;

        const xmlDoc = xmlParser.xmlParse(xmlText);
        const styleSheet = xmlParser.xmlParse(xsltText);

        await expect(xslt.xsltProcess(xmlDoc, styleSheet)).rejects.toThrow(
            'Processing instruction target cannot be "xml"'
        );
    });

    /**
     * Test 6: Error on empty target name (via dynamic expression)
     */
    it('should error when target name evaluates to empty', async () => {
        const xmlText = '<root />';
        const xsltText = `
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:template match="/">
                    <xsl:processing-instruction name="{''}" >
                        <xsl:text>empty target</xsl:text>
                    </xsl:processing-instruction>
                </xsl:template>
            </xsl:stylesheet>
        `;

        const xmlDoc = xmlParser.xmlParse(xmlText);
        const styleSheet = xmlParser.xmlParse(xsltText);

        await expect(xslt.xsltProcess(xmlDoc, styleSheet)).rejects.toThrow(
            'target name cannot be empty'
        );
    });

    /**
     * Test 7: Error on missing name attribute
     */
    it('should error when name attribute is missing', async () => {
        const xmlText = '<root />';
        const xsltText = `
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:template match="/">
                    <xsl:processing-instruction>
                        <xsl:text>no name</xsl:text>
                    </xsl:processing-instruction>
                </xsl:template>
            </xsl:stylesheet>
        `;

        const xmlDoc = xmlParser.xmlParse(xmlText);
        const styleSheet = xmlParser.xmlParse(xsltText);

        await expect(xslt.xsltProcess(xmlDoc, styleSheet)).rejects.toThrow(
            'requires a "name" attribute'
        );
    });

    /**
     * Test 8: Error on invalid target name (contains spaces)
     */
    it('should error on invalid target name with spaces', async () => {
        const xmlText = '<root />';
        const xsltText = `
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:template match="/">
                    <xsl:processing-instruction name="invalid target">
                        <xsl:text>spaces not allowed</xsl:text>
                    </xsl:processing-instruction>
                </xsl:template>
            </xsl:stylesheet>
        `;

        const xmlDoc = xmlParser.xmlParse(xmlText);
        const styleSheet = xmlParser.xmlParse(xsltText);

        await expect(xslt.xsltProcess(xmlDoc, styleSheet)).rejects.toThrow(
            'Invalid processing instruction target'
        );
    });

    /**
     * Test 9: Multiple processing instructions
     */
    it('should create multiple processing instructions', async () => {
        const xmlText = '<root><item>1</item><item>2</item><item>3</item></root>';
        const xsltText = `
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:template match="/">
                    <xsl:for-each select="//item">
                        <xsl:processing-instruction name="item">
                            <xsl:value-of select="."/>
                        </xsl:processing-instruction>
                    </xsl:for-each>
                </xsl:template>
            </xsl:stylesheet>
        `;

        const xmlDoc = xmlParser.xmlParse(xmlText);
        const styleSheet = xmlParser.xmlParse(xsltText);

        const result = await xslt.xsltProcess(xmlDoc, styleSheet);

        expect(result).toContain('<?item 1?>');
        expect(result).toContain('<?item 2?>');
        expect(result).toContain('<?item 3?>');
    });

    /**
     * Test 10: Processing instruction with mixed content
     */
    it('should handle mixed static and dynamic content', async () => {
        const xmlText = '<root><name>world</name></root>';
        const xsltText = `
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:template match="/">
                    <xsl:processing-instruction name="greeting">
                        <xsl:text>Hello </xsl:text>
                        <xsl:value-of select="//name"/>
                        <xsl:text>!</xsl:text>
                    </xsl:processing-instruction>
                </xsl:template>
            </xsl:stylesheet>
        `;

        const xmlDoc = xmlParser.xmlParse(xmlText);
        const styleSheet = xmlParser.xmlParse(xsltText);

        const result = await xslt.xsltProcess(xmlDoc, styleSheet);

        expect(result).toContain('<?greeting Hello world!?>');
    });

    /**
     * Test 11: Processing instruction with whitespace handling
     */
    it('should preserve whitespace in PI data', async () => {
        const xmlText = '<root />';
        const xsltText = `
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:template match="/">
                    <xsl:processing-instruction name="whitespace">
                        <xsl:text>  spaced  </xsl:text>
                    </xsl:processing-instruction>
                </xsl:template>
            </xsl:stylesheet>
        `;

        const xmlDoc = xmlParser.xmlParse(xmlText);
        const styleSheet = xmlParser.xmlParse(xsltText);

        const result = await xslt.xsltProcess(xmlDoc, styleSheet);

        expect(result).toContain('<?whitespace   spaced  ?>');
    });

    /**
     * Test 12: Processing instruction in element output
     */
    it('should place PI in correct position in output structure', async () => {
        const xmlText = '<root />';
        const xsltText = `
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:template match="/">
                    <root>
                        <xsl:processing-instruction name="embedded">data</xsl:processing-instruction>
                        <child>text</child>
                    </root>
                </xsl:template>
            </xsl:stylesheet>
        `;

        const xmlDoc = xmlParser.xmlParse(xmlText);
        const styleSheet = xmlParser.xmlParse(xsltText);

        const result = await xslt.xsltProcess(xmlDoc, styleSheet);

        // PI should appear before child element
        const piIndex = result.indexOf('<?embedded data?>');
        const childIndex = result.indexOf('<child>');
        expect(piIndex).toBeGreaterThan(-1);
        expect(childIndex).toBeGreaterThan(-1);
        expect(piIndex).toBeLessThan(childIndex);
    });

    /**
     * Test 13: Processing instruction with special characters in target
     */
    it('should accept valid target names with hyphens and underscores', async () => {
        const xmlText = '<root />';
        const xsltText = `
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:template match="/">
                    <xsl:processing-instruction name="my-valid_target">
                        <xsl:text>valid chars</xsl:text>
                    </xsl:processing-instruction>
                </xsl:template>
            </xsl:stylesheet>
        `;

        const xmlDoc = xmlParser.xmlParse(xmlText);
        const styleSheet = xmlParser.xmlParse(xsltText);

        const result = await xslt.xsltProcess(xmlDoc, styleSheet);

        expect(result).toContain('<?my-valid_target valid chars?>');
    });

    /**
     * Test 14: Processing instruction with numeric target start validation
     */
    it('should error when target starts with number', async () => {
        const xmlText = '<root />';
        const xsltText = `
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:template match="/">
                    <xsl:processing-instruction name="1invalid">
                        <xsl:text>no numbers at start</xsl:text>
                    </xsl:processing-instruction>
                </xsl:template>
            </xsl:stylesheet>
        `;

        const xmlDoc = xmlParser.xmlParse(xmlText);
        const styleSheet = xmlParser.xmlParse(xsltText);

        await expect(xslt.xsltProcess(xmlDoc, styleSheet)).rejects.toThrow(
            'Invalid processing instruction target'
        );
    });

    /**
     * Test 15: Case insensitivity of "xml" target check
     */
    it('should reject "XML" and "Xml" as reserved targets', async () => {
        const xmlText = '<root />';
        const xsltText = `
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:template match="/">
                    <xsl:processing-instruction name="XML">
                        <xsl:text>uppercase xml</xsl:text>
                    </xsl:processing-instruction>
                </xsl:template>
            </xsl:stylesheet>
        `;

        const xmlDoc = xmlParser.xmlParse(xmlText);
        const styleSheet = xmlParser.xmlParse(xsltText);

        await expect(xslt.xsltProcess(xmlDoc, styleSheet)).rejects.toThrow(
            'Processing instruction target cannot be "xml"'
        );
    });
});
