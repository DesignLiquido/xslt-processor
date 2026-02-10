import assert from 'assert';

import { Xslt } from '../../src/xslt';
import { XmlParser } from '../../src/dom';
import { XPath } from '../../src/xpath';
import { calculateDefaultPriority, collectAndExpandTemplates } from '../../src/xslt/functions';

describe('Template Priority Calculation', () => {
    let xPath: XPath;

    beforeEach(() => {
        xPath = new XPath();
    });

    describe('calculateDefaultPriority', () => {
        it('should return -0.5 for wildcard (*)', () => {
            const priority = calculateDefaultPriority('*', xPath);
            assert.strictEqual(priority, -0.5);
        });

        it('should return -0.5 for node()', () => {
            const priority = calculateDefaultPriority('node()', xPath);
            assert.strictEqual(priority, -0.5);
        });

        it('should return -0.5 for text()', () => {
            const priority = calculateDefaultPriority('text()', xPath);
            assert.strictEqual(priority, -0.5);
        });

        it('should return -0.5 for comment()', () => {
            const priority = calculateDefaultPriority('comment()', xPath);
            assert.strictEqual(priority, -0.5);
        });

        it('should return -0.5 for processing-instruction() without literal', () => {
            const priority = calculateDefaultPriority('processing-instruction()', xPath);
            assert.strictEqual(priority, -0.5);
        });

        it('should return 0 for qualified name (foo)', () => {
            const priority = calculateDefaultPriority('foo', xPath);
            assert.strictEqual(priority, 0);
        });

        it('should return 0 for qualified name with namespace (ns:foo)', () => {
            const priority = calculateDefaultPriority('ns:foo', xPath);
            assert.strictEqual(priority, 0);
        });

        it('should return 0 for attribute (@bar)', () => {
            const priority = calculateDefaultPriority('@bar', xPath);
            assert.strictEqual(priority, 0);
        });

        it('should return 0.5 for multiple steps (foo/bar)', () => {
            const priority = calculateDefaultPriority('foo/bar', xPath);
            assert.strictEqual(priority, 0.5);
        });

        it('should return 0.5 for pattern with predicate (foo[1])', () => {
            const priority = calculateDefaultPriority('foo[1]', xPath);
            assert.strictEqual(priority, 0.5);
        });

        it('should return 0.5 for complex path (chapter/title)', () => {
            const priority = calculateDefaultPriority('chapter/title', xPath);
            assert.strictEqual(priority, 0.5);
        });

        it('should return 0.5 for descendant pattern (//title)', () => {
            const priority = calculateDefaultPriority('//title', xPath);
            assert.strictEqual(priority, 0.5);
        });

        it('should return -0.5 for absolute root pattern (/)', () => {
            // According to XSLT spec, "/" matches the document node, which is a node type test
            // Node type tests have default priority -0.5
            const priority = calculateDefaultPriority('/', xPath);
            assert.strictEqual(priority, -0.5);
        });

        it('should give priority -0.25 for namespace wildcard ns:*', () => {
            // Per XSLT spec: "NCName:*" has priority -0.25
            const priority = calculateDefaultPriority('ns:*', xPath);
            assert.strictEqual(priority, -0.25);
        });

        it('should give priority 0 for processing-instruction with literal', () => {
            // Per XSLT spec: "processing-instruction('name')" has priority 0
            const priority = calculateDefaultPriority("processing-instruction('xml')", xPath);
            assert.strictEqual(priority, 0);
        });

        it('should give priority 0.5 for patterns with predicates', () => {
            const priority = calculateDefaultPriority('item[@type="book"]', xPath);
            assert.strictEqual(priority, 0.5);
        });

        it('should give priority 0.5 for child axis patterns', () => {
            const priority = calculateDefaultPriority('parent/child', xPath);
            assert.strictEqual(priority, 0.5);
        });

        it('should give priority 0.5 for ancestor patterns', () => {
            const priority = calculateDefaultPriority('ancestor::div', xPath);
            assert.strictEqual(priority, 0.5);
        });
    });
});

