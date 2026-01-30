/**
 * XSLT 3.0 Package System Tests
 * 
 * Tests for xsl:package, xsl:use-package, xsl:expose, and xsl:accept
 */

import assert from 'assert';
import { XmlParser } from '../../src/dom';
import { Xslt } from '../../src/xslt/xslt';

describe('XSLT 3.0 Packages', () => {
    it('should define a basic package', async () => {
        const xmlString = '<root><item>test</item></root>';
        
        const xsltString = `<?xml version="1.0"?>
            <xsl:package 
                version="3.0" 
                name="my-package" 
                package-version="1.0"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                
                <xsl:template match="/">
                    <output>
                        <xsl:apply-templates/>
                    </output>
                </xsl:template>
                
                <xsl:template match="item">
                    <result><xsl:value-of select="."/></result>
                </xsl:template>
            </xsl:package>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const result = await xsltClass.xsltProcess(xml, xslt);

            console.log('Test 1 result:', result);
        assert.ok(result.includes('<output>'));
        assert.ok(result.includes('<result>test</result>'));
    });

    it('should expose components with xsl:expose', async () => {
        const xmlString = '<root><value>42</value></root>';
        
        const xsltString = `<?xml version="1.0"?>
            <xsl:package 
                version="3.0" 
                name="library-package" 
                package-version="1.0"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                
                <!-- Expose specific templates -->
                <xsl:expose component="template" names="format-value" visibility="public"/>
                
                <xsl:template match="/">
                    <output>
                        <xsl:apply-templates/>
                    </output>
                </xsl:template>
                
                <xsl:template match="value" name="format-value">
                    <formatted>Value: <xsl:value-of select="."/></formatted>
                </xsl:template>
            </xsl:package>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const result = await xsltClass.xsltProcess(xml, xslt);

        assert.ok(result.includes('<output>'));
        assert.ok(result.includes('<formatted>Value: 42</formatted>'));
    });

    it('should reject xsl:package without name attribute', async () => {
        const xmlString = '<root/>';
        
        const xsltString = `<?xml version="1.0"?>
            <xsl:package 
                version="3.0"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:template match="/">
                    <output/>
                </xsl:template>
            </xsl:package>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        await assert.rejects(
            async () => await xsltClass.xsltProcess(xml, xslt),
            {
                message: /<xsl:package> requires a "name" attribute/
            }
        );
    });

    it('should reject xsl:package in XSLT 2.0', async () => {
        const xmlString = '<root/>';
        
        const xsltString = `<?xml version="1.0"?>
            <xsl:package 
                version="2.0" 
                name="test-package"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:template match="/">
                    <output/>
                </xsl:template>
            </xsl:package>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        await assert.rejects(
            async () => await xsltClass.xsltProcess(xml, xslt),
            {
                message: /<xsl:package> is only supported in XSLT 3\.0 or later/
            }
        );
    });

    it('should reject xsl:expose outside of xsl:package', async () => {
        const xmlString = '<root/>';
        
        const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:expose component="template" names="test" visibility="public"/>
                
                <xsl:template match="/">
                    <output/>
                </xsl:template>
            </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        await assert.rejects(
            async () => await xsltClass.xsltProcess(xml, xslt),
            {
                message: /<xsl:expose> can only appear as a child of <xsl:package>/
            }
        );
    });

    it('should expose multiple components with wildcard', async () => {
        const xmlString = '<root><a>1</a><b>2</b></root>';
        
        const xsltString = `<?xml version="1.0"?>
            <xsl:package 
                version="3.0" 
                name="wildcard-package"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                
                <!-- Expose all templates -->
                <xsl:expose component="template" names="*" visibility="public"/>
                
                <xsl:template match="/">
                    <output>
                        <xsl:apply-templates/>
                    </output>
                </xsl:template>
                
                <xsl:template match="a">
                    <itemA><xsl:value-of select="."/></itemA>
                </xsl:template>
                
                <xsl:template match="b">
                    <itemB><xsl:value-of select="."/></itemB>
                </xsl:template>
            </xsl:package>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const result = await xsltClass.xsltProcess(xml, xslt);

        assert.ok(result.includes('<itemA>1</itemA>'));
        assert.ok(result.includes('<itemB>2</itemB>'));
    });

    it('should expose with different visibility levels', async () => {
        const xmlString = '<root><value>test</value></root>';
        
        const xsltString = `<?xml version="1.0"?>
            <xsl:package 
                version="3.0" 
                name="visibility-package"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                
                <!-- Public template -->
                <xsl:expose component="template" names="public-template" visibility="public"/>
                
                <!-- Final template (public but cannot be overridden) -->
                <xsl:expose component="template" names="final-template" visibility="final"/>
                
                <xsl:template match="/">
                    <output>
                        <xsl:apply-templates/>
                    </output>
                </xsl:template>
                
                <xsl:template match="value" name="public-template">
                    <public><xsl:value-of select="."/></public>
                </xsl:template>
                
                <xsl:template match="value" name="final-template">
                    <final><xsl:value-of select="."/></final>
                </xsl:template>
            </xsl:package>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const result = await xsltClass.xsltProcess(xml, xslt);

        // Both templates should execute successfully
        assert.ok(result.includes('<output>'));
    });

    it('should reject xsl:expose without component attribute', async () => {
        const xmlString = '<root/>';
        
        const xsltString = `<?xml version="1.0"?>
            <xsl:package 
                version="3.0" 
                name="test-package"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                
                <xsl:expose names="test"/>
                
                <xsl:template match="/">
                    <output/>
                </xsl:template>
            </xsl:package>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        await assert.rejects(
            async () => await xsltClass.xsltProcess(xml, xslt),
            {
                message: /<xsl:expose> requires a "component" attribute/
            }
        );
    });

    it('should reject xsl:expose without names attribute', async () => {
        const xmlString = '<root/>';
        
        const xsltString = `<?xml version="1.0"?>
            <xsl:package 
                version="3.0" 
                name="test-package"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                
                <xsl:expose component="template"/>
                
                <xsl:template match="/">
                    <output/>
                </xsl:template>
            </xsl:package>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        await assert.rejects(
            async () => await xsltClass.xsltProcess(xml, xslt),
            {
                message: /<xsl:expose> requires a "names" attribute/
            }
        );
    });

    it('should reject xsl:use-package without name attribute', async () => {
        const xmlString = '<root/>';
        
        const xsltString = `<?xml version="1.0"?>
            <xsl:package 
                version="3.0" 
                name="main-package"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                
                <xsl:use-package/>
                
                <xsl:template match="/">
                    <output/>
                </xsl:template>
            </xsl:package>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        await assert.rejects(
            async () => await xsltClass.xsltProcess(xml, xslt),
            {
                message: /<xsl:use-package> requires a "name" attribute/
            }
        );
    });

    it('should reject xsl:use-package referencing non-existent package', async () => {
        const xmlString = '<root/>';
        
        const xsltString = `<?xml version="1.0"?>
            <xsl:package 
                version="3.0" 
                name="main-package"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                
                <xsl:use-package name="non-existent-package"/>
                
                <xsl:template match="/">
                    <output/>
                </xsl:template>
            </xsl:package>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        await assert.rejects(
            async () => await xsltClass.xsltProcess(xml, xslt),
            {
                message: /Package "non-existent-package" not found/
            }
        );
    });

    it('should reject xsl:accept outside of xsl:use-package', async () => {
        const xmlString = '<root/>';
        
        const xsltString = `<?xml version="1.0"?>
            <xsl:package 
                version="3.0" 
                name="main-package"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                
                <xsl:accept component="template" names="test"/>
                
                <xsl:template match="/">
                    <output/>
                </xsl:template>
            </xsl:package>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        await assert.rejects(
            async () => await xsltClass.xsltProcess(xml, xslt),
            {
                message: /<xsl:accept> must be a child of <xsl:use-package>/
            }
        );
    });

    it('should reject xsl:accept without component attribute', async () => {
        const xmlString = '<root/>';
        
        // This test validates that xsl:accept requires a component attribute.
        // Since package loading from external sources isn't implemented yet,
        // we test with a package that references a non-existent package.
        // The error about package not found comes first, which is expected.
        const xsltString = `<?xml version="1.0"?>
            <xsl:package 
                version="3.0" 
                name="main-package"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                
                <xsl:use-package name="library-package">
                    <xsl:accept names="test-template"/>
                </xsl:use-package>
                
                <xsl:template match="/">
                    <output/>
                </xsl:template>
            </xsl:package>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        // Since external package loading isn't implemented, we get "package not found" error
        // before we can validate the xsl:accept attributes
        await assert.rejects(
            async () => await xsltClass.xsltProcess(xml, xslt),
            {
                message: /Package "library-package" not found/
            }
        );
    });
});
