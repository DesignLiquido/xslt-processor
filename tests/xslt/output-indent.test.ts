import { Xslt } from '../../src/xslt';
import { XmlParser } from '../../src/dom';

describe('xsl:output indent', () => {
    // https://github.com/DesignLiquido/xslt-processor/issues/219
    it('pretty-prints the output when indent="yes"', async () => {
        const xmlString = `<FOO></FOO>`;
        const xsltString = `<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:output method="xml" indent="yes"/>
    <xsl:template match="FOO">
        <BAR>
            <QUX>
            </QUX>
        </BAR>
    </xsl:template>
</xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);
        const result = await xsltClass.xsltProcess(xml, xslt);

        expect(result).toBe('<BAR>\n  <QUX/>\n</BAR>');
    });

    it('does not indent when indent="no" (default)', async () => {
        const xmlString = `<FOO></FOO>`;
        const xsltString = `<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:output method="xml"/>
    <xsl:template match="FOO">
        <BAR>
            <QUX>
            </QUX>
        </BAR>
    </xsl:template>
</xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);
        const result = await xsltClass.xsltProcess(xml, xslt);

        expect(result).toBe('<BAR><QUX/></BAR>');
    });

    it('does not insert whitespace into elements with mixed (text + element) content', async () => {
        const xmlString = `<FOO></FOO>`;
        const xsltString = `<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:output method="xml" indent="yes"/>
    <xsl:template match="FOO">
        <span>Before<b>bold</b>After</span>
    </xsl:template>
</xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);
        const result = await xsltClass.xsltProcess(xml, xslt);

        expect(result).toBe('<span>Before<b>bold</b>After</span>');
    });

    it('indents nested elements at increasing depths', async () => {
        const xmlString = `<FOO></FOO>`;
        const xsltString = `<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:output method="xml" indent="yes"/>
    <xsl:template match="FOO">
        <a><b><c/><d/></b></a>
    </xsl:template>
</xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);
        const result = await xsltClass.xsltProcess(xml, xslt);

        expect(result).toBe('<a>\n  <b>\n    <c/>\n    <d/>\n  </b>\n</a>');
    });

    it('honors indent="yes" set via xsl:result-document, independent of xsl:output', async () => {
        const xmlString = `<FOO></FOO>`;
        const xsltString = `<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:output method="xml" indent="no"/>
    <xsl:template match="FOO">
        <xsl:result-document href="out.xml" indent="yes">
            <BAR><QUX/></BAR>
        </xsl:result-document>
    </xsl:template>
</xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);
        await xsltClass.xsltProcess(xml, xslt);

        const resultDocuments = xsltClass.getResultDocuments();
        expect(resultDocuments.get('out.xml')).toBe('<BAR>\n  <QUX/>\n</BAR>');
    });
});
