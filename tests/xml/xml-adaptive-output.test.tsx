import assert from 'assert';

import { Xslt } from '../../src/xslt';
import { XmlParser } from '../../src/dom';

describe('Adaptive Output', () => {
    it('should detect text output for pure text result', async () => {
        const xmlString = `<root>
          <value>Hello World</value>
        </root>`;

        const xsltString = `<?xml version="1.0"?>
          <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/">
              <xsl:value-of select="root/value"/>
            </xsl:template>
          </xsl:stylesheet>`;

        const xsltClass = new Xslt({ outputMethod: 'adaptive' });
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);
        const result = await xsltClass.xsltProcess(xml, xslt);

        // Should output pure text without XML wrapper
        assert.strictEqual(result.trim(), 'Hello World');
    });

    it('should detect XML output for element result', async () => {
        const xmlString = `<root>
          <user>John</user>
          <user>Jane</user>
        </root>`;

        const xsltString = `<?xml version="1.0"?>
          <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/">
              <users>
                <xsl:copy-of select="root/user"/>
              </users>
            </xsl:template>
          </xsl:stylesheet>`;

        const xsltClass = new Xslt({ outputMethod: 'adaptive' });
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);
        const result = await xsltClass.xsltProcess(xml, xslt);

        // Should output as XML
        assert(result.includes('<users>'));
        assert(result.includes('</users>'));
        assert(result.includes('<user>'));
    });

    it('should detect XML output for complex nested structure', async () => {
        const xmlString = `<root>
          <person>
            <name>Alice</name>
            <age>30</age>
          </person>
        </root>`;

        const xsltString = `<?xml version="1.0"?>
          <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/">
              <xsl:copy-of select="root"/>
            </xsl:template>
          </xsl:stylesheet>`;

        const xsltClass = new Xslt({ outputMethod: 'adaptive' });
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);
        const result = await xsltClass.xsltProcess(xml, xslt);

        // Should output as XML
        assert(result.includes('<root>'));
        assert(result.includes('<person>'));
        assert(result.includes('<name>'));
    });

    it('should detect text output for concatenated text nodes', async () => {
        const xmlString = `<root>Hello World</root>`;

        const xsltString = `<?xml version="1.0"?>
          <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/">
              <xsl:value-of select="root"/>
            </xsl:template>
          </xsl:stylesheet>`;

        const xsltClass = new Xslt({ outputMethod: 'adaptive' });
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);
        const result = await xsltClass.xsltProcess(xml, xslt);

        // Should output as plain text
        assert.strictEqual(result.trim(), 'Hello World');
    });

    it('should detect text output for number/boolean conversion', async () => {
        const xmlString = `<root>
          <count>42</count>
        </root>`;

        const xsltString = `<?xml version="1.0"?>
          <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/">
              <xsl:value-of select="root/count"/>
            </xsl:template>
          </xsl:stylesheet>`;

        const xsltClass = new Xslt({ outputMethod: 'adaptive' });
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);
        const result = await xsltClass.xsltProcess(xml, xslt);

        // Should output as plain text
        assert.strictEqual(result.trim(), '42');
    });

    it('should detect XML output for multiple top-level elements', async () => {
        const xmlString = `<root>
          <item>One</item>
          <item>Two</item>
        </root>`;

        const xsltString = `<?xml version="1.0"?>
          <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/">
              <xsl:for-each select="root/item">
                <item><xsl:value-of select="."/></item>
              </xsl:for-each>
            </xsl:template>
          </xsl:stylesheet>`;

        const xsltClass = new Xslt({ outputMethod: 'adaptive' });
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);
        const result = await xsltClass.xsltProcess(xml, xslt);

        // Should output as XML (multiple elements at top level)
        assert(result.includes('<item>'));
        assert(result.includes('</item>'));
    });

    it('should detect XML output for empty result defaulting to xml', async () => {
        const xmlString = `<root/>`;

        const xsltString = `<?xml version="1.0"?>
          <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/">
              <empty/>
            </xsl:template>
          </xsl:stylesheet>`;

        const xsltClass = new Xslt({ outputMethod: 'adaptive' });
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);
        const result = await xsltClass.xsltProcess(xml, xslt);

        // Should output as XML
        assert(result.includes('<empty'));
    });

    it('should detect text output for single text node with whitespace trimming', async () => {
        const xmlString = `<root>
          <message>   Important Text   </message>
        </root>`;

        const xsltString = `<?xml version="1.0"?>
          <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/">
              <xsl:value-of select="root/message"/>
            </xsl:template>
          </xsl:stylesheet>`;

        const xsltClass = new Xslt({ outputMethod: 'adaptive' });
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);
        const result = await xsltClass.xsltProcess(xml, xslt);

        // Should output as plain text
        assert.strictEqual(result.trim(), 'Important Text');
    });

    it('should work with transformation producing XML structure', async () => {
        const xmlString = `<data>
          <record id="1">Alice</record>
          <record id="2">Bob</record>
        </data>`;

        const xsltString = `<?xml version="1.0"?>
          <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/">
              <results>
                <xsl:apply-templates select="data/record"/>
              </results>
            </xsl:template>
            <xsl:template match="record">
              <entry>
                <id><xsl:value-of select="@id"/></id>
                <name><xsl:value-of select="."/></name>
              </entry>
            </xsl:template>
          </xsl:stylesheet>`;

        const xsltClass = new Xslt({ outputMethod: 'adaptive' });
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);
        const result = await xsltClass.xsltProcess(xml, xslt);

        // Should output as XML
        assert(result.includes('<results>'));
        assert(result.includes('<entry>'));
        assert(result.includes('<id>'));
        assert(result.includes('<name>'));
    });
});
