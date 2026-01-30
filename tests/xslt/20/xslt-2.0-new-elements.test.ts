import assert from 'assert';

import { XmlParser } from "../../../src/dom";
import { Xslt } from "../../../src/xslt";

describe('xsl:function (XSLT 2.0)', () => {
    it('should define and call a simple function', async () => {
        const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
        <root>
            <value>5</value>
        </root>`;

        const xsltString = `<?xml version="1.0"?>
        <xsl:stylesheet version="2.0" 
            xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
            xmlns:my="http://example.com/my">
            <xsl:output method="xml" omit-xml-declaration="yes"/>
            
            <xsl:function name="my:double">
                <xsl:param name="n"/>
                <xsl:sequence select="number($n) * 2"/>
            </xsl:function>
            
            <xsl:template match="/">
                <result>
                    <xsl:value-of select="my:double(5)"/>
                </result>
            </xsl:template>
        </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        assert.equal(outXmlString, '<result>10</result>');
    });

    it('should define and call a function with multiple parameters', async () => {
        const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
        <root><a>3</a><b>4</b></root>`;

        const xsltString = `<?xml version="1.0"?>
        <xsl:stylesheet version="2.0" 
            xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
            xmlns:my="http://example.com/my">
            <xsl:output method="xml" omit-xml-declaration="yes"/>
            
            <xsl:function name="my:add">
                <xsl:param name="x"/>
                <xsl:param name="y"/>
                <xsl:sequence select="number($x) + number($y)"/>
            </xsl:function>
            
            <xsl:template match="/">
                <result>
                    <xsl:value-of select="my:add(3, 4)"/>
                </result>
            </xsl:template>
        </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        assert.equal(outXmlString, '<result>7</result>');
    });

    it('should define and call a string function', async () => {
        const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
        <root/>`;

        const xsltString = `<?xml version="1.0"?>
        <xsl:stylesheet version="2.0" 
            xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
            xmlns:my="http://example.com/my">
            <xsl:output method="xml" omit-xml-declaration="yes"/>
            
            <xsl:function name="my:greet">
                <xsl:param name="name"/>
                <xsl:sequence select="concat('Hello, ', $name, '!')"/>
            </xsl:function>
            
            <xsl:template match="/">
                <result>
                    <xsl:value-of select="my:greet('World')"/>
                </result>
            </xsl:template>
        </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        assert.equal(outXmlString, '<result>Hello, World!</result>');
    });

    it('should throw error if function name is not in a namespace', async () => {
        const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
        <root/>`;

        const xsltString = `<?xml version="1.0"?>
        <xsl:stylesheet version="2.0" 
            xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:output method="xml" omit-xml-declaration="yes"/>
            
            <xsl:function name="myfunction">
                <xsl:sequence select="42"/>
            </xsl:function>
            
            <xsl:template match="/">
                <result/>
            </xsl:template>
        </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        try {
            await xsltClass.xsltProcess(xml, xslt);
            assert.fail('Should have thrown an error');
        } catch (e) {
            assert.ok((e as Error).message.includes('must be in a namespace'));
        }
    });

    it('should throw error if function has no name attribute', async () => {
        const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
        <root/>`;

        const xsltString = `<?xml version="1.0"?>
        <xsl:stylesheet version="2.0" 
            xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:output method="xml" omit-xml-declaration="yes"/>
            
            <xsl:function>
                <xsl:sequence select="42"/>
            </xsl:function>
            
            <xsl:template match="/">
                <result/>
            </xsl:template>
        </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        try {
            await xsltClass.xsltProcess(xml, xslt);
            assert.fail('Should have thrown an error');
        } catch (e) {
            assert.ok((e as Error).message.includes('requires a "name" attribute'));
        }
    });
});

