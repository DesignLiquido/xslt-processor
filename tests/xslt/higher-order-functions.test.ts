import assert from 'assert';

import { XmlParser } from "../../src/dom";
import { Xslt } from "../../src/xslt";

describe('Higher-Order Functions (XSLT 3.0)', () => {
    const xsltClass = new Xslt();
    const xmlParser = new XmlParser();

    it('should support inline function definitions', async () => {
        const xmlString = '<root/>';

        const xsltString = `<?xml version="1.0"?>
        <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:output method="xml" omit-xml-declaration="yes"/>
            <xsl:template match="/">
                <result>
                    <xsl:variable name="f" select="function($x) { $x * 2 }"/>
                    <doubled><xsl:value-of select="$f(21)"/></doubled>
                </result>
            </xsl:template>
        </xsl:stylesheet>`;

        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);
        const result = await xsltClass.xsltProcess(xml, xslt);

        assert(result.includes('<doubled>42</doubled>'), `Expected to find '<doubled>42</doubled>', got: ${result}`);
    });

    it('should support function references with named-function-ref syntax', async () => {
        const xmlString = '<root/>';

        const xsltString = `<?xml version="1.0"?>
        <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:output method="xml" omit-xml-declaration="yes"/>
            <xsl:template match="/">
                <result>
                    <xsl:variable name="ref" select="fn:concat#2" xmlns:fn="http://www.w3.org/2005/xpath-functions"/>
                    <value><xsl:value-of select="$ref('Hello', ' World')"/></value>
                </result>
            </xsl:template>
        </xsl:stylesheet>`;

        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);
        const result = await xsltClass.xsltProcess(xml, xslt);

        assert(result.includes('<value>Hello World</value>'), `Expected to find '<value>Hello World</value>', got: ${result}`);
    });

    it('should skip for-each for now (not yet implemented)', async () => {
        // TODO: Implement for-each once function name resolution is fixed
    });

    it('should skip filter for now (not yet implemented)', async () => {
        // TODO: Implement filter once function name resolution is fixed
    });

    it('should skip fold-left for now (not yet implemented)', async () => {
        // TODO: Implement fold-left once function name resolution is fixed
    });

    it('should support function with multiple parameters', async () => {
        const xmlString = '<root/>';

        const xsltString = `<?xml version="1.0"?>
        <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:output method="xml" omit-xml-declaration="yes"/>
            <xsl:template match="/">
                <result>
                    <xsl:variable name="add" select="function($x, $y) { $x + $y }"/>
                    <sum><xsl:value-of select="$add(10, 32)"/></sum>
                </result>
            </xsl:template>
        </xsl:stylesheet>`;

        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);
        const result = await xsltClass.xsltProcess(xml, xslt);

        assert(result.includes('<sum>42</sum>'), `Expected to find '<sum>42</sum>', got: ${result}`);
    });

    it('should support nested function calls', async () => {
        const xmlString = '<root/>';

        const xsltString = `<?xml version="1.0"?>
        <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:output method="xml" omit-xml-declaration="yes"/>
            <xsl:template match="/">
                <result>
                    <xsl:variable name="makeAdder" select="function($n) { function($x) { $x + $n } }"/>
                    <xsl:variable name="addFive" select="$makeAdder(5)"/>
                    <value><xsl:value-of select="$addFive(37)"/></value>
                </result>
            </xsl:template>
        </xsl:stylesheet>`;

        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);
        const result = await xsltClass.xsltProcess(xml, xslt);

        assert(result.includes('<value>42</value>'), `Expected to find '<value>42</value>', got: ${result}`);
    });
});