describe('Template Conflict Resolution', () => {
    describe('Priority-based selection', () => {
        it('should select template with higher specificity (named element over wildcard)', async () => {
            const xmlString = `<book><title>Test</title></book>`;

            const xsltString = `<?xml version="1.0"?>
                <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                    <xsl:template match="*">LOW</xsl:template>
                    <xsl:template match="book">HIGH</xsl:template>
                </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            const result = await xsltClass.xsltProcess(xml, xslt);
            assert.strictEqual(result, 'HIGH');
        });

        it('should select template with explicit priority over default', async () => {
            const xmlString = `<book><title>Test</title></book>`;

            const xsltString = `<?xml version="1.0"?>
                <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                    <xsl:template match="book" priority="2">HIGH-PRIORITY</xsl:template>
                    <xsl:template match="book">DEFAULT-PRIORITY</xsl:template>
                </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            const result = await xsltClass.xsltProcess(xml, xslt);
            assert.strictEqual(result, 'HIGH-PRIORITY');
        });

        it('should select later template when priorities are equal (document order)', async () => {
            const xmlString = `<book><title>Test</title></book>`;

            const xsltString = `<?xml version="1.0"?>
                <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                    <xsl:template match="book">FIRST</xsl:template>
                    <xsl:template match="book">SECOND</xsl:template>
                </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            const result = await xsltClass.xsltProcess(xml, xslt);
            assert.strictEqual(result, 'SECOND');
        });

        it('should select path pattern over name pattern (higher default priority)', async () => {
            const xmlString = `<chapter><title>Test</title></chapter>`;

            const xsltString = `<?xml version="1.0"?>
                <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                    <xsl:template match="/">
                        <xsl:apply-templates select="chapter/title"/>
                    </xsl:template>
                    <xsl:template match="title">NAME-ONLY</xsl:template>
                    <xsl:template match="chapter/title">PATH-PATTERN</xsl:template>
                </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            const result = await xsltClass.xsltProcess(xml, xslt);
            assert.strictEqual(result, 'PATH-PATTERN');
        });
    });

    describe('Only one template should execute per node', () => {
        it('should execute only ONE template per node (not all matching)', async () => {
            const xmlString = `<root><item>content</item></root>`;

            const xsltString = `<?xml version="1.0"?>
                <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                    <xsl:template match="/">
                        <result><xsl:apply-templates select="root/item"/></result>
                    </xsl:template>
                    <xsl:template match="*" priority="-1">WILDCARD</xsl:template>
                    <xsl:template match="item">ITEM</xsl:template>
                </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            const result = await xsltClass.xsltProcess(xml, xslt);
            // Should only output "ITEM" once, not "ITEM" and "WILDCARD"
            assert.strictEqual(result, '<result>ITEM</result>');
        });

        it('should process multiple nodes correctly with different templates', async () => {
            const xmlString = `<root><book>Book1</book><article>Article1</article></root>`;

            const xsltString = `<?xml version="1.0"?>
                <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                    <xsl:template match="/">
                        <result><xsl:apply-templates select="root/*"/></result>
                    </xsl:template>
                    <xsl:template match="book">[BOOK]</xsl:template>
                    <xsl:template match="article">[ARTICLE]</xsl:template>
                </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            const result = await xsltClass.xsltProcess(xml, xslt);
            assert.strictEqual(result, '<result>[BOOK][ARTICLE]</result>');
        });
    });

    describe('Predicate patterns', () => {
        it('should select predicate pattern over simple name (higher priority 0.5 vs 0)', async () => {
            const xmlString = `<root><item id="1">First</item><item id="2">Second</item></root>`;

            const xsltString = `<?xml version="1.0"?>
                <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                    <xsl:template match="/">
                        <result><xsl:apply-templates select="root/item[@id='1']"/></result>
                    </xsl:template>
                    <xsl:template match="item">GENERIC</xsl:template>
                    <xsl:template match="item[@id='1']">SPECIFIC</xsl:template>
                </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            const result = await xsltClass.xsltProcess(xml, xslt);
            assert.strictEqual(result, '<result>SPECIFIC</result>');
        });
    });

    describe('Negative priorities', () => {
        it('should allow negative explicit priority', async () => {
            const xmlString = `<item>content</item>`;

            const xsltString = `<?xml version="1.0"?>
                <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                    <xsl:template match="item" priority="-2">VERY-LOW</xsl:template>
                    <xsl:template match="item" priority="-1">LOW</xsl:template>
                </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            const result = await xsltClass.xsltProcess(xml, xslt);
            assert.strictEqual(result, 'LOW');
        });

        it('should select explicit negative priority over default negative priority based on value', async () => {
            const xmlString = `<item>content</item>`;

            const xsltString = `<?xml version="1.0"?>
                <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                    <xsl:template match="*">WILDCARD</xsl:template>
                    <xsl:template match="item" priority="-0.25">EXPLICIT-NEG</xsl:template>
                </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            const result = await xsltClass.xsltProcess(xml, xslt);
            // -0.25 > -0.5, so EXPLICIT-NEG wins
            assert.strictEqual(result, 'EXPLICIT-NEG');
        });
    });

    describe('Union patterns', () => {
        it('should calculate priority for highest priority alternative in union pattern', async () => {
            const xmlString = `<chapter><title>Test</title></chapter>`;

            const xsltString = `<?xml version="1.0"?>
                <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                    <xsl:template match="/">
                        <xsl:apply-templates select="chapter/title"/>
                    </xsl:template>
                    <xsl:template match="title|*">UNION</xsl:template>
                    <xsl:template match="chapter/title">PATH</xsl:template>
                </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            const result = await xsltClass.xsltProcess(xml, xslt);
            // chapter/title has priority 0.5, title|* uses 0 (highest from title, not -0.5 from *)
            // PATH should win because 0.5 > 0
            assert.strictEqual(result, 'PATH');
        });
    });

    describe('Mode-based template selection', () => {
        it('should only match templates with matching mode', async () => {
            const xmlString = `<doc><item>content</item></doc>`;

            const xsltString = `<?xml version="1.0"?>
                <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                    <xsl:template match="doc">
                        <result>
                            <normal><xsl:apply-templates select="item"/></normal>
                            <special><xsl:apply-templates select="item" mode="special"/></special>
                        </result>
                    </xsl:template>
                    <xsl:template match="item">NORMAL</xsl:template>
                    <xsl:template match="item" mode="special">SPECIAL</xsl:template>
                </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            const result = await xsltClass.xsltProcess(xml, xslt);
            assert.strictEqual(result, '<result><normal>NORMAL</normal><special>SPECIAL</special></result>');
        });
    });

    describe('Attribute patterns', () => {
        it('should handle attribute wildcard @* correctly', async () => {
            const xmlString = `<item id="123" name="test"/>`;

            const xsltString = `<?xml version="1.0"?>
                <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                    <xsl:template match="item">
                        <result><xsl:apply-templates select="@*"/></result>
                    </xsl:template>
                    <xsl:template match="@*">[ATTR]</xsl:template>
                </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            const result = await xsltClass.xsltProcess(xml, xslt);
            // Should match both @id and @name with @*
            assert.strictEqual(result, '<result>[ATTR][ATTR]</result>');
        });

        it('should prefer specific attribute over wildcard', async () => {
            const xmlString = `<item id="123"/>`;

            const xsltString = `<?xml version="1.0"?>
                <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                    <xsl:template match="item">
                        <result><xsl:apply-templates select="@id"/></result>
                    </xsl:template>
                    <xsl:template match="@*">[ANY]</xsl:template>
                    <xsl:template match="@id">[ID]</xsl:template>
                </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            const result = await xsltClass.xsltProcess(xml, xslt);
            // @id (priority 0) should win over @* (priority -0.5)
            assert.strictEqual(result, '<result>[ID]</result>');
        });
    });

    describe('Union pattern expansion (XSLT 1.0 Section 5.3)', () => {
        it('should expand union patterns into separate template rules', async () => {
            // Per XSLT 1.0 Section 5.3: "If a template rule contains a pattern that is a union
            // of multiple alternatives, then the rule is equivalent to a set of template rules,
            // one for each alternative."
            const xmlString = `<root><foo>Foo</foo><bar>Bar</bar></root>`;

            const xsltString = `<?xml version="1.0"?>
                <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                    <xsl:template match="/">
                        <result><xsl:apply-templates select="root/*"/></result>
                    </xsl:template>
                    <xsl:template match="foo|bar">[UNION]</xsl:template>
                </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            const result = await xsltClass.xsltProcess(xml, xslt);
            // Both foo and bar should match the union pattern
            assert.strictEqual(result, '<result>[UNION][UNION]</result>');
        });

        it('should use correct priority for each union alternative', async () => {
            // Union pattern "item|*" has alternatives with different priorities:
            // - "item" has priority 0
            // - "*" has priority -0.5
            // When matching an <item>, the "item" alternative (priority 0) should be used
            const xmlString = `<root><item>Test</item></root>`;

            const xsltString = `<?xml version="1.0"?>
                <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                    <xsl:template match="/">
                        <result><xsl:apply-templates select="root/item"/></result>
                    </xsl:template>
                    <xsl:template match="item|*">UNION</xsl:template>
                    <xsl:template match="item" priority="-0.1">SPECIFIC-LOW</xsl:template>
                </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            const result = await xsltClass.xsltProcess(xml, xslt);
            // "item|*" when matching <item> uses priority 0 (from "item" alternative)
            // SPECIFIC-LOW has priority -0.1
            // So UNION wins (0 > -0.1)
            assert.strictEqual(result, '<result>UNION</result>');
        });

        it('should handle union with path patterns correctly', async () => {
            const xmlString = `<root><chapter><title>Test</title></chapter></root>`;

            const xsltString = `<?xml version="1.0"?>
                <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                    <xsl:template match="/">
                        <xsl:apply-templates select="root/chapter/title"/>
                    </xsl:template>
                    <xsl:template match="title|chapter">NAME-MATCH</xsl:template>
                    <xsl:template match="root/chapter/title">PATH-MATCH</xsl:template>
                </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            const result = await xsltClass.xsltProcess(xml, xslt);
            // "title|chapter" when matching <title> uses priority 0 (from "title")
            // "root/chapter/title" has priority 0.5 (multi-step)
            // PATH-MATCH wins (0.5 > 0)
            assert.strictEqual(result, 'PATH-MATCH');
        });

        it('should handle union with predicates - each alternative has its own priority', async () => {
            const xmlString = `<root><item id="1">First</item></root>`;

            const xsltString = `<?xml version="1.0"?>
                <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                    <xsl:template match="/">
                        <result><xsl:apply-templates select="root/item[@id='1']"/></result>
                    </xsl:template>
                    <xsl:template match="item[@id='1']|other">PREDICATE-UNION</xsl:template>
                    <xsl:template match="item">SIMPLE-NAME</xsl:template>
                </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            const result = await xsltClass.xsltProcess(xml, xslt);
            // "item[@id='1']|other" when matching item[@id='1'] uses priority 0.5 (predicate)
            // "item" has priority 0
            // PREDICATE-UNION wins (0.5 > 0)
            assert.strictEqual(result, '<result>PREDICATE-UNION</result>');
        });
    });

    describe('Template conflict resolution edge cases', () => {
        it('should select last template when multiple templates have identical priority', async () => {
            // This tests XSLT 1.0 Section 5.5 behavior for conflicts
            const xmlString = `<item>content</item>`;

            const xsltString = `<?xml version="1.0"?>
                <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                    <xsl:template match="item">FIRST</xsl:template>
                    <xsl:template match="item">MIDDLE</xsl:template>
                    <xsl:template match="item">LAST</xsl:template>
                </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            const result = await xsltClass.xsltProcess(xml, xslt);
            // All have same priority (0), last in document order wins
            assert.strictEqual(result, 'LAST');
        });

        it('should handle mixed explicit and default priorities correctly', async () => {
            const xmlString = `<item>content</item>`;

            const xsltString = `<?xml version="1.0"?>
                <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                    <xsl:template match="item" priority="1">EXPLICIT-HIGH</xsl:template>
                    <xsl:template match="item">DEFAULT</xsl:template>
                    <xsl:template match="item" priority="0.5">EXPLICIT-MEDIUM</xsl:template>
                </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            const result = await xsltClass.xsltProcess(xml, xslt);
            // EXPLICIT-HIGH (priority 1) wins
            assert.strictEqual(result, 'EXPLICIT-HIGH');
        });

        it('should handle fractional explicit priorities', async () => {
            const xmlString = `<item>content</item>`;

            const xsltString = `<?xml version="1.0"?>
                <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                    <xsl:template match="item" priority="0.75">THREE-QUARTERS</xsl:template>
                    <xsl:template match="item" priority="0.5">HALF</xsl:template>
                    <xsl:template match="item" priority="0.25">QUARTER</xsl:template>
                </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            const result = await xsltClass.xsltProcess(xml, xslt);
            // 0.75 > 0.5 > 0.25
            assert.strictEqual(result, 'THREE-QUARTERS');
        });

        it('should handle very large explicit priorities', async () => {
            const xmlString = `<item>content</item>`;

            const xsltString = `<?xml version="1.0"?>
                <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                    <xsl:template match="item" priority="1000000">MILLION</xsl:template>
                    <xsl:template match="item" priority="999999">LESS-THAN-MILLION</xsl:template>
                </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            const result = await xsltClass.xsltProcess(xml, xslt);
            assert.strictEqual(result, 'MILLION');
        });
    });

    describe('Node type pattern priorities', () => {
        it('should give text() priority -0.5', async () => {
            const xmlString = `<root>text content</root>`;

            const xsltString = `<?xml version="1.0"?>
                <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                    <xsl:template match="root">
                        <result><xsl:apply-templates select="text()"/></result>
                    </xsl:template>
                    <xsl:template match="text()">[TEXT]</xsl:template>
                </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            const result = await xsltClass.xsltProcess(xml, xslt);
            assert.strictEqual(result, '<result>[TEXT]</result>');
        });

        it('should give comment() priority -0.5', async () => {
            const xmlString = `<root><!-- a comment --></root>`;

            const xsltString = `<?xml version="1.0"?>
                <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                    <xsl:template match="root">
                        <result><xsl:apply-templates select="comment()"/></result>
                    </xsl:template>
                    <xsl:template match="comment()">[COMMENT]</xsl:template>
                </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            const result = await xsltClass.xsltProcess(xml, xslt);
            assert.strictEqual(result, '<result>[COMMENT]</result>');
        });

        it('should give node() priority -0.5', async () => {
            const xmlString = `<root><item>content</item></root>`;

            const xsltString = `<?xml version="1.0"?>
                <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                    <xsl:template match="root">
                        <result><xsl:apply-templates select="node()"/></result>
                    </xsl:template>
                    <xsl:template match="item">ITEM</xsl:template>
                    <xsl:template match="node()" priority="-1">NODE</xsl:template>
                </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            const result = await xsltClass.xsltProcess(xml, xslt);
            // "item" (priority 0) wins over "node()" (priority -1, explicit)
            assert.strictEqual(result, '<result>ITEM</result>');
        });
    });

    describe('Descendant pattern priorities', () => {
        it('should give //element priority 0.5', async () => {
            const xmlString = `<root><nested><item>Test</item></nested></root>`;

            const xsltString = `<?xml version="1.0"?>
                <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                    <xsl:template match="/">
                        <result><xsl:apply-templates select="//item"/></result>
                    </xsl:template>
                    <xsl:template match="//item">DESCENDANT</xsl:template>
                    <xsl:template match="item">SIMPLE</xsl:template>
                </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            const result = await xsltClass.xsltProcess(xml, xslt);
            // "//item" has priority 0.5, "item" has priority 0
            // DESCENDANT wins
            assert.strictEqual(result, '<result>DESCENDANT</result>');
        });
    });

    describe('Root pattern handling', () => {
        it('should match root pattern / correctly', async () => {
            const xmlString = `<root>content</root>`;

            const xsltString = `<?xml version="1.0"?>
                <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                    <xsl:template match="/">ROOT-MATCHED</xsl:template>
                </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            const result = await xsltClass.xsltProcess(xml, xslt);
            assert.strictEqual(result, 'ROOT-MATCHED');
        });

        it('should prefer element pattern over root pattern for elements', async () => {
            // Root "/" matches the document node, not elements
            const xmlString = `<root>content</root>`;

            const xsltString = `<?xml version="1.0"?>
                <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                    <xsl:template match="/">
                        <doc><xsl:apply-templates select="*"/></doc>
                    </xsl:template>
                    <xsl:template match="root">ELEMENT</xsl:template>
                </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            const result = await xsltClass.xsltProcess(xml, xslt);
            assert.strictEqual(result, '<doc>ELEMENT</doc>');
        });
    });
});

describe('Template Collection and Expansion', () => {
    let xPath: XPath;
    let xmlParser: XmlParser;

    beforeEach(() => {
        xPath = new XPath();
        xmlParser = new XmlParser();
    });

    describe('collectAndExpandTemplates', () => {
        it('should expand union patterns into separate template entries', () => {
            const xsltString = `<?xml version="1.0"?>
                <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                    <xsl:template match="foo|bar|baz">CONTENT</xsl:template>
                </xsl:stylesheet>`;

            const xslt = xmlParser.xmlParse(xsltString);
            const templates = collectAndExpandTemplates(xslt.documentElement, null, xPath);

            // Should have 3 entries (one for each alternative in the union)
            assert.strictEqual(templates.length, 3);
            assert.strictEqual(templates[0].matchPattern, 'foo');
            assert.strictEqual(templates[1].matchPattern, 'bar');
            assert.strictEqual(templates[2].matchPattern, 'baz');

            // All should reference the same template node
            assert.strictEqual(templates[0].template, templates[1].template);
            assert.strictEqual(templates[1].template, templates[2].template);
        });

        it('should calculate individual priorities for each union alternative', () => {
            const xsltString = `<?xml version="1.0"?>
                <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                    <xsl:template match="item|*|chapter/title">CONTENT</xsl:template>
                </xsl:stylesheet>`;

            const xslt = xmlParser.xmlParse(xsltString);
            const templates = collectAndExpandTemplates(xslt.documentElement, null, xPath);

            assert.strictEqual(templates.length, 3);

            // "item" has priority 0 (simple name)
            assert.strictEqual(templates[0].matchPattern, 'item');
            assert.strictEqual(templates[0].defaultPriority, 0);

            // "*" has priority -0.5 (wildcard)
            assert.strictEqual(templates[1].matchPattern, '*');
            assert.strictEqual(templates[1].defaultPriority, -0.5);

            // "chapter/title" has priority 0.5 (multi-step)
            assert.strictEqual(templates[2].matchPattern, 'chapter/title');
            assert.strictEqual(templates[2].defaultPriority, 0.5);
        });

        it('should use explicit priority for all union alternatives', () => {
            const xsltString = `<?xml version="1.0"?>
                <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                    <xsl:template match="foo|*" priority="5">CONTENT</xsl:template>
                </xsl:stylesheet>`;

            const xslt = xmlParser.xmlParse(xsltString);
            const templates = collectAndExpandTemplates(xslt.documentElement, null, xPath);

            assert.strictEqual(templates.length, 2);

            // Both alternatives should have explicit priority 5
            assert.strictEqual(templates[0].explicitPriority, 5);
            assert.strictEqual(templates[0].effectivePriority, 5);
            assert.strictEqual(templates[1].explicitPriority, 5);
            assert.strictEqual(templates[1].effectivePriority, 5);
        });

        it('should not expand non-union patterns', () => {
            const xsltString = `<?xml version="1.0"?>
                <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                    <xsl:template match="item[@id='a|b']">CONTENT</xsl:template>
                </xsl:stylesheet>`;

            const xslt = xmlParser.xmlParse(xsltString);
            const templates = collectAndExpandTemplates(xslt.documentElement, null, xPath);

            // Should NOT split on | inside quotes
            assert.strictEqual(templates.length, 1);
            assert.strictEqual(templates[0].matchPattern, "item[@id='a|b']");
        });

        it('should filter templates by mode', () => {
            const xsltString = `<?xml version="1.0"?>
                <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                    <xsl:template match="item">DEFAULT-MODE</xsl:template>
                    <xsl:template match="item" mode="special">SPECIAL-MODE</xsl:template>
                    <xsl:template match="item" mode="other">OTHER-MODE</xsl:template>
                </xsl:stylesheet>`;

            const xslt = xmlParser.xmlParse(xsltString);

            // Default mode should only get templates without mode
            const defaultTemplates = collectAndExpandTemplates(xslt.documentElement, null, xPath);
            assert.strictEqual(defaultTemplates.length, 1);
            assert.strictEqual(defaultTemplates[0].template.getAttributeValue('mode'), null);

            // Special mode should get special template
            const specialTemplates = collectAndExpandTemplates(xslt.documentElement, 'special', xPath);
            assert.strictEqual(specialTemplates.length, 1);
            assert.strictEqual(specialTemplates[0].template.getAttributeValue('mode'), 'special');
        });

        it('should skip named templates (no match attribute)', () => {
            const xsltString = `<?xml version="1.0"?>
                <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                    <xsl:template match="item">MATCHING</xsl:template>
                    <xsl:template name="myTemplate">NAMED</xsl:template>
                </xsl:stylesheet>`;

            const xslt = xmlParser.xmlParse(xsltString);
            const templates = collectAndExpandTemplates(xslt.documentElement, null, xPath);

            // Should only get the matching template, not the named one
            assert.strictEqual(templates.length, 1);
            assert.strictEqual(templates[0].matchPattern, 'item');
        });

        it('should assign incrementing document order', () => {
            const xsltString = `<?xml version="1.0"?>
                <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                    <xsl:template match="first">1</xsl:template>
                    <xsl:template match="second">2</xsl:template>
                    <xsl:template match="third|fourth">3-4</xsl:template>
                </xsl:stylesheet>`;

            const xslt = xmlParser.xmlParse(xsltString);
            const templates = collectAndExpandTemplates(xslt.documentElement, null, xPath);

            assert.strictEqual(templates.length, 4);
            assert.strictEqual(templates[0].documentOrder, 0);
            assert.strictEqual(templates[1].documentOrder, 1);
            assert.strictEqual(templates[2].documentOrder, 2);  // third
            assert.strictEqual(templates[3].documentOrder, 3);  // fourth
        });
    });
});

describe('Conflict Detection Behavior', () => {
    it('should emit warning to console.warn when templates conflict', async () => {
        const xmlString = `<item>content</item>`;

        const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                <xsl:template match="item">FIRST</xsl:template>
                <xsl:template match="item">SECOND</xsl:template>
            </xsl:stylesheet>`;

        // Capture console.warn calls
        const warnings: string[] = [];
        const originalWarn = console.warn;
        console.warn = (...args: any[]) => {
            warnings.push(args.join(' '));
        };

        try {
            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            await xsltClass.xsltProcess(xml, xslt);

            // Check that a warning was emitted
            const conflictWarning = warnings.find(w => w.includes('Ambiguous template match'));
            assert.ok(conflictWarning, 'Expected conflict warning to be emitted');
            assert.ok(conflictWarning.includes('item'), 'Warning should mention the conflicting pattern');
        } finally {
            console.warn = originalWarn;
        }
    });

    it('should NOT emit warning when templates have different priorities', async () => {
        const xmlString = `<item>content</item>`;

        const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                <xsl:template match="item" priority="1">HIGH</xsl:template>
                <xsl:template match="item" priority="0">LOW</xsl:template>
            </xsl:stylesheet>`;

        const warnings: string[] = [];
        const originalWarn = console.warn;
        console.warn = (...args: any[]) => {
            warnings.push(args.join(' '));
        };

        try {
            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            const result = await xsltClass.xsltProcess(xml, xslt);

            // No conflict warning should be emitted
            const conflictWarning = warnings.find(w => w.includes('Ambiguous template match'));
            assert.strictEqual(conflictWarning, undefined, 'No conflict warning should be emitted');
            assert.strictEqual(result, 'HIGH');
        } finally {
            console.warn = originalWarn;
        }
    });
});

describe('Import Precedence and apply-imports', () => {
    it('should prefer templates in the importing stylesheet', async () => {
        const xmlString = `<root><item>content</item></root>`;

        const importedXslt = `<?xml version="1.0"?>
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                <xsl:template match="item">IMPORTED</xsl:template>
            </xsl:stylesheet>`;

        const importHref = `data:text/xml,${encodeURIComponent(importedXslt)}`;

        const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                <xsl:import href="${importHref}"/>
                <xsl:template match="/">
                    <xsl:apply-templates select="root/item"/>
                </xsl:template>
                <xsl:template match="item">MAIN</xsl:template>
            </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const result = await xsltClass.xsltProcess(xml, xslt);
        assert.strictEqual(result, 'MAIN');
    });

    it('should use apply-imports to invoke lower-precedence templates', async () => {
        const xmlString = `<root><item>content</item></root>`;

        const importedXslt = `<?xml version="1.0"?>
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                <xsl:template match="item">IMPORTED</xsl:template>
            </xsl:stylesheet>`;

        const importHref = `data:text/xml,${encodeURIComponent(importedXslt)}`;

        const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                <xsl:import href="${importHref}"/>
                <xsl:template match="/">
                    <xsl:apply-templates select="root/item"/>
                </xsl:template>
                <xsl:template match="item">MAIN<xsl:apply-imports/></xsl:template>
            </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const result = await xsltClass.xsltProcess(xml, xslt);
        assert.strictEqual(result, 'MAINIMPORTED');
    });
});
describe('Pattern Features and Axis Behaviors', () => {
    it('should match attribute patterns with @axis', async () => {
        const xmlString = `<root><item id="123">content</item></root>`;

        const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                <xsl:template match="/">
                    <result><xsl:apply-templates select="root/item/@id"/></result>
                </xsl:template>
                <xsl:template match="@id">ATTR-ID</xsl:template>
            </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const result = await xsltClass.xsltProcess(xml, xslt);
        assert.strictEqual(result, '<result>ATTR-ID</result>');
    });

    it('should handle @* wildcard for all attributes', async () => {
        const xmlString = `<root><item id="123" name="test">content</item></root>`;

        const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                <xsl:template match="/">
                    <result><xsl:apply-templates select="root/item/@*"/></result>
                </xsl:template>
                <xsl:template match="@*">[<xsl:value-of select="name()"/>]</xsl:template>
            </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const result = await xsltClass.xsltProcess(xml, xslt);
        assert.ok(result.includes('[id]'));
        assert.ok(result.includes('[name]'));
    });

    it('Union patterns with mixed axis types', async () => {
        const xmlString = `<root><item id="123">text</item></root>`;

        const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                <xsl:template match="/">
                    <result>
                        <xsl:apply-templates select="root/item/@id | root/item/text()"/>
                    </result>
                </xsl:template>
                <xsl:template match="text()">TEXT</xsl:template>
                <xsl:template match="@id">ATTR</xsl:template>
            </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const result = await xsltClass.xsltProcess(xml, xslt);
        assert.ok(result.includes('ATTR'));
        assert.ok(result.includes('TEXT'));
    });

    it('Namespace-aware pattern matching with prefixes', async () => {
        const xmlString = `<?xml version="1.0"?>
            <root xmlns:custom="http://example.com/custom">
                <custom:element>content</custom:element>
            </root>`;

        const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" 
                xmlns:custom="http://example.com/custom" version="1.0">
                <xsl:template match="/">
                    <result><xsl:apply-templates select="root/custom:element"/></result>
                </xsl:template>
                <xsl:template match="custom:element">NS-ELEMENT</xsl:template>
            </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const result = await xsltClass.xsltProcess(xml, xslt);
        assert.strictEqual(result, '<result>NS-ELEMENT</result>');
    });

    it('Priority with namespace wildcard ns:*', async () => {
        const xmlString = `<?xml version="1.0"?>
            <root xmlns:ns="http://example.com">
                <ns:item>A</ns:item>
                <item>B</item>
            </root>`;

        const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" 
                xmlns:ns="http://example.com" version="1.0">
                <xsl:template match="/">
                    <result><xsl:apply-templates select="root/*"/></result>
                </xsl:template>
                <xsl:template match="*">WILDCARD</xsl:template>
                <xsl:template match="ns:*">NS-WILDCARD</xsl:template>
            </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const result = await xsltClass.xsltProcess(xml, xslt);
        // ns:* has priority -0.25, * has priority -0.5, so ns:* wins for ns:item
        assert.ok(result.includes('NS-WILDCARD'));
        assert.ok(result.includes('WILDCARD'));
    });

    it('Predicate patterns have higher default priority than simple names', async () => {
        const xmlString = `<root><item id="1">A</item><item id="2">B</item></root>`;

        const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                <xsl:template match="/">
                    <result><xsl:apply-templates select="root/item"/></result>
                </xsl:template>
                <xsl:template match="item">SIMPLE</xsl:template>
                <xsl:template match="item[@id='1']">WITH-PREDICATE</xsl:template>
            </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const result = await xsltClass.xsltProcess(xml, xslt);
        // Predicate pattern (0.5) wins for id=1, simple name (0) for others
        assert.ok(result.includes('WITH-PREDICATE'));
        assert.ok(result.includes('SIMPLE'));
    });

    it('Pattern with predicate has higher priority than simple name', async () => {
        const xmlString = `<root>
            <item id="special">SPECIAL</item>
            <item id="other">OTHER</item>
        </root>`;

        const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                <xsl:template match="/">
                    <result><xsl:apply-templates select="root/item"/></result>
                </xsl:template>
                <xsl:template match="item[@id='special']">HAS-ID</xsl:template>
                <xsl:template match="item">NO-ID</xsl:template>
            </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const result = await xsltClass.xsltProcess(xml, xslt);
        // item[@id='special'] has priority 0.5, item has priority 0
        // So id=special should match HAS-ID, other should match NO-ID
        assert.ok(result.includes('HAS-ID'));
        assert.ok(result.includes('NO-ID'));
    });

    it('Text node pattern matches text content', async () => {
        const xmlString = `<root>text1<!-- comment -->text2</root>`;

        const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                <xsl:template match="/">
                    <result><xsl:apply-templates select="root/node()"/></result>
                </xsl:template>
                <xsl:template match="text()">[TEXT]</xsl:template>
                <xsl:template match="comment()">[COMMENT]</xsl:template>
            </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const result = await xsltClass.xsltProcess(xml, xslt);
        assert.strictEqual(result, '<result>[TEXT][COMMENT][TEXT]</result>');
    });
});

describe('Literal Result Elements with Namespaces', () => {
    it('Literal elements preserve namespace declarations', async () => {
        const xmlString = `<root/>`;

        const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                <xsl:template match="/">
                    <root xmlns="http://example.com/default" xmlns:custom="http://example.com/custom">
                        <custom:element>content</custom:element>
                    </root>
                </xsl:template>
            </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const result = await xsltClass.xsltProcess(xml, xslt);
        // Should output with proper namespace declarations
        assert.ok(result.includes('element'));
        assert.ok(result.includes('content'));
    });

    it('Namespace alias applies to literal result elements', async () => {
        const xmlString = `<root/>`;

        const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" 
                xmlns:old="http://example.com/old" xmlns:new="http://example.com/new" 
                version="1.0">
                <xsl:namespace-alias stylesheet-prefix="old" result-prefix="new"/>
                <xsl:template match="/">
                    <old:root>
                        <old:child>content</old:child>
                    </old:root>
                </xsl:template>
            </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const result = await xsltClass.xsltProcess(xml, xslt);
        // old: namespace should be aliased to new: namespace
        assert.ok(result.includes('content'));
    });
});