describe('xsl:result-document (XSLT 2.0)', () => {
    it('should create a secondary output document', async () => {
        const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
        <root>
            <chapter id="1">Chapter 1</chapter>
            <chapter id="2">Chapter 2</chapter>
        </root>`;

        const xsltString = `<?xml version="1.0"?>
        <xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:output method="xml" omit-xml-declaration="yes"/>
            
            <xsl:template match="/">
                <main>
                    <xsl:for-each select="//chapter">
                        <xsl:result-document href="chapter{@id}.html" method="html">
                            <html>
                                <body><xsl:value-of select="."/></body>
                            </html>
                        </xsl:result-document>
                    </xsl:for-each>
                    <toc>
                        <xsl:for-each select="//chapter">
                            <link href="chapter{@id}.html"/>
                        </xsl:for-each>
                    </toc>
                </main>
            </xsl:template>
        </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        // Check main output
        assert.ok(outXmlString.includes('<toc>'));
        assert.ok(outXmlString.includes('<link href="chapter1.html"/>'));
        assert.ok(outXmlString.includes('<link href="chapter2.html"/>'));

        // Check result documents
        const resultDocs = xsltClass.getResultDocuments();
        assert.equal(resultDocs.size, 2);
        assert.ok(resultDocs.has('chapter1.html'));
        assert.ok(resultDocs.has('chapter2.html'));
        assert.ok(resultDocs.get('chapter1.html')?.includes('Chapter 1'));
        assert.ok(resultDocs.get('chapter2.html')?.includes('Chapter 2'));
    });

    it('should throw error for duplicate href', async () => {
        const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
        <root>
            <item>First</item>
            <item>Second</item>
        </root>`;

        const xsltString = `<?xml version="1.0"?>
        <xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:output method="xml" omit-xml-declaration="yes"/>
            
            <xsl:template match="/">
                <main>
                    <xsl:for-each select="//item">
                        <xsl:result-document href="output.html">
                            <xsl:value-of select="."/>
                        </xsl:result-document>
                    </xsl:for-each>
                </main>
            </xsl:template>
        </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        try {
            await xsltClass.xsltProcess(xml, xslt);
            assert.fail('Should have thrown an error');
        } catch (e) {
            assert.ok((e as Error).message.includes('already been created'));
        }
    });
});

describe('xsl:perform-sort (XSLT 2.0)', () => {
    it('should sort a sequence by default order (ascending)', async () => {
        const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
        <root>
            <item>Charlie</item>
            <item>Alice</item>
            <item>Bob</item>
        </root>`;

        const xsltString = `<?xml version="1.0"?>
        <xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:output method="xml" omit-xml-declaration="yes"/>
            
            <xsl:template match="/">
                <result>
                    <xsl:perform-sort select="//item">
                        <xsl:sort select="."/>
                    </xsl:perform-sort>
                </result>
            </xsl:template>
        </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        assert.equal(outXmlString, '<result><item>Alice</item><item>Bob</item><item>Charlie</item></result>');
    });

    it('should sort a sequence in descending order', async () => {
        const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
        <root>
            <item>1</item>
            <item>3</item>
            <item>2</item>
        </root>`;

        const xsltString = `<?xml version="1.0"?>
        <xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:output method="xml" omit-xml-declaration="yes"/>
            
            <xsl:template match="/">
                <result>
                    <xsl:perform-sort select="//item">
                        <xsl:sort select="." order="descending" data-type="number"/>
                    </xsl:perform-sort>
                </result>
            </xsl:template>
        </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        assert.equal(outXmlString, '<result><item>3</item><item>2</item><item>1</item></result>');
    });

    it('should handle empty sequence', async () => {
        const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
        <root></root>`;

        const xsltString = `<?xml version="1.0"?>
        <xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:output method="xml" omit-xml-declaration="yes"/>
            
            <xsl:template match="/">
                <result>
                    <xsl:perform-sort select="//item">
                        <xsl:sort select="."/>
                    </xsl:perform-sort>
                </result>
            </xsl:template>
        </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        assert.equal(outXmlString, '<result/>');
    });
});

describe('xsl:namespace (XSLT 2.0)', () => {
    it('should create a namespace node with prefix', async () => {
        const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
        <root><value>test</value></root>`;

        const xsltString = `<?xml version="1.0"?>
        <xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:output method="xml" omit-xml-declaration="yes"/>
            
            <xsl:template match="/">
                <result>
                    <xsl:namespace name="my" select="'http://example.com/my'"/>
                    <xsl:value-of select="//value"/>
                </result>
            </xsl:template>
        </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        assert.ok(outXmlString.includes('xmlns:my="http://example.com/my"'));
        assert.ok(outXmlString.includes('test'));
    });

    it('should create a default namespace node', async () => {
        const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
        <root><value>test</value></root>`;

        const xsltString = `<?xml version="1.0"?>
        <xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:output method="xml" omit-xml-declaration="yes"/>
            
            <xsl:template match="/">
                <result>
                    <xsl:namespace name="" select="'http://example.com/default'"/>
                    <xsl:value-of select="//value"/>
                </result>
            </xsl:template>
        </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        assert.ok(outXmlString.includes('xmlns="http://example.com/default"'));
    });

    it('should get namespace URI from child content', async () => {
        const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
        <root/>`;

        const xsltString = `<?xml version="1.0"?>
        <xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:output method="xml" omit-xml-declaration="yes"/>
            
            <xsl:template match="/">
                <result>
                    <xsl:namespace name="custom">http://custom.example.com</xsl:namespace>
                </result>
            </xsl:template>
        </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        assert.ok(outXmlString.includes('xmlns:custom="http://custom.example.com"'));
    });
});
