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

        it('should reject invalid version attribute', async () => {
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

            // Should throw an error
            try {
                await xsltClass.xsltProcess(xml, xslt);
                assert.fail('Should have thrown an error for invalid version');
            } catch (e: any) {
                assert(e.message.includes('XSLT version not defined or invalid'));
                assert(e.message.includes('2.5'));
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
        it('should combine version and id validation', async () => {
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

            // Should throw error (first validation failure is version)
            try {
                await xsltClass.xsltProcess(xml, xslt);
                assert.fail('Should have thrown validation error');
            } catch (e: any) {
                // Should catch on version (first validation in order)
                assert(e.message.includes('XSLT version'));
            }
        });
    });
});
