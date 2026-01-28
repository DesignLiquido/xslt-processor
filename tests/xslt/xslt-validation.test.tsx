/* eslint-disable no-undef */

// Copyright 2023-2026 Design Liquido
// Tests for XSLT stylesheet/transform element validation

import assert from 'assert';

import { XmlParser } from '../../src/dom';
import { Xslt } from '../../src/xslt';

describe('xslt-validation', () => {
    describe('xsl:stylesheet validation', () => {
        it('should accept valid version attribute (1.0)', async () => {
            const xmlString = `<root/>`;
            const xsltString = `<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:template match="/">
                    <output />
                </xsl:template>
            </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            // Should not throw
            await xsltClass.xsltProcess(xml, xslt);
            assert.strictEqual(xsltClass.version, '1.0');
        });

        it('should accept valid version attribute (2.0)', async () => {
            const xmlString = `<root/>`;
            const xsltString = `<xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:template match="/">
                    <output />
                </xsl:template>
            </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            // Should not throw
            await xsltClass.xsltProcess(xml, xslt);
            assert.strictEqual(xsltClass.version, '2.0');
        });

        it('should accept valid version attribute (3.0)', async () => {
            const xmlString = `<root/>`;
            const xsltString = `<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:template match="/">
                    <output />
                </xsl:template>
            </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            // Should not throw
            await xsltClass.xsltProcess(xml, xslt);
            assert.strictEqual(xsltClass.version, '3.0');
        });

        it('should enter forwards-compatible mode for unknown version (2.5)', async () => {
            // Per XSLT 1.0 Section 2.5, versions > 1.0 that aren't explicitly supported
            // should enter forwards-compatible processing mode
            const xmlString = `<root/>`;
            const xsltString = `<xsl:stylesheet version="2.5" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:template match="/">
                    <output />
                </xsl:template>
            </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            // Suppress warning for test
            const originalWarn = console.warn;
            console.warn = () => {};

            try {
                // Should NOT throw - should enter forwards-compatible mode
                await xsltClass.xsltProcess(xml, xslt);
                assert.strictEqual(xsltClass.forwardsCompatible, true);
                assert.strictEqual(xsltClass.version, '2.5');
            } finally {
                console.warn = originalWarn;
            }
        });

        it('should reject truly invalid version (non-numeric)', async () => {
            const xmlString = `<root/>`;
            const xsltString = `<xsl:stylesheet version="invalid" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:template match="/">
                    <output />
                </xsl:template>
            </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            // Should throw an error for non-numeric version
            try {
                await xsltClass.xsltProcess(xml, xslt);
                assert.fail('Should have thrown an error for invalid version');
            } catch (e: any) {
                assert(e.message.includes('XSLT version not defined or invalid'));
            }
        });

        it('should validate id attribute format', async () => {
            const xmlString = `<root/>`;
            const xsltString = `<xsl:stylesheet version="1.0" id="123invalid" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:template match="/">
                    <output />
                </xsl:template>
            </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            // Should throw an error for invalid id (cannot start with digit)
            try {
                await xsltClass.xsltProcess(xml, xslt);
                assert.fail('Should have thrown an error for invalid id attribute');
            } catch (e: any) {
                assert(e.message.includes('Invalid id attribute'));
            }
        });

        it('should accept valid id attribute', async () => {
            const xmlString = `<root/>`;
            const xsltString = `<xsl:stylesheet version="1.0" id="validId" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:template match="/">
                    <output />
                </xsl:template>
            </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            // Should not throw
            await xsltClass.xsltProcess(xml, xslt);
        });

        it('should validate extension-element-prefixes attribute', async () => {
            const xmlString = `<root/>`;
            const xsltString = `<xsl:stylesheet version="1.0" extension-element-prefixes="123invalid" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:template match="/">
                    <output />
                </xsl:template>
            </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            // Should throw an error for invalid prefix
            try {
                await xsltClass.xsltProcess(xml, xslt);
                assert.fail('Should have thrown an error for invalid extension-element-prefixes');
            } catch (e: any) {
                assert(e.message.includes('Invalid prefix in extension-element-prefixes'));
            }
        });

        it('should accept valid extension-element-prefixes attribute', async () => {
            const xmlString = `<root/>`;
            const xsltString = `<xsl:stylesheet version="1.0" extension-element-prefixes="ext1 ext2" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:template match="/">
                    <output />
                </xsl:template>
            </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            // Should not throw
            await xsltClass.xsltProcess(xml, xslt);
        });

        it('should validate exclude-result-prefixes attribute', async () => {
            const xmlString = `<root/>`;
            const xsltString = `<xsl:stylesheet version="1.0" exclude-result-prefixes="123invalid" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:template match="/">
                    <output />
                </xsl:template>
            </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            // Should throw an error for invalid prefix
            try {
                await xsltClass.xsltProcess(xml, xslt);
                assert.fail('Should have thrown an error for invalid exclude-result-prefixes');
            } catch (e: any) {
                assert(e.message.includes('Invalid prefix in exclude-result-prefixes'));
            }
        });

        it('should accept #all in exclude-result-prefixes', async () => {
            const xmlString = `<root/>`;
            const xsltString = `<xsl:stylesheet version="1.0" exclude-result-prefixes="#all" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:template match="/">
                    <output />
                </xsl:template>
            </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            // Should not throw
            await xsltClass.xsltProcess(xml, xslt);
        });

        it('should accept valid exclude-result-prefixes attribute', async () => {
            const xmlString = `<root/>`;
            const xsltString = `<xsl:stylesheet version="1.0" exclude-result-prefixes="ext1 ext2" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:template match="/">
                    <output />
                </xsl:template>
            </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            // Should not throw
            await xsltClass.xsltProcess(xml, xslt);
        });

        it('should validate default-collation attribute is not empty', async () => {
            const xmlString = `<root/>`;
            const xsltString = `<xsl:stylesheet version="2.0" default-collation="" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:template match="/">
                    <output />
                </xsl:template>
            </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            // Should throw an error for empty default-collation
            try {
                await xsltClass.xsltProcess(xml, xslt);
                assert.fail('Should have thrown an error for empty default-collation');
            } catch (e: any) {
                assert(e.message.includes('default-collation attribute must contain a URI'));
            }
        });

        it('should accept valid default-collation attribute', async () => {
            const xmlString = `<root/>`;
            const xsltString = `<xsl:stylesheet version="2.0" default-collation="http://www.w3.org/2005/xpath-functions/collation/codepoint" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:template match="/">
                    <output />
                </xsl:template>
            </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            // Should not throw
            await xsltClass.xsltProcess(xml, xslt);
        });

        it('should handle namespace declarations correctly', async () => {
            const xmlString = `<root/>`;
            const xsltString = `<xsl:stylesheet version="1.0" 
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:custom="http://example.com/custom"
                xmlns="http://example.com/default">
                <xsl:template match="/">
                    <output />
                </xsl:template>
            </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            // Should not throw and should register namespaces
            await xsltClass.xsltProcess(xml, xslt);
        });

        it('should use xsl:transform as alternative to xsl:stylesheet', async () => {
            const xmlString = `<root/>`;
            const xsltString = `<xsl:transform version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:template match="/">
                    <output />
                </xsl:template>
            </xsl:transform>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            // Should not throw
            await xsltClass.xsltProcess(xml, xslt);
            assert.strictEqual(xsltClass.version, '1.0');
        });

        it('should validate xsl:import is first child', async () => {
            const xmlString = `<root/>`;
            const xsltString = `<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:template match="/"/>
                <xsl:import href="other.xsl"/>
            </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            // Should throw an error because xsl:import is not first
            try {
                await xsltClass.xsltProcess(xml, xslt);
                assert.fail('Should have thrown an error for xsl:import not being first child');
            } catch (e: any) {
                assert(e.message.includes('<xsl:import> should be the first child node'));
            }
        });
    });

    describe('Multiple validations', () => {
        it('should catch id validation error even with unknown version (forwards-compatible)', async () => {
            // Per XSLT 1.0 Section 2.5, version "1.5" enters forwards-compatible mode
            // but id validation still happens and should catch the invalid id
            const xmlString = `<root/>`;
            const xsltString = `<xsl:stylesheet version="1.5" id="123invalid" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:template match="/">
                    <output />
                </xsl:template>
            </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            // Suppress forwards-compatible warning
            const originalWarn = console.warn;
            console.warn = () => {};

            try {
                // Should throw error for invalid id (version 1.5 enters FC mode, id is still validated)
                await xsltClass.xsltProcess(xml, xslt);
                assert.fail('Should have thrown validation error');
            } catch (e: any) {
                // Should catch on invalid id
                assert(e.message.includes('Invalid id attribute'));
            } finally {
                console.warn = originalWarn;
            }
        });

        it('should throw version error for truly invalid version before checking id', async () => {
            const xmlString = `<root/>`;
            const xsltString = `<xsl:stylesheet version="-1" id="123invalid" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:template match="/">
                    <output />
                </xsl:template>
            </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            // Should throw error for invalid version first
            try {
                await xsltClass.xsltProcess(xml, xslt);
                assert.fail('Should have thrown validation error');
            } catch (e: any) {
                // Should catch on version (first validation in order)
                assert(e.message.includes('XSLT version not defined or invalid'));
            }
        });
    });
});
