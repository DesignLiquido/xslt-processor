import assert from 'assert';

import { Xslt } from '../../src/xslt';
import { XmlParser } from '../../src/dom';
import { XPath } from '../../src/xpath-legacy';
import { calculateDefaultPriority } from '../../src/xslt/functions';

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
});
