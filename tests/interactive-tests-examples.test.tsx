/* eslint-disable no-undef */
import assert from 'assert';

import { Xslt } from '../src/xslt';
import { XmlParser } from '../src/dom';

describe('Interactive Tests Examples', () => {
    // Issue 116 (https://github.com/DesignLiquido/xslt-processor/issues/116) was fixed
    // by the new XPath implementation. The issue was that `<xsl:apply-templates>` with
    // a `select` attribute didn't work well with relative XPath patterns in templates.
    it('Former xslt.html', async () => {
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