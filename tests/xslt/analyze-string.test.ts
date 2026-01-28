import assert from 'assert';

import { XmlParser } from "../../src/dom";
import { Xslt } from "../../src/xslt";

describe('xsl:analyze-string (XSLT 2.0)', () => {
    it('should split string into matching and non-matching parts', async () => {
        const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
        <root>
            <text>The cat sat on the mat.</text>
        </root>`;

        const xsltString = `<?xml version="1.0"?>
        <xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:output method="xml" omit-xml-declaration="yes"/>
            <xsl:template match="/">
                <result>
                    <xsl:analyze-string select="//text" regex="\\w+at">
                        <xsl:matching-substring>
                            <match><xsl:value-of select="."/></match>
                        </xsl:matching-substring>
                        <xsl:non-matching-substring>
                            <non-match><xsl:value-of select="."/></non-match>
                        </xsl:non-matching-substring>
                    </xsl:analyze-string>
                </result>
            </xsl:template>
        </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        // Should match "cat", "sat", "mat" and have non-matching parts between
        assert.ok(outXmlString.includes('<match>cat</match>'));
        assert.ok(outXmlString.includes('<match>sat</match>'));
        assert.ok(outXmlString.includes('<match>mat</match>'));
        assert.ok(outXmlString.includes('<non-match>The </non-match>'));
    });

    it('should support regex-group() function for capturing groups', async () => {
        const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
        <root>
            <date>2024-01-15</date>
        </root>`;

        const xsltString = `<?xml version="1.0"?>
        <xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:output method="xml" omit-xml-declaration="yes"/>
            <xsl:template match="/">
                <result>
                    <xsl:analyze-string select="//date" regex="(\\d{4})-(\\d{2})-(\\d{2})">
                        <xsl:matching-substring>
                            <year><xsl:value-of select="regex-group(1)"/></year>
                            <month><xsl:value-of select="regex-group(2)"/></month>
                            <day><xsl:value-of select="regex-group(3)"/></day>
                        </xsl:matching-substring>
                    </xsl:analyze-string>
                </result>
            </xsl:template>
        </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        assert.equal(outXmlString, '<result><year>2024</year><month>01</month><day>15</day></result>');
    });

    it('should handle case-insensitive matching with flags', async () => {
        const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
        <root>
            <text>Hello WORLD hello</text>
        </root>`;

        const xsltString = `<?xml version="1.0"?>
        <xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:output method="xml" omit-xml-declaration="yes"/>
            <xsl:template match="/">
                <result>
                    <xsl:analyze-string select="//text" regex="hello" flags="i">
                        <xsl:matching-substring>
                            <match><xsl:value-of select="."/></match>
                        </xsl:matching-substring>
                    </xsl:analyze-string>
                </result>
            </xsl:template>
        </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        // Should match both "Hello" and "hello" case-insensitively
        assert.equal(outXmlString, '<result><match>Hello</match><match>hello</match></result>');
    });

    it('should handle only matching-substring', async () => {
        const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
        <root>
            <text>abc123def456</text>
        </root>`;

        const xsltString = `<?xml version="1.0"?>
        <xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:output method="xml" omit-xml-declaration="yes"/>
            <xsl:template match="/">
                <result>
                    <xsl:analyze-string select="//text" regex="\\d+">
                        <xsl:matching-substring>
                            <num><xsl:value-of select="."/></num>
                        </xsl:matching-substring>
                    </xsl:analyze-string>
                </result>
            </xsl:template>
        </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        assert.equal(outXmlString, '<result><num>123</num><num>456</num></result>');
    });

    it('should handle only non-matching-substring', async () => {
        const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
        <root>
            <text>abc123def456ghi</text>
        </root>`;

        const xsltString = `<?xml version="1.0"?>
        <xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:output method="xml" omit-xml-declaration="yes"/>
            <xsl:template match="/">
                <result>
                    <xsl:analyze-string select="//text" regex="\\d+">
                        <xsl:non-matching-substring>
                            <text><xsl:value-of select="."/></text>
                        </xsl:non-matching-substring>
                    </xsl:analyze-string>
                </result>
            </xsl:template>
        </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        assert.equal(outXmlString, '<result><text>abc</text><text>def</text><text>ghi</text></result>');
    });

    it('should handle no matches', async () => {
        const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
        <root>
            <text>hello world</text>
        </root>`;

        const xsltString = `<?xml version="1.0"?>
        <xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:output method="xml" omit-xml-declaration="yes"/>
            <xsl:template match="/">
                <result>
                    <xsl:analyze-string select="//text" regex="\\d+">
                        <xsl:matching-substring>
                            <match><xsl:value-of select="."/></match>
                        </xsl:matching-substring>
                        <xsl:non-matching-substring>
                            <text><xsl:value-of select="."/></text>
                        </xsl:non-matching-substring>
                    </xsl:analyze-string>
                </result>
            </xsl:template>
        </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        // No matches, so entire string goes to non-matching-substring
        assert.equal(outXmlString, '<result><text>hello world</text></result>');
    });

    it('should handle regex-group(0) for full match', async () => {
        const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
        <root>
            <email>user@example.com</email>
        </root>`;

        const xsltString = `<?xml version="1.0"?>
        <xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:output method="xml" omit-xml-declaration="yes"/>
            <xsl:template match="/">
                <result>
                    <xsl:analyze-string select="//email" regex="(\\w+)@(\\w+)\\.(\\w+)">
                        <xsl:matching-substring>
                            <full><xsl:value-of select="regex-group(0)"/></full>
                            <user><xsl:value-of select="regex-group(1)"/></user>
                            <domain><xsl:value-of select="regex-group(2)"/></domain>
                            <tld><xsl:value-of select="regex-group(3)"/></tld>
                        </xsl:matching-substring>
                    </xsl:analyze-string>
                </result>
            </xsl:template>
        </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        assert.equal(outXmlString, '<result><full>user@example.com</full><user>user</user><domain>example</domain><tld>com</tld></result>');
    });

    it('should return empty string for non-existent regex group', async () => {
        const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
        <root>
            <text>abc</text>
        </root>`;

        const xsltString = `<?xml version="1.0"?>
        <xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:output method="xml" omit-xml-declaration="yes"/>
            <xsl:template match="/">
                <result>
                    <xsl:analyze-string select="//text" regex="(a)(b)">
                        <xsl:matching-substring>
                            <g1><xsl:value-of select="regex-group(1)"/></g1>
                            <g2><xsl:value-of select="regex-group(2)"/></g2>
                            <g99><xsl:value-of select="regex-group(99)"/></g99>
                        </xsl:matching-substring>
                    </xsl:analyze-string>
                </result>
            </xsl:template>
        </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        assert.equal(outXmlString, '<result><g1>a</g1><g2>b</g2><g99></g99></result>');
    });

    it('should throw error for missing select attribute', async () => {
        const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
        <root><text>test</text></root>`;

        const xsltString = `<?xml version="1.0"?>
        <xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:output method="xml" omit-xml-declaration="yes"/>
            <xsl:template match="/">
                <xsl:analyze-string regex="\\d+">
                    <xsl:matching-substring>
                        <match/>
                    </xsl:matching-substring>
                </xsl:analyze-string>
            </xsl:template>
        </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        await assert.rejects(
            async () => await xsltClass.xsltProcess(xml, xslt),
            /select attribute/
        );
    });

    it('should throw error for missing regex attribute', async () => {
        const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
        <root><text>test</text></root>`;

        const xsltString = `<?xml version="1.0"?>
        <xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:output method="xml" omit-xml-declaration="yes"/>
            <xsl:template match="/">
                <xsl:analyze-string select="//text">
                    <xsl:matching-substring>
                        <match/>
                    </xsl:matching-substring>
                </xsl:analyze-string>
            </xsl:template>
        </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        await assert.rejects(
            async () => await xsltClass.xsltProcess(xml, xslt),
            /regex attribute/
        );
    });

    it('should throw error for matching-substring outside analyze-string', async () => {
        const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
        <root><text>test</text></root>`;

        const xsltString = `<?xml version="1.0"?>
        <xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:output method="xml" omit-xml-declaration="yes"/>
            <xsl:template match="/">
                <xsl:matching-substring>
                    <match/>
                </xsl:matching-substring>
            </xsl:template>
        </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        await assert.rejects(
            async () => await xsltClass.xsltProcess(xml, xslt),
            /must be a child of.*analyze-string/
        );
    });
});
