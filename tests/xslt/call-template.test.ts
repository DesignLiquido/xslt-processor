import { Xslt, XmlParser } from '../../src/index';

describe('xsl:call-template', () => {
    let xslt: Xslt;
    let xmlParser: XmlParser;

    beforeEach(() => {
        xslt = new Xslt();
        xmlParser = new XmlParser();
    });

    // https://github.com/DesignLiquido/xslt-processor/issues/217
    it('supports recursion, using a variable to hold the result of a nested call-template', async () => {
        const xml = xmlParser.xmlParse('<FOO></FOO>');
        const stylesheet = xmlParser.xmlParse(`<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:output method="xml" indent="yes"/>

    <xsl:template name="factorial">
        <xsl:param name="number"/>
        <xsl:choose>
            <xsl:when test="$number = 1">
                <xsl:value-of select="1"/>
            </xsl:when>
            <xsl:otherwise>
                <xsl:variable name="temp">
                    <xsl:call-template name="factorial">
                        <xsl:with-param name="number" select="$number - 1"/>
                    </xsl:call-template>
                </xsl:variable>
                <xsl:value-of select="$number * $temp"/>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>

    <xsl:template match="FOO">
        <QUX>
            <xsl:attribute name="factorial">
                <xsl:call-template name="factorial">
                    <xsl:with-param name="number" select="5"/>
                </xsl:call-template>
            </xsl:attribute>
        </QUX>
    </xsl:template>
</xsl:stylesheet>`);
        const result = await xslt.xsltProcess(xml, stylesheet);
        expect(result).toBe('<QUX factorial="120"/>');
    });
});
