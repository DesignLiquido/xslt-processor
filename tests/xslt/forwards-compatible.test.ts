import assert from 'assert';

import { Xslt } from '../../src/xslt';
import { XmlParser } from '../../src/dom';

describe('Forwards-Compatible Processing (XSLT 1.0 Section 2.5)', () => {
    let xsltClass: Xslt;
    let xmlParser: XmlParser;

    beforeEach(() => {
        xsltClass = new Xslt();
        xmlParser = new XmlParser();
    });

    describe('Version detection', () => {
        it('should process version="1.0" normally', async () => {
            const xmlString = `<root>content</root>`;
            const xsltString = `<?xml version="1.0"?>
                <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    <xsl:template match="/">
                        <result>OK</result>
                    </xsl:template>
                </xsl:stylesheet>`;

            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            assert.strictEqual(result, '<result>OK</result>');
            assert.strictEqual(xsltClass.forwardsCompatible, false);
        });

        it('should process version="2.0" normally (supported)', async () => {
            const xmlString = `<root>content</root>`;
            const xsltString = `<?xml version="1.0"?>
                <xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    <xsl:template match="/">
                        <result>OK</result>
                    </xsl:template>
                </xsl:stylesheet>`;

            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            assert.strictEqual(result, '<result>OK</result>');
            assert.strictEqual(xsltClass.forwardsCompatible, false);
        });

        it('should process version="3.0" normally (supported)', async () => {
            const xmlString = `<root>content</root>`;
            const xsltString = `<?xml version="1.0"?>
                <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    <xsl:template match="/">
                        <result>OK</result>
                    </xsl:template>
                </xsl:stylesheet>`;

            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            assert.strictEqual(result, '<result>OK</result>');
            assert.strictEqual(xsltClass.forwardsCompatible, false);
        });

        it('should enter forwards-compatible mode for version="4.0"', async () => {
            const xmlString = `<root>content</root>`;
            const xsltString = `<?xml version="1.0"?>
                <xsl:stylesheet version="4.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    <xsl:template match="/">
                        <result>OK</result>
                    </xsl:template>
                </xsl:stylesheet>`;

            // Capture console.warn
            const warnings: string[] = [];
            const originalWarn = console.warn;
            console.warn = (...args: any[]) => warnings.push(args.join(' '));

            // Create xsltClass AFTER patching console.warn so warnings are captured
            const localXsltClass = new Xslt();

            try {
                const xml = xmlParser.xmlParse(xmlString);
                const xslt = xmlParser.xmlParse(xsltString);
                const result = await localXsltClass.xsltProcess(xml, xslt);

                assert.strictEqual(result, '<result>OK</result>');
                assert.strictEqual(localXsltClass.forwardsCompatible, true);
                assert.strictEqual(localXsltClass.version, '4.0');

                // Should emit a warning
                const fcWarning = warnings.find(w => w.includes('forwards-compatible'));
                assert.ok(fcWarning, 'Expected forwards-compatible warning');
            } finally {
                console.warn = originalWarn;
            }
        });

        it('should enter forwards-compatible mode for version="1.1"', async () => {
            const xmlString = `<root>content</root>`;
            const xsltString = `<?xml version="1.0"?>
                <xsl:stylesheet version="1.1" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    <xsl:template match="/">
                        <result>OK</result>
                    </xsl:template>
                </xsl:stylesheet>`;

            // Suppress warning for test
            const originalWarn = console.warn;
            console.warn = () => {};

            try {
                const xml = xmlParser.xmlParse(xmlString);
                const xslt = xmlParser.xmlParse(xsltString);
                const result = await xsltClass.xsltProcess(xml, xslt);

                assert.strictEqual(result, '<result>OK</result>');
                assert.strictEqual(xsltClass.forwardsCompatible, true);
            } finally {
                console.warn = originalWarn;
            }
        });

        it('should throw error for invalid version (negative)', async () => {
            const xmlString = `<root>content</root>`;
            const xsltString = `<?xml version="1.0"?>
                <xsl:stylesheet version="-1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    <xsl:template match="/"><result>OK</result></xsl:template>
                </xsl:stylesheet>`;

            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            await assert.rejects(
                async () => await xsltClass.xsltProcess(xml, xslt),
                /version not defined or invalid/i
            );
        });

        it('should throw error for invalid version (non-numeric)', async () => {
            const xmlString = `<root>content</root>`;
            const xsltString = `<?xml version="1.0"?>
                <xsl:stylesheet version="abc" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    <xsl:template match="/"><result>OK</result></xsl:template>
                </xsl:stylesheet>`;

            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            await assert.rejects(
                async () => await xsltClass.xsltProcess(xml, xslt),
                /version not defined or invalid/i
            );
        });
    });

    describe('Unknown XSLT instructions', () => {
        it('should throw error for unknown instruction in version="1.0"', async () => {
            const xmlString = `<root>content</root>`;
            const xsltString = `<?xml version="1.0"?>
                <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    <xsl:template match="/">
                        <result>
                            <xsl:future-feature/>
                        </result>
                    </xsl:template>
                </xsl:stylesheet>`;

            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            await assert.rejects(
                async () => await xsltClass.xsltProcess(xml, xslt),
                /Unknown XSLT instruction.*future-feature/i
            );
        });

        it('should silently ignore unknown instruction in forwards-compatible mode', async () => {
            const xmlString = `<root>content</root>`;
            const xsltString = `<?xml version="1.0"?>
                <xsl:stylesheet version="4.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    <xsl:template match="/">
                        <result>
                            <xsl:future-feature/>
                            <span>OK</span>
                        </result>
                    </xsl:template>
                </xsl:stylesheet>`;

            // Suppress warning
            const originalWarn = console.warn;
            console.warn = () => {};

            try {
                const xml = xmlParser.xmlParse(xmlString);
                const xslt = xmlParser.xmlParse(xsltString);
                const result = await xsltClass.xsltProcess(xml, xslt);

                // Unknown instruction is silently ignored
                assert.strictEqual(result, '<result><span>OK</span></result>');
            } finally {
                console.warn = originalWarn;
            }
        });

        it('should execute xsl:fallback for unknown instruction in forwards-compatible mode', async () => {
            const xmlString = `<root>content</root>`;
            const xsltString = `<?xml version="1.0"?>
                <xsl:stylesheet version="4.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    <xsl:template match="/">
                        <result>
                            <xsl:future-feature>
                                <xsl:fallback>
                                    <span>FALLBACK</span>
                                </xsl:fallback>
                            </xsl:future-feature>
                        </result>
                    </xsl:template>
                </xsl:stylesheet>`;

            // Suppress warning
            const originalWarn = console.warn;
            console.warn = () => {};

            try {
                const xml = xmlParser.xmlParse(xmlString);
                const xslt = xmlParser.xmlParse(xsltString);
                const result = await xsltClass.xsltProcess(xml, xslt);

                // Fallback content should be executed
                assert.strictEqual(result, '<result><span>FALLBACK</span></result>');
            } finally {
                console.warn = originalWarn;
            }
        });

        it('should execute xsl:fallback with XSLT content', async () => {
            const xmlString = `<root><item>test</item></root>`;
            const xsltString = `<?xml version="1.0"?>
                <xsl:stylesheet version="4.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    <xsl:template match="/">
                        <result>
                            <xsl:future-sort-feature select="root/item">
                                <xsl:fallback>
                                    <xsl:value-of select="root/item"/>
                                </xsl:fallback>
                            </xsl:future-sort-feature>
                        </result>
                    </xsl:template>
                </xsl:stylesheet>`;

            // Suppress warning
            const originalWarn = console.warn;
            console.warn = () => {};

            try {
                const xml = xmlParser.xmlParse(xmlString);
                const xslt = xmlParser.xmlParse(xsltString);
                const result = await xsltClass.xsltProcess(xml, xslt);

                // Fallback should execute xsl:value-of
                assert.strictEqual(result, '<result>test</result>');
            } finally {
                console.warn = originalWarn;
            }
        });

        it('should execute only first xsl:fallback if multiple exist', async () => {
            const xmlString = `<root>content</root>`;
            const xsltString = `<?xml version="1.0"?>
                <xsl:stylesheet version="4.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    <xsl:template match="/">
                        <result>
                            <xsl:future-feature>
                                <xsl:fallback><span>FIRST</span></xsl:fallback>
                                <xsl:fallback><span>SECOND</span></xsl:fallback>
                            </xsl:future-feature>
                        </result>
                    </xsl:template>
                </xsl:stylesheet>`;

            // Suppress warning
            const originalWarn = console.warn;
            console.warn = () => {};

            try {
                const xml = xmlParser.xmlParse(xmlString);
                const xslt = xmlParser.xmlParse(xsltString);
                const result = await xsltClass.xsltProcess(xml, xslt);

                // Only first fallback should be executed
                assert.strictEqual(result, '<result><span>FIRST</span></result>');
            } finally {
                console.warn = originalWarn;
            }
        });
    });

    describe('Unknown top-level elements', () => {
        it('should silently ignore unknown top-level XSLT element in forwards-compatible mode', async () => {
            const xmlString = `<root>content</root>`;
            const xsltString = `<?xml version="1.0"?>
                <xsl:stylesheet version="4.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    <xsl:future-declaration name="test"/>
                    <xsl:template match="/">
                        <result>OK</result>
                    </xsl:template>
                </xsl:stylesheet>`;

            // Suppress warning
            const originalWarn = console.warn;
            console.warn = () => {};

            try {
                const xml = xmlParser.xmlParse(xmlString);
                const xslt = xmlParser.xmlParse(xsltString);
                const result = await xsltClass.xsltProcess(xml, xslt);

                // Unknown top-level element is ignored, templates work
                assert.strictEqual(result, '<result>OK</result>');
            } finally {
                console.warn = originalWarn;
            }
        });
    });

    describe('Unknown attributes', () => {
        it('should allow unknown attributes on xsl:stylesheet', async () => {
            const xmlString = `<root>content</root>`;
            const xsltString = `<?xml version="1.0"?>
                <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                                future-attribute="value">
                    <xsl:template match="/">
                        <result>OK</result>
                    </xsl:template>
                </xsl:stylesheet>`;

            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            // Unknown attributes are allowed (per spec, processor may report error but doesn't have to)
            assert.strictEqual(result, '<result>OK</result>');
        });
    });

    describe('xsl:fallback usage', () => {
        it('should throw error when xsl:fallback is used outside extension element', async () => {
            const xmlString = `<root>content</root>`;
            const xsltString = `<?xml version="1.0"?>
                <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    <xsl:template match="/">
                        <result>
                            <xsl:fallback>Invalid</xsl:fallback>
                        </result>
                    </xsl:template>
                </xsl:stylesheet>`;

            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            await assert.rejects(
                async () => await xsltClass.xsltProcess(xml, xslt),
                /xsl:fallback.*must be.*child.*extension element/i
            );
        });
    });

    describe('Real-world scenarios', () => {
        it('should handle stylesheet with future features gracefully', async () => {
            const xmlString = `<catalog>
                <book><title>Book 1</title><price>10</price></book>
                <book><title>Book 2</title><price>20</price></book>
            </catalog>`;

            const xsltString = `<?xml version="1.0"?>
                <xsl:stylesheet version="5.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    <xsl:template match="/">
                        <html>
                            <body>
                                <h1>Books</h1>
                                <xsl:for-each select="catalog/book">
                                    <div>
                                        <xsl:streaming-mode>
                                            <xsl:fallback>
                                                <xsl:value-of select="title"/>
                                            </xsl:fallback>
                                        </xsl:streaming-mode>
                                    </div>
                                </xsl:for-each>
                            </body>
                        </html>
                    </xsl:template>
                </xsl:stylesheet>`;

            // Suppress warning
            const originalWarn = console.warn;
            console.warn = () => {};

            try {
                const xml = xmlParser.xmlParse(xmlString);
                const xslt = xmlParser.xmlParse(xsltString);
                const result = await xsltClass.xsltProcess(xml, xslt);

                assert.ok(result.includes('<h1>Books</h1>'));
                assert.ok(result.includes('<div>Book 1</div>'));
                assert.ok(result.includes('<div>Book 2</div>'));
            } finally {
                console.warn = originalWarn;
            }
        });
    });
});
