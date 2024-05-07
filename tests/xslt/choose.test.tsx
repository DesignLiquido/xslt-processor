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
});
