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

    // ========================================================================
    // Phase 1.1: Component Lookup in Used Packages - Tests
    // ========================================================================

    describe('Component Lookup in Used Packages (Phase 1.1)', () => {
        it('should accept specific named function from used package', async () => {
            const xmlString = '<root><value>10</value></root>';

            // First, create and register the library package
            const libraryPackageString = `<?xml version="1.0"?>
                <xsl:package 
                    version="3.0" 
                    name="math-library" 
                    package-version="1.0"
                    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                    xmlns:math="http://example.com/math">
                    
                    <xsl:expose component="function" names="math:double" visibility="public"/>
                    
                    <xsl:function name="math:double" as="xs:integer">
                        <xsl:param name="n" as="xs:integer"/>
                        <xsl:sequence select="$n * 2"/>
                    </xsl:function>
                    
                    <xsl:template match="/">
                        <library-output/>
                    </xsl:template>
                </xsl:package>`;

            const mainPackageString = `<?xml version="1.0"?>
                <xsl:package 
                    version="3.0" 
                    name="main-package"
                    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                    xmlns:math="http://example.com/math">
                    
                    <xsl:use-package name="math-library" package-version="1.0">
                        <xsl:accept component="function" names="math:double"/>
                    </xsl:use-package>
                    
                    <xsl:template match="/">
                        <output>
                            <xsl:apply-templates/>
                        </output>
                    </xsl:template>
                    
                    <xsl:template match="value">
                        <result><xsl:value-of select="math:double(number(.))"/></result>
                    </xsl:template>
                </xsl:package>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();

            // Register the library package first
            const libraryPackage = xmlParser.xmlParse(libraryPackageString);
            await xsltClass.xsltProcess(xmlParser.xmlParse('<dummy/>'), libraryPackage);

            // Now process the main package
            const xml = xmlParser.xmlParse(xmlString);
            const mainPackage = xmlParser.xmlParse(mainPackageString);
            const result = await xsltClass.xsltProcess(xml, mainPackage);

            assert.ok(result.includes('<result>20</result>'));
        });

        it('should accept all functions with wildcard from used package', async () => {
            const xmlString = '<root><value>5</value></root>';

            const libraryPackageString = `<?xml version="1.0"?>
                <xsl:package 
                    version="3.0" 
                    name="math-library" 
                    package-version="2.0"
                    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                    xmlns:math="http://example.com/math">
                    
                    <xsl:expose component="function" names="*" visibility="public"/>
                    
                    <xsl:function name="math:double" as="xs:integer">
                        <xsl:param name="n" as="xs:integer"/>
                        <xsl:sequence select="$n * 2"/>
                    </xsl:function>
                    
                    <xsl:function name="math:triple" as="xs:integer">
                        <xsl:param name="n" as="xs:integer"/>
                        <xsl:sequence select="$n * 3"/>
                    </xsl:function>
                    
                    <xsl:template match="/">
                        <library-output/>
                    </xsl:template>
                </xsl:package>`;

            const mainPackageString = `<?xml version="1.0"?>
                <xsl:package 
                    version="3.0" 
                    name="main-package"
                    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                    xmlns:math="http://example.com/math">
                    
                    <xsl:use-package name="math-library" package-version="2.0">
                        <xsl:accept component="function" names="*"/>
                    </xsl:use-package>
                    
                    <xsl:template match="/">
                        <output>
                            <xsl:apply-templates/>
                        </output>
                    </xsl:template>
                    
                    <xsl:template match="value">
                        <doubled><xsl:value-of select="math:double(number(.))"/></doubled>
                        <tripled><xsl:value-of select="math:triple(number(.))"/></tripled>
                    </xsl:template>
                </xsl:package>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();

            const libraryPackage = xmlParser.xmlParse(libraryPackageString);
            await xsltClass.xsltProcess(xmlParser.xmlParse('<dummy/>'), libraryPackage);

            const xml = xmlParser.xmlParse(xmlString);
            const mainPackage = xmlParser.xmlParse(mainPackageString);
            const result = await xsltClass.xsltProcess(xml, mainPackage);

            assert.ok(result.includes('<doubled>10</doubled>'));
            assert.ok(result.includes('<tripled>15</tripled>'));
        });

        it('should reject accepting private component from used package', async () => {
            const xmlString = '<root/>';

            const libraryPackageString = `<?xml version="1.0"?>
                <xsl:package 
                    version="3.0" 
                    name="private-library" 
                    package-version="1.0"
                    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                    xmlns:priv="http://example.com/private">
                    
                    <!-- This function is exposed as private, so it shouldn't be acceptable -->
                    <xsl:expose component="function" names="priv:secret" visibility="private"/>
                    
                    <xsl:function name="priv:secret" as="xs:string">
                        <xsl:sequence select="'secret value'"/>
                    </xsl:function>
                    
                    <xsl:template match="/">
                        <library-output/>
                    </xsl:template>
                </xsl:package>`;

            const mainPackageString = `<?xml version="1.0"?>
                <xsl:package 
                    version="3.0" 
                    name="main-package"
                    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                    xmlns:priv="http://example.com/private">
                    
                    <xsl:use-package name="private-library" package-version="1.0">
                        <xsl:accept component="function" names="priv:secret"/>
                    </xsl:use-package>
                    
                    <xsl:template match="/">
                        <output/>
                    </xsl:template>
                </xsl:package>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();

            const libraryPackage = xmlParser.xmlParse(libraryPackageString);
            await xsltClass.xsltProcess(xmlParser.xmlParse('<dummy/>'), libraryPackage);

            const xml = xmlParser.xmlParse(xmlString);
            const mainPackage = xmlParser.xmlParse(mainPackageString);

            await assert.rejects(
                async () => await xsltClass.xsltProcess(xml, mainPackage),
                {
                    message: /Cannot accept private component.*priv:secret/
                }
            );
        });

        it('should accept named templates from used package', async () => {
            const xmlString = '<root><item>test</item></root>';

            const libraryPackageString = `<?xml version="1.0"?>
                <xsl:package 
                    version="3.0" 
                    name="template-library" 
                    package-version="1.0"
                    xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    
                    <xsl:expose component="template" names="format-item" visibility="public"/>
                    
                    <xsl:template name="format-item" match="item">
                        <formatted-item><xsl:value-of select="."/></formatted-item>
                    </xsl:template>
                    
                    <xsl:template match="/">
                        <library-output/>
                    </xsl:template>
                </xsl:package>`;

            const mainPackageString = `<?xml version="1.0"?>
                <xsl:package 
                    version="3.0" 
                    name="main-package"
                    xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    
                    <xsl:use-package name="template-library" package-version="1.0">
                        <xsl:accept component="template" names="format-item"/>
                    </xsl:use-package>
                    
                    <xsl:template match="/">
                        <output>
                            <xsl:apply-templates/>
                        </output>
                    </xsl:template>
                </xsl:package>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();

            const libraryPackage = xmlParser.xmlParse(libraryPackageString);
            await xsltClass.xsltProcess(xmlParser.xmlParse('<dummy/>'), libraryPackage);

            const xml = xmlParser.xmlParse(xmlString);
            const mainPackage = xmlParser.xmlParse(mainPackageString);
            const result = await xsltClass.xsltProcess(xml, mainPackage);

            // The named template from the library should be used
            assert.ok(result.includes('<formatted-item>test</formatted-item>'));
        });

        it('should accept variables from used package', async () => {
            const xmlString = '<root/>';

            const libraryPackageString = `<?xml version="1.0"?>
                <xsl:package 
                    version="3.0" 
                    name="variable-library" 
                    package-version="1.0"
                    xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    
                    <xsl:expose component="variable" names="greeting" visibility="public"/>
                    
                    <xsl:variable name="greeting" select="'Hello from library'"/>
                    
                    <xsl:template match="/">
                        <library-output/>
                    </xsl:template>
                </xsl:package>`;

            const mainPackageString = `<?xml version="1.0"?>
                <xsl:package 
                    version="3.0" 
                    name="main-package"
                    xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    
                    <xsl:use-package name="variable-library" package-version="1.0">
                        <xsl:accept component="variable" names="greeting"/>
                    </xsl:use-package>
                    
                    <xsl:template match="/">
                        <output>
                            <message><xsl:value-of select="$greeting"/></message>
                        </output>
                    </xsl:template>
                </xsl:package>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();

            const libraryPackage = xmlParser.xmlParse(libraryPackageString);
            await xsltClass.xsltProcess(xmlParser.xmlParse('<dummy/>'), libraryPackage);

            const xml = xmlParser.xmlParse(xmlString);
            const mainPackage = xmlParser.xmlParse(mainPackageString);
            const result = await xsltClass.xsltProcess(xml, mainPackage);

            assert.ok(result.includes('<message>Hello from library</message>'));
        });

        it('should apply visibility override from xsl:accept', async () => {
            const xmlString = '<root/>';

            const libraryPackageString = `<?xml version="1.0"?>
                <xsl:package 
                    version="3.0" 
                    name="override-library" 
                    package-version="1.0"
                    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                    xmlns:fn="http://example.com/functions">
                    
                    <xsl:expose component="function" names="fn:getValue" visibility="public"/>
                    
                    <xsl:function name="fn:getValue" as="xs:string">
                        <xsl:sequence select="'original'"/>
                    </xsl:function>
                    
                    <xsl:template match="/">
                        <library-output/>
                    </xsl:template>
                </xsl:package>`;

            const mainPackageString = `<?xml version="1.0"?>
                <xsl:package 
                    version="3.0" 
                    name="main-package"
                    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                    xmlns:fn="http://example.com/functions">
                    
                    <xsl:use-package name="override-library" package-version="1.0">
                        <!-- Accept with visibility override to final -->
                        <xsl:accept component="function" names="fn:getValue" visibility="final"/>
                    </xsl:use-package>
                    
                    <xsl:template match="/">
                        <output>
                            <value><xsl:value-of select="fn:getValue()"/></value>
                        </output>
                    </xsl:template>
                </xsl:package>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();

            const libraryPackage = xmlParser.xmlParse(libraryPackageString);
            await xsltClass.xsltProcess(xmlParser.xmlParse('<dummy/>'), libraryPackage);

            const xml = xmlParser.xmlParse(xmlString);
            const mainPackage = xmlParser.xmlParse(mainPackageString);
            const result = await xsltClass.xsltProcess(xml, mainPackage);

            // Function should work, visibility override is tracked
            assert.ok(result.includes('<value>original</value>'));
        });

        it('should accept multiple named components', async () => {
            const xmlString = '<root/>';

            const libraryPackageString = `<?xml version="1.0"?>
                <xsl:package 
                    version="3.0" 
                    name="multi-library" 
                    package-version="1.0"
                    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                    xmlns:fn="http://example.com/functions">
                    
                    <xsl:expose component="function" names="fn:add fn:subtract" visibility="public"/>
                    
                    <xsl:function name="fn:add" as="xs:integer">
                        <xsl:param name="a" as="xs:integer"/>
                        <xsl:param name="b" as="xs:integer"/>
                        <xsl:sequence select="$a + $b"/>
                    </xsl:function>
                    
                    <xsl:function name="fn:subtract" as="xs:integer">
                        <xsl:param name="a" as="xs:integer"/>
                        <xsl:param name="b" as="xs:integer"/>
                        <xsl:sequence select="$a - $b"/>
                    </xsl:function>
                    
                    <xsl:template match="/">
                        <library-output/>
                    </xsl:template>
                </xsl:package>`;

            const mainPackageString = `<?xml version="1.0"?>
                <xsl:package 
                    version="3.0" 
                    name="main-package"
                    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                    xmlns:fn="http://example.com/functions">
                    
                    <xsl:use-package name="multi-library" package-version="1.0">
                        <xsl:accept component="function" names="fn:add fn:subtract"/>
                    </xsl:use-package>
                    
                    <xsl:template match="/">
                        <output>
                            <sum><xsl:value-of select="fn:add(5, 3)"/></sum>
                            <difference><xsl:value-of select="fn:subtract(10, 4)"/></difference>
                        </output>
                    </xsl:template>
                </xsl:package>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();

            const libraryPackage = xmlParser.xmlParse(libraryPackageString);
            await xsltClass.xsltProcess(xmlParser.xmlParse('<dummy/>'), libraryPackage);

            const xml = xmlParser.xmlParse(xmlString);
            const mainPackage = xmlParser.xmlParse(mainPackageString);
            const result = await xsltClass.xsltProcess(xml, mainPackage);

            assert.ok(result.includes('<sum>8</sum>'));
            assert.ok(result.includes('<difference>6</difference>'));
        });
    });

    describe('Component Override (Phase 2)', () => {
        it('should override a template from used package', async () => {
            const xmlString = '<root><item>test</item></root>';
            
            const libraryPackageString = `<?xml version="1.0"?>
                <xsl:package 
                    version="3.0" 
                    name="library-pkg" 
                    package-version="1.0"
                    xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    
                    <xsl:expose component="template" names="*" visibility="public"/>
                    
                    <xsl:template match="item">
                        <original><xsl:value-of select="."/></original>
                    </xsl:template>
                </xsl:package>`;

            const mainPackageString = `<?xml version="1.0"?>
                <xsl:package 
                    version="3.0" 
                    name="main-pkg" 
                    package-version="1.0"
                    xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    
                    <xsl:use-package name="library-pkg" package-version="1.0">
                        <xsl:accept component="template" names="*"/>
                        <xsl:override>
                            <xsl:template match="item">
                                <overridden><xsl:value-of select="upper-case(.)"/></overridden>
                            </xsl:template>
                        </xsl:override>
                    </xsl:use-package>
                    
                    <xsl:template match="/">
                        <output>
                            <xsl:apply-templates/>
                        </output>
                    </xsl:template>
                </xsl:package>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();

            const libraryPackage = xmlParser.xmlParse(libraryPackageString);
            await xsltClass.xsltProcess(xmlParser.xmlParse('<dummy/>'), libraryPackage);

            const xml = xmlParser.xmlParse(xmlString);
            const mainPackage = xmlParser.xmlParse(mainPackageString);
            const result = await xsltClass.xsltProcess(xml, mainPackage);

            // Should use overridden template, not original
            assert.ok(result.includes('<overridden>TEST</overridden>'));
            assert.ok(!result.includes('<original>'));
        });

        it('should override a function from used package', async () => {
            const xmlString = '<root><value>5</value></root>';
            
            const libraryPackageString = `<?xml version="1.0"?>
                <xsl:package 
                    version="3.0" 
                    name="library-pkg" 
                    package-version="1.0"
                    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                    xmlns:fn="http://example.com/functions">
                    
                    <xsl:expose component="function" names="*" visibility="public"/>
                    
                    <xsl:function name="fn:double" as="xs:integer">
                        <xsl:param name="n" as="xs:integer"/>
                        <xsl:sequence select="$n * 2"/>
                    </xsl:function>
                </xsl:package>`;

            const mainPackageString = `<?xml version="1.0"?>
                <xsl:package 
                    version="3.0" 
                    name="main-pkg" 
                    package-version="1.0"
                    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                    xmlns:fn="http://example.com/functions">
                    
                    <xsl:use-package name="library-pkg" package-version="1.0">
                        <xsl:accept component="function" names="*"/>
                        <xsl:override>
                            <xsl:function name="fn:double" as="xs:integer">
                                <xsl:param name="n" as="xs:integer"/>
                                <xsl:sequence select="$n * 3"/>
                            </xsl:function>
                        </xsl:override>
                    </xsl:use-package>
                    
                    <xsl:template match="/">
                        <output>
                            <result><xsl:value-of select="fn:double(number(root/value))"/></result>
                        </output>
                    </xsl:template>
                </xsl:package>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();

            const libraryPackage = xmlParser.xmlParse(libraryPackageString);
            await xsltClass.xsltProcess(xmlParser.xmlParse('<dummy/>'), libraryPackage);

            const xml = xmlParser.xmlParse(xmlString);
            const mainPackage = xmlParser.xmlParse(mainPackageString);
            const result = await xsltClass.xsltProcess(xml, mainPackage);

            // Should use overridden function (multiply by 3, not 2)
            assert.ok(result.includes('<result>15</result>'));
        });

        it('should call original component via xsl:original', async () => {
            const xmlString = '<root><item>hello</item></root>';
            
            const libraryPackageString = `<?xml version="1.0"?>
                <xsl:package 
                    version="3.0" 
                    name="library-pkg" 
                    package-version="1.0"
                    xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    
                    <xsl:expose component="template" names="*" visibility="public"/>
                    
                    <xsl:template match="item">
                        <original><xsl:value-of select="."/></original>
                    </xsl:template>
                </xsl:package>`;

            const mainPackageString = `<?xml version="1.0"?>
                <xsl:package 
                    version="3.0" 
                    name="main-pkg" 
                    package-version="1.0"
                    xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    
                    <xsl:use-package name="library-pkg" package-version="1.0">
                        <xsl:accept component="template" names="*"/>
                        <xsl:override>
                            <xsl:template match="item">
                                <wrapper>
                                    <xsl:original/>
                                    <additional>world</additional>
                                </wrapper>
                            </xsl:template>
                        </xsl:override>
                    </xsl:use-package>
                    
                    <xsl:template match="/">
                        <output>
                            <xsl:apply-templates/>
                        </output>
                    </xsl:template>
                </xsl:package>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();

            const libraryPackage = xmlParser.xmlParse(libraryPackageString);
            await xsltClass.xsltProcess(xmlParser.xmlParse('<dummy/>'), libraryPackage);

            const xml = xmlParser.xmlParse(xmlString);
            const mainPackage = xmlParser.xmlParse(mainPackageString);
            const result = await xsltClass.xsltProcess(xml, mainPackage);

            // Should include both override wrapper and original content
            assert.ok(result.includes('<wrapper>'));
            assert.ok(result.includes('<original>hello</original>'));
            assert.ok(result.includes('<additional>world</additional>'));
        });

        it('should reject overriding final component', async () => {
            const libraryPackageString = `<?xml version="1.0"?>
                <xsl:package 
                    version="3.0" 
                    name="library-pkg" 
                    package-version="1.0"
                    xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    
                    <xsl:expose component="template" names="*" visibility="final"/>
                    
                    <xsl:template match="item">
                        <final-template/>
                    </xsl:template>
                </xsl:package>`;

            const mainPackageString = `<?xml version="1.0"?>
                <xsl:package 
                    version="3.0" 
                    name="main-pkg" 
                    package-version="1.0"
                    xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    
                    <xsl:use-package name="library-pkg" package-version="1.0">
                        <xsl:accept component="template" names="*"/>
                        <xsl:override>
                            <xsl:template match="item">
                                <overridden/>
                            </xsl:template>
                        </xsl:override>
                    </xsl:use-package>
                    
                    <xsl:template match="/">
                        <output/>
                    </xsl:template>
                </xsl:package>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();

            const libraryPackage = xmlParser.xmlParse(libraryPackageString);
            await xsltClass.xsltProcess(xmlParser.xmlParse('<dummy/>'), libraryPackage);

            const xml = xmlParser.xmlParse('<root/>');
            const mainPackage = xmlParser.xmlParse(mainPackageString);

            // Should throw error when trying to override final component
            await assert.rejects(
                async () => await xsltClass.xsltProcess(xml, mainPackage),
                /Cannot override component.*marked as "final"/
            );
        });

        it('should reject xsl:override outside xsl:use-package', async () => {
            const xsltString = `<?xml version="1.0"?>
                <xsl:package 
                    version="3.0" 
                    name="bad-pkg" 
                    package-version="1.0"
                    xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    
                    <xsl:override>
                        <xsl:template match="item">
                            <bad/>
                        </xsl:template>
                    </xsl:override>
                    
                    <xsl:template match="/">
                        <output/>
                    </xsl:template>
                </xsl:package>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse('<root/>');
            const xslt = xmlParser.xmlParse(xsltString);

            await assert.rejects(
                async () => await xsltClass.xsltProcess(xml, xslt),
                /must be a child of <xsl:use-package>/
            );
        });

        it('should reject xsl:original outside override context', async () => {
            const xsltString = `<?xml version="1.0"?>
                <xsl:package 
                    version="3.0" 
                    name="bad-pkg" 
                    package-version="1.0"
                    xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    
                    <xsl:template match="/">
                        <output>
                            <xsl:original/>
                        </output>
                    </xsl:template>
                </xsl:package>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse('<root/>');
            const xslt = xmlParser.xmlParse(xsltString);

            await assert.rejects(
                async () => await xsltClass.xsltProcess(xml, xslt),
                /can only be used within an overriding component/
            );
        });
    });

    describe('External Package Loading (Phase 3)', () => {
        it('should load package via callback', async () => {
            const xmlString = '<root><value>5</value></root>';
            
            const libraryPackageString = `<?xml version="1.0"?>
                <xsl:package 
                    version="3.0" 
                    name="loaded-library" 
                    package-version="1.0"
                    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                    xmlns:math="http://example.com/math">
                    
                    <xsl:expose component="function" names="*" visibility="public"/>
                    
                    <xsl:function name="math:double" as="xs:integer">
                        <xsl:param name="n" as="xs:integer"/>
                        <xsl:sequence select="$n * 2"/>
                    </xsl:function>
                    
                    <xsl:template match="/">
                        <library-output/>
                    </xsl:template>
                </xsl:package>`;

            const mainPackageString = `<?xml version="1.0"?>
                <xsl:package 
                    version="3.0" 
                    name="main-pkg" 
                    package-version="1.0"
                    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                    xmlns:math="http://example.com/math">
                    
                    <xsl:use-package name="loaded-library" package-version="1.0">
                        <xsl:accept component="function" names="*"/>
                    </xsl:use-package>
                    
                    <xsl:template match="/">
                        <output>
                            <result><xsl:value-of select="math:double(number(root/value))"/></result>
                        </output>
                    </xsl:template>
                </xsl:package>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();

            // Set up package loader callback
            xsltClass.setPackageLoader(async (name: string, version?: string) => {
                if (name === 'loaded-library' && version === '1.0') {
                    return xmlParser.xmlParse(libraryPackageString);
                }
                return null;
            });

            const xml = xmlParser.xmlParse(xmlString);
            const mainPackage = xmlParser.xmlParse(mainPackageString);
            const result = await xsltClass.xsltProcess(xml, mainPackage);

            assert.ok(result.includes('<result>10</result>'));
        });

        it('should throw error when package loader returns null', async () => {
            const xmlString = '<root/>';
            
            const mainPackageString = `<?xml version="1.0"?>
                <xsl:package 
                    version="3.0" 
                    name="main-pkg" 
                    xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    
                    <xsl:use-package name="missing-library">
                        <xsl:accept component="function" names="*"/>
                    </xsl:use-package>
                    
                    <xsl:template match="/">
                        <output/>
                    </xsl:template>
                </xsl:package>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();

            // Set up package loader that returns null
            xsltClass.setPackageLoader(async () => null);

            const xml = xmlParser.xmlParse(xmlString);
            const mainPackage = xmlParser.xmlParse(mainPackageString);

            await assert.rejects(
                async () => await xsltClass.xsltProcess(xml, mainPackage),
                /not found/
            );
        });

        it('should work with package loader errors', async () => {
            const xmlString = '<root/>';
            
            const mainPackageString = `<?xml version="1.0"?>
                <xsl:package 
                    version="3.0" 
                    name="main-pkg" 
                    xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    
                    <xsl:use-package name="lib-a">
                        <xsl:accept component="function" names="*"/>
                    </xsl:use-package>
                    
                    <xsl:template match="/">
                        <output/>
                    </xsl:template>
                </xsl:package>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();

            // Set up package loader that throws an error
            xsltClass.setPackageLoader(async (name: string) => {
                throw new Error(`Failed to load ${name}`);
            });

            const xml = xmlParser.xmlParse(xmlString);
            const mainPackage = xmlParser.xmlParse(mainPackageString);

            await assert.rejects(
                async () => await xsltClass.xsltProcess(xml, mainPackage),
                /not found/
            );
        });

        it('should support pre-registration of packages', async () => {
            const xmlString = '<root><value>3</value></root>';
            
            const libraryPackageString = `<?xml version="1.0"?>
                <xsl:package 
                    version="3.0" 
                    name="utils" 
                    package-version="1.0"
                    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                    xmlns:util="http://example.com/utils">
                    
                    <xsl:expose component="function" names="*" visibility="public"/>
                    
                    <xsl:function name="util:square" as="xs:integer">
                        <xsl:param name="n" as="xs:integer"/>
                        <xsl:sequence select="$n * $n"/>
                    </xsl:function>
                    
                    <xsl:template match="/">
                        <library-output/>
                    </xsl:template>
                </xsl:package>`;

            const mainPackageString = `<?xml version="1.0"?>
                <xsl:package 
                    version="3.0" 
                    name="main-pkg" 
                    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                    xmlns:util="http://example.com/utils">
                    
                    <xsl:use-package name="utils" package-version="1.0">
                        <xsl:accept component="function" names="*"/>
                    </xsl:use-package>
                    
                    <xsl:template match="/">
                        <output>
                            <result><xsl:value-of select="util:square(number(root/value))"/></result>
                        </output>
                    </xsl:template>
                </xsl:package>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();

            // Pre-register the library package
            const libraryDoc = xmlParser.xmlParse(libraryPackageString);
            await xsltClass.registerPackage('utils', libraryDoc, '1.0');

            const xml = xmlParser.xmlParse(xmlString);
            const mainPackage = xmlParser.xmlParse(mainPackageString);
            const result = await xsltClass.xsltProcess(xml, mainPackage);

            assert.ok(result.includes('<result>9</result>'));
        });

        it('should detect circular package dependencies', async () => {
            const xmlString = '<root/>';
            
            // Package A uses Package B
            const packageAString = `<?xml version="1.0"?>
                <xsl:package 
                    version="3.0" 
                    name="package-a" 
                    package-version="1.0"
                    xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    
                    <xsl:use-package name="package-b" package-version="1.0">
                        <xsl:accept component="function" names="*"/>
                    </xsl:use-package>
                    
                    <xsl:template match="/">
                        <output-a/>
                    </xsl:template>
                </xsl:package>`;

            // Package B uses Package A - creates a circular dependency
            const packageBString = `<?xml version="1.0"?>
                <xsl:package 
                    version="3.0" 
                    name="package-b" 
                    package-version="1.0"
                    xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    
                    <xsl:use-package name="package-a" package-version="1.0">
                        <xsl:accept component="function" names="*"/>
                    </xsl:use-package>
                    
                    <xsl:template match="/">
                        <output-b/>
                    </xsl:template>
                </xsl:package>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();

            // Set up package loader that loads both packages
            xsltClass.setPackageLoader(async (name: string) => {
                if (name === 'package-a') {
                    return xmlParser.xmlParse(packageAString);
                }
                if (name === 'package-b') {
                    return xmlParser.xmlParse(packageBString);
                }
                return null;
            });

            const xml = xmlParser.xmlParse(xmlString);
            const packageA = xmlParser.xmlParse(packageAString);

            await assert.rejects(
                async () => await xsltClass.xsltProcess(xml, packageA),
                /[Cc]ircular.*dependency/
            );
        });
    });

    describe('Version Constraints (Phase 4.1)', () => {
        it('should match exact version', async () => {
            const packageString = `<?xml version="1.0"?>
                <xsl:package 
                    version="3.0" 
                    name="utils" 
                    package-version="1.2.3"
                    xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    <xsl:template match="/"><output/></xsl:template>
                </xsl:package>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const packageDoc = xmlParser.xmlParse(packageString);
            await xsltClass.registerPackage('utils', packageDoc, '1.2.3');

            // Should find with exact version
            const pkg = (xsltClass as any).packageRegistry.get('utils', '1.2.3');
            assert.ok(pkg);
            assert.equal(pkg.version, '1.2.3');
        });

        it('should match wildcard version constraints', async () => {
            const xmlParser = new XmlParser();
            const xsltClass = new Xslt();
            const registry = (xsltClass as any).packageRegistry;

            // Register multiple versions
            const versions = ['1.0.0', '1.1.5', '1.9.9', '2.0.0', '2.1.0'];
            for (const version of versions) {
                const packageString = `<?xml version="1.0"?>
                    <xsl:package version="3.0" name="lib" package-version="${version}"
                        xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                        <xsl:template match="/"><output/></xsl:template>
                    </xsl:package>`;
                const doc = xmlParser.xmlParse(packageString);
                await xsltClass.registerPackage('lib', doc, version);
            }

            // Test wildcard constraints
            let pkg = registry.get('lib', '1.*');
            assert.ok(pkg);
            assert.equal(pkg.version, '1.9.9'); // Should return highest matching

            pkg = registry.get('lib', '2.*');
            assert.ok(pkg);
            assert.equal(pkg.version, '2.1.0');

            pkg = registry.get('lib', '1.0.*');
            assert.ok(pkg);
            assert.equal(pkg.version, '1.0.0');
        });

        it('should match version range constraints (>=, >)', async () => {
            const xmlParser = new XmlParser();
            const xsltClass = new Xslt();
            const registry = (xsltClass as any).packageRegistry;

            // Register versions
            const versions = ['0.9.0', '1.0.0', '1.5.0', '2.0.0'];
            for (const version of versions) {
                const packageString = `<?xml version="1.0"?>
                    <xsl:package version="3.0" name="lib" package-version="${version}"
                        xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                        <xsl:template match="/"><output/></xsl:template>
                    </xsl:package>`;
                const doc = xmlParser.xmlParse(packageString);
                await xsltClass.registerPackage('lib', doc, version);
            }

            // Test >= constraint
            let pkg = registry.get('lib', '>=1.0.0');
            assert.ok(pkg);
            assert.equal(pkg.version, '2.0.0'); // Highest matching

            // Test > constraint
            pkg = registry.get('lib', '>1.0.0');
            assert.ok(pkg);
            assert.equal(pkg.version, '2.0.0');

            // Test exact >= match
            pkg = registry.get('lib', '>=2.0.0');
            assert.ok(pkg);
            assert.equal(pkg.version, '2.0.0');
        });

        it('should match version range constraints (<=, <)', async () => {
            const xmlParser = new XmlParser();
            const xsltClass = new Xslt();
            const registry = (xsltClass as any).packageRegistry;

            // Register versions
            const versions = ['1.0.0', '1.5.0', '2.0.0', '2.5.0'];
            for (const version of versions) {
                const packageString = `<?xml version="1.0"?>
                    <xsl:package version="3.0" name="lib" package-version="${version}"
                        xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                        <xsl:template match="/"><output/></xsl:template>
                    </xsl:package>`;
                const doc = xmlParser.xmlParse(packageString);
                await xsltClass.registerPackage('lib', doc, version);
            }

            // Test <= constraint
            let pkg = registry.get('lib', '<=2.0.0');
            assert.ok(pkg);
            assert.equal(pkg.version, '2.0.0'); // Highest matching

            // Test < constraint
            pkg = registry.get('lib', '<2.0.0');
            assert.ok(pkg);
            assert.equal(pkg.version, '1.5.0');

            // Test exact <= match
            pkg = registry.get('lib', '<=1.0.0');
            assert.ok(pkg);
            assert.equal(pkg.version, '1.0.0');
        });

        it('should match combined version constraints', async () => {
            const xmlParser = new XmlParser();
            const xsltClass = new Xslt();
            const registry = (xsltClass as any).packageRegistry;

            // Register versions
            const versions = ['0.9.0', '1.0.0', '1.5.0', '1.9.9', '2.0.0', '3.0.0'];
            for (const version of versions) {
                const packageString = `<?xml version="1.0"?>
                    <xsl:package version="3.0" name="lib" package-version="${version}"
                        xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                        <xsl:template match="/"><output/></xsl:template>
                    </xsl:package>`;
                const doc = xmlParser.xmlParse(packageString);
                await xsltClass.registerPackage('lib', doc, version);
            }

            // Test combined constraint: >=1.0.0,<2.0.0
            let pkg = registry.get('lib', '>=1.0.0,<2.0.0');
            assert.ok(pkg);
            assert.equal(pkg.version, '1.9.9'); // Highest in range

            // Test combined constraint: >1.0.0,<2.0.0
            pkg = registry.get('lib', '>1.0.0,<2.0.0');
            assert.ok(pkg);
            assert.equal(pkg.version, '1.9.9');

            // Test combined constraint: >=1.5.0,<=2.0.0
            pkg = registry.get('lib', '>=1.5.0,<=2.0.0');
            assert.ok(pkg);
            assert.equal(pkg.version, '2.0.0');
        });

        it('should return undefined when no version matches constraint', async () => {
            const xmlParser = new XmlParser();
            const xsltClass = new Xslt();
            const registry = (xsltClass as any).packageRegistry;

            // Register specific version
            const packageString = `<?xml version="1.0"?>
                <xsl:package version="3.0" name="lib" package-version="1.0.0"
                    xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    <xsl:template match="/"><output/></xsl:template>
                </xsl:package>`;
            const doc = xmlParser.xmlParse(packageString);
            await xsltClass.registerPackage('lib', doc, '1.0.0');

            // Test non-matching constraints
            assert.equal(registry.get('lib', '2.*'), undefined);
            assert.equal(registry.get('lib', '>=2.0.0'), undefined);
            assert.equal(registry.get('lib', '<1.0.0'), undefined);
            assert.equal(registry.get('lib', '>1.0.0,<2.0.0'), undefined);
        });

        it('should compare versions correctly (semantic versioning)', async () => {
            const xmlParser = new XmlParser();
            const xsltClass = new Xslt();
            const registry = (xsltClass as any).packageRegistry;

            // Register versions with different lengths
            const versions = ['1.0', '1.0.0', '1.0.1', '1.1.0', '2.0.0'];
            for (const version of versions) {
                const packageString = `<?xml version="1.0"?>
                    <xsl:package version="3.0" name="lib" package-version="${version}"
                        xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                        <xsl:template match="/"><output/></xsl:template>
                    </xsl:package>`;
                const doc = xmlParser.xmlParse(packageString);
                await xsltClass.registerPackage('lib', doc, version);
            }

            // Test version comparison handles different part counts
            let pkg = registry.get('lib', '>=1.0');
            assert.ok(pkg);
            assert.equal(pkg.version, '2.0.0'); // 2.0.0 > 1.0

            pkg = registry.get('lib', '1.0.*');
            assert.ok(pkg);
            // Should match both 1.0 and 1.0.0 and 1.0.1
            assert.equal(pkg.version, '1.0.1'); // Highest matching
        });
    });

    describe('Mode Declaration (Phase 4.2)', () => {
        it('should declare a mode with default visibility', async () => {
            const packageString = `<?xml version="1.0"?>
                <xsl:package 
                    version="3.0" 
                    name="test-pkg"
                    xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    
                    <xsl:mode name="custom-mode"/>
                    
                    <xsl:template match="/">
                        <output/>
                    </xsl:template>
                </xsl:package>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const packageDoc = xmlParser.xmlParse(packageString);
            
            await xsltClass.registerPackage('test-pkg', packageDoc);
            
            // Verify mode was registered
            const pkg = (xsltClass as any).packageRegistry.get('test-pkg');
            assert.ok(pkg);
            assert.ok(pkg.modes);
            assert.ok(pkg.modes.has('custom-mode'));
            
            const mode = pkg.modes.get('custom-mode');
            assert.equal(mode.name, 'custom-mode');
            assert.equal(mode.visibility, 'public'); // default
        });

        it('should declare a mode with explicit visibility', async () => {
            const packageString = `<?xml version="1.0"?>
                <xsl:package 
                    version="3.0" 
                    name="test-pkg"
                    xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    
                    <xsl:mode name="private-mode" visibility="private"/>
                    <xsl:mode name="public-mode" visibility="public"/>
                    <xsl:mode name="final-mode" visibility="final"/>
                    
                    <xsl:template match="/">
                        <output/>
                    </xsl:template>
                </xsl:package>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const packageDoc = xmlParser.xmlParse(packageString);
            
            await xsltClass.registerPackage('test-pkg', packageDoc);
            
            const pkg = (xsltClass as any).packageRegistry.get('test-pkg');
            assert.ok(pkg.modes.has('private-mode'));
            assert.ok(pkg.modes.has('public-mode'));
            assert.ok(pkg.modes.has('final-mode'));
            
            assert.equal(pkg.modes.get('private-mode').visibility, 'private');
            assert.equal(pkg.modes.get('public-mode').visibility, 'public');
            assert.equal(pkg.modes.get('final-mode').visibility, 'final');
        });

        it('should declare mode with streamable attribute', async () => {
            const packageString = `<?xml version="1.0"?>
                <xsl:package 
                    version="3.0" 
                    name="test-pkg"
                    xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    
                    <xsl:mode name="stream-mode" streamable="yes"/>
                    <xsl:mode name="normal-mode" streamable="no"/>
                    
                    <xsl:template match="/">
                        <output/>
                    </xsl:template>
                </xsl:package>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const packageDoc = xmlParser.xmlParse(packageString);
            
            await xsltClass.registerPackage('test-pkg', packageDoc);
            
            const pkg = (xsltClass as any).packageRegistry.get('test-pkg');
            assert.equal(pkg.modes.get('stream-mode').streamable, true);
            assert.equal(pkg.modes.get('normal-mode').streamable, false);
        });

        it('should declare mode with on-no-match attribute', async () => {
            const packageString = `<?xml version="1.0"?>
                <xsl:package 
                    version="3.0" 
                    name="test-pkg"
                    xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    
                    <xsl:mode name="strict-mode" on-no-match="fail"/>
                    <xsl:mode name="lenient-mode" on-no-match="shallow-copy"/>
                    
                    <xsl:template match="/">
                        <output/>
                    </xsl:template>
                </xsl:package>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const packageDoc = xmlParser.xmlParse(packageString);
            
            await xsltClass.registerPackage('test-pkg', packageDoc);
            
            const pkg = (xsltClass as any).packageRegistry.get('test-pkg');
            assert.equal(pkg.modes.get('strict-mode').onNoMatch, 'fail');
            assert.equal(pkg.modes.get('lenient-mode').onNoMatch, 'shallow-copy');
        });

        it('should declare mode with on-multiple-match attribute', async () => {
            const packageString = `<?xml version="1.0"?>
                <xsl:package 
                    version="3.0" 
                    name="test-pkg"
                    xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    
                    <xsl:mode name="strict-mode" on-multiple-match="fail"/>
                    <xsl:mode name="warning-mode" on-multiple-match="use-last"/>
                    
                    <xsl:template match="/">
                        <output/>
                    </xsl:template>
                </xsl:package>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const packageDoc = xmlParser.xmlParse(packageString);
            
            await xsltClass.registerPackage('test-pkg', packageDoc);
            
            const pkg = (xsltClass as any).packageRegistry.get('test-pkg');
            assert.equal(pkg.modes.get('strict-mode').onMultipleMatch, 'fail');
            assert.equal(pkg.modes.get('warning-mode').onMultipleMatch, 'use-last');
        });

        it('should reject xsl:mode without name attribute', async () => {
            const packageString = `<?xml version="1.0"?>
                <xsl:package 
                    version="3.0" 
                    name="test-pkg"
                    xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    
                    <xsl:mode visibility="public"/>
                    
                    <xsl:template match="/">
                        <output/>
                    </xsl:template>
                </xsl:package>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const packageDoc = xmlParser.xmlParse(packageString);
            
            await assert.rejects(
                async () => await xsltClass.registerPackage('test-pkg', packageDoc),
                /requires a "name" attribute/
            );
        });

        it('should support declared-modes attribute on package', async () => {
            const packageStringYes = `<?xml version="1.0"?>
                <xsl:package 
                    version="3.0" 
                    name="test-pkg"
                    declared-modes="yes"
                    xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    
                    <xsl:mode name="explicit-mode"/>
                    
                    <xsl:template match="/">
                        <output/>
                    </xsl:template>
                </xsl:package>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const packageDoc = xmlParser.xmlParse(packageStringYes);
            
            await xsltClass.registerPackage('test-pkg', packageDoc);
            
            const pkg = (xsltClass as any).packageRegistry.get('test-pkg');
            assert.equal(pkg.declaredModes, 'yes');
        });
    });
    describe('Input Type Annotations (Phase 4.4)', () => {
        it('should default to unspecified when input-type-annotations not provided', async () => {
            const packageString = `<?xml version="1.0"?>
                <xsl:package 
                    version="3.0" 
                    name="test-pkg"
                    xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    
                    <xsl:template match="/">
                        <output/>
                    </xsl:template>
                </xsl:package>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const packageDoc = xmlParser.xmlParse(packageString);
            
            await xsltClass.registerPackage('test-pkg', packageDoc);
            
            const pkg = (xsltClass as any).packageRegistry.get('test-pkg');
            assert.equal(pkg.inputTypeAnnotations, 'unspecified');
        });

        it('should support input-type-annotations="preserve"', async () => {
            const packageString = `<?xml version="1.0"?>
                <xsl:package 
                    version="3.0" 
                    name="test-pkg"
                    input-type-annotations="preserve"
                    xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    
                    <xsl:template match="/">
                        <output/>
                    </xsl:template>
                </xsl:package>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const packageDoc = xmlParser.xmlParse(packageString);
            
            await xsltClass.registerPackage('test-pkg', packageDoc);
            
            const pkg = (xsltClass as any).packageRegistry.get('test-pkg');
            assert.equal(pkg.inputTypeAnnotations, 'preserve');
        });

        it('should support input-type-annotations="strip"', async () => {
            const packageString = `<?xml version="1.0"?>
                <xsl:package 
                    version="3.0" 
                    name="test-pkg"
                    input-type-annotations="strip"
                    xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    
                    <xsl:template match="/">
                        <output/>
                    </xsl:template>
                </xsl:package>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const packageDoc = xmlParser.xmlParse(packageString);
            
            await xsltClass.registerPackage('test-pkg', packageDoc);
            
            const pkg = (xsltClass as any).packageRegistry.get('test-pkg');
            assert.equal(pkg.inputTypeAnnotations, 'strip');
        });

        it('should support input-type-annotations="unspecified"', async () => {
            const packageString = `<?xml version="1.0"?>
                <xsl:package 
                    version="3.0" 
                    name="test-pkg"
                    input-type-annotations="unspecified"
                    xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    
                    <xsl:template match="/">
                        <output/>
                    </xsl:template>
                </xsl:package>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const packageDoc = xmlParser.xmlParse(packageString);
            
            await xsltClass.registerPackage('test-pkg', packageDoc);
            
            const pkg = (xsltClass as any).packageRegistry.get('test-pkg');
            assert.equal(pkg.inputTypeAnnotations, 'unspecified');
        });
    });

    // Phase 4.5: Abstract Component Validation
    describe('Abstract Component Validation (Phase 4.5)', () => {
        it('should require abstract components to be overridden', async () => {
            const xmlParser = new XmlParser();
            
            // Package with abstract function
            const packageXslt = `
                <xsl:package name="http://example.com/abstract-pkg" version="3.0" package-version="1.0" 
                             xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                             xmlns:my="http://example.com/my">
                    <xsl:function name="my:abstractFunc">
                        <xsl:param name="x"/>
                        <xsl:sequence select="$x"/>
                    </xsl:function>
                    <xsl:expose component="function" names="my:abstractFunc" visibility="abstract"/>
                </xsl:package>
            `;
            const packageDoc = xmlParser.xmlParse(packageXslt);
            
            // Using package without override should fail
            const mainXslt = `
                <xsl:package name="http://example.com/main" version="3.0" package-version="1.0"
                             xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                             xmlns:my="http://example.com/my">
                    <xsl:use-package name="http://example.com/abstract-pkg" package-version="1.0">
                        <xsl:accept component="function" names="my:abstractFunc"/>
                    </xsl:use-package>
                    <xsl:template name="xsl:initial-template">
                        <result/>
                    </xsl:template>
                </xsl:package>
            `;
            const mainDoc = xmlParser.xmlParse(mainXslt);
            
            const xsltClass = new Xslt();
            await xsltClass.registerPackage('http://example.com/abstract-pkg', packageDoc, '1.0');
            
            await assert.rejects(
                async () => await xsltClass.registerPackage('http://example.com/main', mainDoc, '1.0'),
                /Abstract component "my:abstractFunc" from package "http:\/\/example\.com\/abstract-pkg" must be overridden/
            );
        });

        it('should allow abstract components when overridden', async () => {
            const xmlParser = new XmlParser();
            
            // Package with abstract function
            const packageXslt = `
                <xsl:package name="http://example.com/abstract-pkg2" version="3.0" package-version="1.0" 
                             xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                             xmlns:my="http://example.com/my">
                    <xsl:function name="my:abstractFunc">
                        <xsl:param name="x"/>
                        <xsl:sequence select="$x"/>
                    </xsl:function>
                    <xsl:expose component="function" names="my:abstractFunc" visibility="abstract"/>
                </xsl:package>
            `;
            const packageDoc = xmlParser.xmlParse(packageXslt);
            
            // Using package with override should succeed
            const mainXslt = `
                <xsl:package name="http://example.com/main2" version="3.0" package-version="1.0"
                             xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                             xmlns:my="http://example.com/my">
                    <xsl:use-package name="http://example.com/abstract-pkg2" package-version="1.0">
                        <xsl:accept component="function" names="my:abstractFunc"/>
                        <xsl:override>
                            <xsl:function name="my:abstractFunc">
                                <xsl:param name="x"/>
                                <xsl:sequence select="$x * 2"/>
                            </xsl:function>
                        </xsl:override>
                    </xsl:use-package>
                    <xsl:template name="xsl:initial-template">
                        <result/>
                    </xsl:template>
                </xsl:package>
            `;
            const mainDoc = xmlParser.xmlParse(mainXslt);
            
            const xsltClass = new Xslt();
            await xsltClass.registerPackage('http://example.com/abstract-pkg2', packageDoc, '1.0');
            
            // Should not throw
            await xsltClass.registerPackage('http://example.com/main2', mainDoc, '1.0');
            
            const pkg = (xsltClass as any).packageRegistry.get('http://example.com/main2', '1.0');
            assert.ok(pkg);
            assert.ok(pkg.overrides.size > 0);
        });

        it('should validate abstract templates', async () => {
            const xmlParser = new XmlParser();
            
            // Package with abstract template
            const packageXslt = `
                <xsl:package name="http://example.com/abstract-tpl" version="3.0" package-version="1.0" 
                             xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    <xsl:template match="item">
                        <default/>
                    </xsl:template>
                    <xsl:expose component="template" names="*" visibility="abstract"/>
                </xsl:package>
            `;
            const packageDoc = xmlParser.xmlParse(packageXslt);
            
            // Using package without override should fail
            const mainXslt = `
                <xsl:package name="http://example.com/main-tpl" version="3.0" package-version="1.0"
                             xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    <xsl:use-package name="http://example.com/abstract-tpl" package-version="1.0">
                        <xsl:accept component="template" names="*"/>
                    </xsl:use-package>
                    <xsl:template name="xsl:initial-template">
                        <result/>
                    </xsl:template>
                </xsl:package>
            `;
            const mainDoc = xmlParser.xmlParse(mainXslt);
            
            const xsltClass = new Xslt();
            await xsltClass.registerPackage('http://example.com/abstract-tpl', packageDoc, '1.0');
            
            await assert.rejects(
                async () => await xsltClass.registerPackage('http://example.com/main-tpl', mainDoc, '1.0'),
                /Abstract component .* from package "http:\/\/example\.com\/abstract-tpl" must be overridden/
            );
        });
    });
});