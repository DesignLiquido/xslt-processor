import assert from 'assert';

import { XmlParser } from "../../src/dom";
import { Xslt } from "../../src/xslt";

describe('xsl:try / xsl:catch (XSLT 3.0)', () => {
    const xsltClass = new Xslt();
    const xmlParser = new XmlParser();

    describe('Basic Error Handling', () => {
        it('should catch invalid function call', async () => {
            const xmlString = `<root><num>10</num></root>`;

            const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml" omit-xml-declaration="yes"/>
                <xsl:template match="/">
                    <result>
                        <xsl:try>
                            <xsl:value-of select="nonexistent-function()"/>
                            <xsl:catch errors="*">
                                <error>Error caught</error>
                            </xsl:catch>
                        </xsl:try>
                    </result>
                </xsl:template>
            </xsl:stylesheet>`;

            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            assert(result.includes('<error>Error caught</error>'), 
                `Expected to catch error, got: ${result}`);
        });

        it('should execute try block when no error occurs', async () => {
            const xmlString = `<root><num>10</num></root>`;

            const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml" omit-xml-declaration="yes"/>
                <xsl:template match="/">
                    <result>
                        <xsl:try>
                            <value><xsl:value-of select="10 div 2"/></value>
                            <xsl:catch errors="*">
                                <error>Should not execute</error>
                            </xsl:catch>
                        </xsl:try>
                    </result>
                </xsl:template>
            </xsl:stylesheet>`;

            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            assert(result.includes('<value>5</value>'), 
                `Expected value 5, got: ${result}`);
            assert(!result.includes('Should not execute'), 
                `Catch block should not execute when no error occurs`);
        });

        it('should catch any error with wildcard pattern', async () => {
            const xmlString = `<root></root>`;

            const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml" omit-xml-declaration="yes"/>
                <xsl:template match="/">
                    <result>
                        <xsl:try>
                            <xsl:value-of select="undefined-function(123)"/>
                            <xsl:catch errors="*">
                                <error>Caught any error</error>
                            </xsl:catch>
                        </xsl:try>
                    </result>
                </xsl:template>
            </xsl:stylesheet>`;

            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            assert(result.includes('<error>Caught any error</error>'), 
                `Expected to catch error with wildcard, got: ${result}`);
        });
    });

    describe('Multiple Catch Blocks', () => {
        it('should execute first matching catch block', async () => {
            const xmlString = `<root></root>`;

            const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml" omit-xml-declaration="yes"/>
                <xsl:template match="/">
                    <result>
                        <xsl:try>
                            <xsl:value-of select="bad-func()"/>
                            <xsl:catch errors="err:PTYP0004">
                                <error>Type error</error>
                            </xsl:catch>
                            <xsl:catch errors="*">
                                <error>Catch all</error>
                            </xsl:catch>
                        </xsl:try>
                    </result>
                </xsl:template>
            </xsl:stylesheet>`;

            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            assert(result.includes('<error>Catch all</error>'), 
                `Expected catch all to execute, got: ${result}`);
        });

        it('should fall through catch blocks if no match', async () => {
            const xmlString = `<root></root>`;

            const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml" omit-xml-declaration="yes"/>
                <xsl:template match="/">
                    <result>
                        <xsl:try>
                            <xsl:value-of select="not-a-function()"/>
                            <xsl:catch errors="err:XPST0017">
                                <error>Static analysis error</error>
                            </xsl:catch>
                            <xsl:catch errors="*">
                                <error>Generic handler</error>
                            </xsl:catch>
                        </xsl:try>
                    </result>
                </xsl:template>
            </xsl:stylesheet>`;

            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            assert(result.includes('<error>Generic handler</error>'), 
                `Expected generic handler to execute, got: ${result}`);
        });
    });

    describe('Complex Error Scenarios', () => {
        it('should handle errors in nested instructions', async () => {
            const xmlString = `<root><items><item>1</item><item>2</item></items></root>`;

            const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml" omit-xml-declaration="yes"/>
                <xsl:template match="/">
                    <result>
                        <xsl:for-each select="//item">
                            <xsl:try>
                                <item><xsl:value-of select="10 div number(.)"/></item>
                                <xsl:catch errors="*">
                                    <error>Error processing item</error>
                                </xsl:catch>
                            </xsl:try>
                        </xsl:for-each>
                    </result>
                </xsl:template>
            </xsl:stylesheet>`;

            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            assert(result.includes('<item>10</item>'), 
                `Expected successful division for first item, got: ${result}`);
            assert(result.includes('<item>5</item>'), 
                `Expected successful division for second item, got: ${result}`);
        });

        it('should handle nested try/catch blocks', async () => {
            const xmlString = `<root></root>`;

            const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml" omit-xml-declaration="yes"/>
                <xsl:template match="/">
                    <result>
                        <xsl:try>
                            <outer>
                                <xsl:try>
                                    <xsl:value-of select="unknown()"/>
                                    <xsl:catch errors="*">
                                        <inner>Inner catch</inner>
                                    </xsl:catch>
                                </xsl:try>
                            </outer>
                            <xsl:catch errors="*">
                                <error>Outer catch</error>
                            </xsl:catch>
                        </xsl:try>
                    </result>
                </xsl:template>
            </xsl:stylesheet>`;

            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            assert(result.includes('<inner>Inner catch</inner>'), 
                `Expected inner catch to execute, got: ${result}`);
            assert(!result.includes('<error>Outer catch</error>'), 
                `Outer catch should not execute if inner catch handles error`);
        });

        it('should allow catch block without errors attribute (catch all)', async () => {
            const xmlString = `<root></root>`;

            const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml" omit-xml-declaration="yes"/>
                <xsl:template match="/">
                    <result>
                        <xsl:try>
                            <xsl:value-of select="missing-func(1,2,3)"/>
                            <xsl:catch>
                                <error>Caught without specifying error type</error>
                            </xsl:catch>
                        </xsl:try>
                    </result>
                </xsl:template>
            </xsl:stylesheet>`;

            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            assert(result.includes('<error>Caught without specifying error type</error>'), 
                `Expected catch without errors attribute to catch all, got: ${result}`);
        });
    });

    describe('Error Recovery', () => {
        it('should allow processing to continue after caught error', async () => {
            const xmlString = `<root></root>`;

            const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml" omit-xml-declaration="yes"/>
                <xsl:template match="/">
                    <result>
                        <before>Start</before>
                        <xsl:try>
                            <xsl:value-of select="fail-func()"/>
                            <xsl:catch errors="*">
                                <error>Caught</error>
                            </xsl:catch>
                        </xsl:try>
                        <after>End</after>
                    </result>
                </xsl:template>
            </xsl:stylesheet>`;

            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            assert(result.includes('<before>Start</before>'), 
                `Expected content before try/catch, got: ${result}`);
            assert(result.includes('<error>Caught</error>'), 
                `Expected caught error, got: ${result}`);
            assert(result.includes('<after>End</after>'), 
                `Expected content after try/catch, got: ${result}`);
        });

        it('should allow default output in catch block', async () => {
            const xmlString = `<root><value>test</value></root>`;

            const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml" omit-xml-declaration="yes"/>
                <xsl:template match="/">
                    <result>
                        <xsl:try>
                            <value><xsl:value-of select="bad-fn()"/></value>
                            <xsl:catch errors="*">
                                <value>default-value</value>
                            </xsl:catch>
                        </xsl:try>
                    </result>
                </xsl:template>
            </xsl:stylesheet>`;

            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const result = await xsltClass.xsltProcess(xml, xslt);

            assert(result.includes('<value>default-value</value>'), 
                `Expected default value in catch block, got: ${result}`);
        });
    });
});
