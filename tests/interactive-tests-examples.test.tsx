/* eslint-disable no-undef */
import assert from 'assert';

import { Xslt } from '../src/xslt';
import { XmlParser } from '../src/dom';

describe('Interactive Tests Examples', () => {
    // TODO: Per https://github.com/DesignLiquido/xslt-processor/issues/116, while debugging
    // this test, we've found that `<xsl:apply-templates>` with a `select` attribute +
    // `<xsl:template>` does not work well for relative XPath (it works for absolute XPath). 
    // The problem happens because the implementation calls the traditional `<xsl:template>`, 
    // which it tries to re-select nodes that are already selected in the expression context by 
    // `<xsl:apply-templates>`. Instead, it should "select the appropriate template", as mentioned
    // at https://www.w3.org/TR/xslt-10/#section-Applying-Template-Rules and 
    // https://learn.microsoft.com/en-us/previous-versions/dotnet/netframework-4.0/ms256184(v=vs.100), 
    // and process each child by the selected template.
    it.skip('Former xslt.html', async () => {
        const xmlString = (
            `<page>
                <message>
                    Hello World.
                </message>
            </page>`
        );

        const xsltString =
            `<?xml version="1.0"?>
            <xsl:stylesheet>
                <xsl:template match="/">
                    <xsl:apply-templates select="page/message"/>
                </xsl:template>

                <xsl:template match="page/message">
                    <div style="color:green">
                        <xsl:value-of select="."/>
                    </div>
                </xsl:template>
            </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        assert.ok(outXmlString);
    });
});