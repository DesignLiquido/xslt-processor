import assert from 'assert';

import { XmlParser } from "../../src/dom";
import { Xslt } from "../../src/xslt";

describe('xsl:strip-space', () => {
    it('Basic strip-space with wildcard (*) - Issue 100', async () => {
        const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
<root>
    <item>
        <name>First</name>
    </item>
    <item>
        <name>Second</name>
    </item>
</root>`;

        const xsltString = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:strip-space elements="*"/>
    <xsl:output method="xml" indent="no"/>

    <xsl:template match="/">
        <result><xsl:apply-templates select="root/item"/></result>
    </xsl:template>

    <xsl:template match="item">
        <entry><xsl:value-of select="name"/></entry>
    </xsl:template>
</xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        // Without strip-space, there would be whitespace between entries
        assert.equal(outXmlString, `<result><entry>First</entry><entry>Second</entry></result>`);
    });

    it('Strip-space with specific element name', async () => {
        const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
<root>
    <item>   Text with spaces   </item>
    <other>   Text with spaces   </other>
</root>`;

        const xsltString = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:strip-space elements="root"/>
    <xsl:output method="xml" indent="no"/>

    <xsl:template match="/">
        <xsl:copy-of select="root"/>
    </xsl:template>
</xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        // Whitespace between root's children is stripped, but content of item/other is preserved
        assert.equal(outXmlString, `<root><item>   Text with spaces   </item><other>   Text with spaces   </other></root>`);
    });

    it('Strip-space with multiple element names', async () => {
        const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
<root>
    <a>
        <b>content</b>
    </a>
    <c>
        <d>other</d>
    </c>
</root>`;

        const xsltString = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:strip-space elements="root a"/>
    <xsl:output method="xml" indent="no"/>

    <xsl:template match="/">
        <xsl:copy-of select="root"/>
    </xsl:template>
</xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        // Whitespace inside root and a is stripped, but inside c it's preserved
        assert.ok(outXmlString.includes('<a><b>content</b></a>'));
        assert.ok(outXmlString.includes('<c>'));
    });

    it('Preserve-space overrides strip-space', async () => {
        const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
<root>
    <pre>
        preserved
    </pre>
    <code>
        also preserved
    </code>
</root>`;

        const xsltString = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:strip-space elements="*"/>
    <xsl:preserve-space elements="pre code"/>
    <xsl:output method="xml" indent="no"/>

    <xsl:template match="/">
        <xsl:copy-of select="root"/>
    </xsl:template>
</xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        // Whitespace inside pre and code should be preserved despite strip-space="*"
        assert.ok(outXmlString.includes('preserved'));
        assert.ok(outXmlString.includes('also preserved'));
        // Root's direct whitespace children should be stripped
        assert.ok(outXmlString.startsWith('<root><pre>'));
    });

    it('xml:space="preserve" takes precedence over strip-space', async () => {
        const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
<root>
    <item xml:space="preserve">
        whitespace here
    </item>
</root>`;

        const xsltString = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:strip-space elements="*"/>
    <xsl:output method="xml" indent="no"/>

    <xsl:template match="/">
        <xsl:copy-of select="root"/>
    </xsl:template>
</xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        // Whitespace inside item should be preserved due to xml:space="preserve"
        assert.ok(outXmlString.includes('whitespace here'));
    });

    it('No strip-space by default - whitespace text nodes are processed', async () => {
        // This test verifies that without strip-space, whitespace-only text nodes
        // from the input are processed. With apply-templates, text nodes create
        // output (though serialization may normalize whitespace for display).
        const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
<root><a>text</a></root>`;

        const xsltString = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:output method="xml" indent="no"/>

    <xsl:template match="/">
        <xsl:copy-of select="root"/>
    </xsl:template>
</xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        // Without strip-space, content should be preserved
        assert.equal(outXmlString, `<root><a>text</a></root>`);
    });

    it('Strip-space applies to apply-templates', async () => {
        const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
<books>
    <book>
        <title>First Book</title>
    </book>
    <book>
        <title>Second Book</title>
    </book>
</books>`;

        const xsltString = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:strip-space elements="*"/>
    <xsl:output method="xml" indent="no"/>

    <xsl:template match="/books">
        <library><xsl:apply-templates select="book"/></library>
    </xsl:template>

    <xsl:template match="book">
        <item><xsl:value-of select="title"/></item>
    </xsl:template>
</xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        assert.equal(outXmlString, `<library><item>First Book</item><item>Second Book</item></library>`);
    });

    it('Non-whitespace text is never stripped', async () => {
        const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
<root><item>actual text content</item></root>`;

        const xsltString = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:strip-space elements="*"/>
    <xsl:output method="xml" indent="no"/>

    <xsl:template match="/">
        <xsl:copy-of select="root"/>
    </xsl:template>
</xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        // Text content should never be stripped
        assert.equal(outXmlString, `<root><item>actual text content</item></root>`);
    });

    it('Strip-space with namespace-prefixed pattern', async () => {
        const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
<root xmlns:p="urn:test">
    <p:item>
        <p:value>1</p:value>
    </p:item>
    <p:other> text </p:other>
</root>`;

        const xsltString = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:p="urn:test">
    <xsl:strip-space elements="p:*"/>
    <xsl:output method="xml" indent="no"/>

    <xsl:template match="/">
        <xsl:copy-of select="root"/>
    </xsl:template>
</xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const outXmlString = await xsltClass.xsltProcess(xml, xslt);
        assert.ok(outXmlString.includes('<p:item><p:value>1</p:value></p:item>'));
        assert.ok(outXmlString.includes('<p:other> text </p:other>'));
    });
});

describe('xsl:preserve-space', () => {
    it('Preserve-space keeps whitespace in specified elements', async () => {
        const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
<root>
    <code>
    function hello() {
        return "world";
    }
    </code>
</root>`;

        const xsltString = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:strip-space elements="*"/>
    <xsl:preserve-space elements="code"/>
    <xsl:output method="xml" indent="no"/>

    <xsl:template match="/">
        <xsl:copy-of select="root"/>
    </xsl:template>
</xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        // Code content formatting should be preserved
        assert.ok(outXmlString.includes('function hello()'));
        assert.ok(outXmlString.includes('return "world"'));
    });
});
