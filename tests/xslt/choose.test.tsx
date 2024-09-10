import assert from 'assert';

import { XmlParser } from '../../src/dom';
import { Xslt } from '../../src/xslt';

describe('xsl:choose', () => {
    it('Trivial', async () => {
        const xmlSource = `<?xml version="1.0" encoding="UTF-8"?>
            <products>
                <product>
                    <product_id>ABC</product_id>
                </product>
                <product>
                    <product_id>ABB</product_id>
                </product>
            </products>`;

        const xsltSource = `<?xml version="1.0" encoding="UTF-8"?><xsl:stylesheet version="2.0"
            xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:output method="xml" indent="yes"/>
        
            <xsl:template match="/products">
                <products>
                    <xsl:for-each select="product">
                        <product>
                            <xsl:choose>
                                <xsl:when test="product_id = 'ABB'">
                                    <xsl:text>Yes</xsl:text>
                                </xsl:when>
                                <xsl:otherwise>
                                    <xsl:text>No</xsl:text>
                                </xsl:otherwise>
                            </xsl:choose>
                        </product>
                    </xsl:for-each>
                </products>
            </xsl:template>
        </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlSource);
        const xslt = xmlParser.xmlParse(xsltSource);
        const html = await xsltClass.xsltProcess(xml, xslt);
        assert.equal(html, '<products><product>No</product><product>Yes</product></products>');
    });

    it('https://github.com/DesignLiquido/xslt-processor/issues/92', async () => {
        const xmlSource = `<sign gloss="simple">
                <hamnosys_sign>
                    <sign2>
                        <minitialconfig2>
                            <handconfig2>
                                <handshape2>
                                    <handshape1 handshapeclass="ham_flathand"/>
                                </handshape2>
                            </handconfig2>
                        </minitialconfig2>
                    </sign2>
                </hamnosys_sign>
            </sign>`;

        const xsltSource = `<xsl:transform version="1.0"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

            <!-- THESE OUTPUT SETTINGS MAY BE OVERRIDDEN BY THE H2S PROCESSOR: -->

            <xsl:output method="xml" omit-xml-declaration="yes"
                indent="yes" encoding="UTF-8"/>

            <!--######## handShapeValue ########-->

            <xsl:template name="handShapeValue">

                <xsl:variable name="hs" select="@handshapeclass"/>
                <xsl:value-of select="substring-after(concat(substring-before($hs,'hand'),$hs[not(contains(.,'hand'))]),'ham_')"/>

                <xsl:if test="$hs='ham_flathand'">
                    <xsl:value-of select="'flat'"/>
                </xsl:if>
                <xsl:if test="$hs!='ham_flathand'">
                    <xsl:value-of select="substring-after($hs,'ham_')"/>
                </xsl:if>

                <xsl:choose>
                    <xsl:when test="$hs='ham_flathand'">
                        <xsl:value-of select="'flat'"/>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:value-of select="substring-after($hs,'ham_')"/>
                    </xsl:otherwise>
                </xsl:choose>

                <xsl:choose>
                    <xsl:when test="$hs='ham_flathand'">
                        <xsl:value-of select="'flat'"/>
                    </xsl:when>
                </xsl:choose>
            
            </xsl:template>

            <!--######## sign ########-->

            <xsl:template match="/">
                <!--
                <!ELEMENT sign (hamnosys_sign?)>
                <!ATTLIST sign gloss CDATA #IMPLIED>
                -->

                <xsl:element name="hamgestural_sign">

                    <xsl:if test="@gloss">
                        <xsl:attribute name="gloss">
                            <xsl:value-of select="@gloss"/>
                        </xsl:attribute>
                    </xsl:if>

                    <xsl:element name="sign_manual">
                        <xsl:apply-templates select="sign/hamnosys_sign/sign2/minitialconfig2/handconfig2/handshape2/handshape1"/>
                    </xsl:element>

                </xsl:element>
            </xsl:template>
        </xsl:transform>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlSource);
        const xslt = xmlParser.xmlParse(xsltSource);
        const html = await xsltClass.xsltProcess(xml, xslt);
        assert.equal(html, '<hamgestural_sign><sign_manual/></hamgestural_sign>');
    });
});
