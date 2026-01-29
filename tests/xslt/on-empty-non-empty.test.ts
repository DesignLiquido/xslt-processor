import assert from 'assert';

import { Xslt } from '../../src/xslt';
import { XmlParser } from '../../src/dom';

describe('xsl:on-empty / xsl:on-non-empty (XSLT 3.0)', () => {
    const xsltClass = new Xslt();
    const xmlParser = new XmlParser();

    it('handles xsl:on-empty when for-each selects nothing', async () => {
        const xmlString = `<root><items/></root>`;

        const xsltString = `<?xml version="1.0"?>
        <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:output method="xml" omit-xml-declaration="yes"/>
            <xsl:template match="/">
                <result>
                    <xsl:for-each select="//missing">
                        <xsl:on-empty><empty>none</empty></xsl:on-empty>
                        <xsl:on-non-empty><should-not>no</should-not></xsl:on-non-empty>
                        <item>should-not-run</item>
                    </xsl:for-each>
                </result>
            </xsl:template>
        </xsl:stylesheet>`;

        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);
        const result = await xsltClass.xsltProcess(xml, xslt);

        assert(result.includes('<empty>none</empty>'), `Expected empty fallback, got: ${result}`);
        assert(!result.includes('should-not-run'), `Did not expect normal body, got: ${result}`);
    });

    it('handles xsl:on-non-empty for for-each when selection is non-empty', async () => {
        const xmlString = `<root><item>1</item><item>2</item></root>`;

        const xsltString = `<?xml version="1.0"?>
        <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:output method="xml" omit-xml-declaration="yes"/>
            <xsl:template match="/">
                <result>
                    <xsl:for-each select="//item">
                        <xsl:on-non-empty>
                            <list>
                                <xsl:for-each select="//item">
                                    <i><xsl:value-of select="."/></i>
                                </xsl:for-each>
                            </list>
                        </xsl:on-non-empty>
                        <xsl:on-empty><empty>none</empty></xsl:on-empty>
                    </xsl:for-each>
                </result>
            </xsl:template>
        </xsl:stylesheet>`;

        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);
        const result = await xsltClass.xsltProcess(xml, xslt);

        assert(result.includes('<list>'), `Expected list wrapper, got: ${result}`);
        assert(result.includes('<i>1</i>'), `Expected item 1, got: ${result}`);
        assert(result.includes('<i>2</i>'), `Expected item 2, got: ${result}`);
        assert(!result.includes('<empty>none</empty>'), `Did not expect empty fallback, got: ${result}`);
    });

    it('runs normal for-each body when on-non-empty is not present', async () => {
        const xmlString = `<root><item>1</item><item>2</item></root>`;

        const xsltString = `<?xml version="1.0"?>
        <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:output method="xml" omit-xml-declaration="yes"/>
            <xsl:template match="/">
                <result>
                    <xsl:for-each select="//item">
                        <xsl:on-empty><empty>none</empty></xsl:on-empty>
                        <i><xsl:value-of select="."/></i>
                    </xsl:for-each>
                </result>
            </xsl:template>
        </xsl:stylesheet>`;

        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);
        const result = await xsltClass.xsltProcess(xml, xslt);

        assert(result.includes('<i>1</i>'), `Expected item 1, got: ${result}`);
        assert(result.includes('<i>2</i>'), `Expected item 2, got: ${result}`);
        assert(!result.includes('<empty>none</empty>'), `Did not expect empty fallback, got: ${result}`);
    });

    it('handles xsl:on-empty for apply-templates when selection is empty', async () => {
        const xmlString = `<root><item>1</item></root>`;

        const xsltString = `<?xml version="1.0"?>
        <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:output method="xml" omit-xml-declaration="yes"/>
            <xsl:template match="/">
                <result>
                    <xsl:apply-templates select="//missing">
                        <xsl:on-empty><empty>none</empty></xsl:on-empty>
                    </xsl:apply-templates>
                </result>
            </xsl:template>
        </xsl:stylesheet>`;

        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);
        const result = await xsltClass.xsltProcess(xml, xslt);

        assert(result.includes('<empty>none</empty>'), `Expected empty fallback, got: ${result}`);
    });

    it('handles xsl:on-non-empty for apply-templates when selection is non-empty', async () => {
        const xmlString = `<root><item>1</item></root>`;

        const xsltString = `<?xml version="1.0"?>
        <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:output method="xml" omit-xml-declaration="yes"/>
            <xsl:template match="/">
                <result>
                    <xsl:apply-templates select="//item">
                        <xsl:on-non-empty><has-items>yes</has-items></xsl:on-non-empty>
                    </xsl:apply-templates>
                </result>
            </xsl:template>
        </xsl:stylesheet>`;

        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);
        const result = await xsltClass.xsltProcess(xml, xslt);

        assert(result.includes('<has-items>yes</has-items>'), `Expected non-empty marker, got: ${result}`);
    });
});
