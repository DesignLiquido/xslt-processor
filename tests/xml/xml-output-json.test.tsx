import assert from 'assert';

import { Xslt } from '../../src/xslt';
import { XmlParser } from '../../src/dom';

describe('JSON Output', () => {
    it('should convert simple XML to JSON', async () => {
        const xmlString = `<root>
          <item>test</item>
        </root>`;

        const xsltString = `<?xml version="1.0"?>
          <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/">
              <xsl:copy-of select="root"/>
            </xsl:template>
          </xsl:stylesheet>`;

        const xsltClass = new Xslt({ outputMethod: 'json' });
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);
        const result = await xsltClass.xsltProcess(xml, xslt);

        const parsed = JSON.parse(result);
        assert.strictEqual(parsed.root.item, 'test');
    });

    it('should handle nested elements in JSON', async () => {
        const xmlString = `<root>
          <users>
            <user>Alice</user>
            <user>Bob</user>
          </users>
        </root>`;

        const xsltString = `<?xml version="1.0"?>
          <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/">
              <xsl:copy-of select="root"/>
            </xsl:template>
          </xsl:stylesheet>`;

        const xsltClass = new Xslt({ outputMethod: 'json' });
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);
        const result = await xsltClass.xsltProcess(xml, xslt);

        const parsed = JSON.parse(result);
        assert(Array.isArray(parsed.root.users.user));
        assert.strictEqual(parsed.root.users.user.length, 2);
        assert.strictEqual(parsed.root.users.user[0], 'Alice');
        assert.strictEqual(parsed.root.users.user[1], 'Bob');
    });

    it('should handle complex nested structure in JSON', async () => {
        const xmlString = `<root>
          <person>
            <name>John</name>
            <age>30</age>
            <address>
              <street>Main St</street>
              <city>NYC</city>
            </address>
          </person>
        </root>`;

        const xsltString = `<?xml version="1.0"?>
          <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/">
              <xsl:copy-of select="root"/>
            </xsl:template>
          </xsl:stylesheet>`;

        const xsltClass = new Xslt({ outputMethod: 'json' });
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);
        const result = await xsltClass.xsltProcess(xml, xslt);

        const parsed = JSON.parse(result);
        assert.strictEqual(parsed.root.person.name, 'John');
        assert.strictEqual(parsed.root.person.age, '30');
        assert.strictEqual(parsed.root.person.address.street, 'Main St');
        assert.strictEqual(parsed.root.person.address.city, 'NYC');
    });

    it('should handle empty elements in JSON', async () => {
        const xmlString = `<root>
          <empty/>
          <withContent>value</withContent>
        </root>`;

        const xsltString = `<?xml version="1.0"?>
          <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/">
              <xsl:copy-of select="root"/>
            </xsl:template>
          </xsl:stylesheet>`;

        const xsltClass = new Xslt({ outputMethod: 'json' });
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);
        const result = await xsltClass.xsltProcess(xml, xslt);

        const parsed = JSON.parse(result);
        // Empty elements should not appear in JSON
        assert(parsed.root.empty === undefined);
        // Elements with content should be present
        assert.strictEqual(parsed.root.withContent, 'value');
    });

    it('should handle XSLT transformations with JSON output', async () => {
        const xmlString = `<root>
          <item>Product A</item>
          <item>Product B</item>
        </root>`;

        const xsltString = `<?xml version="1.0"?>
          <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/">
              <products>
                <xsl:apply-templates select="root/item"/>
              </products>
            </xsl:template>
            <xsl:template match="item">
              <xsl:element name="product">
                <xsl:element name="name"><xsl:value-of select="."/></xsl:element>
              </xsl:element>
            </xsl:template>
          </xsl:stylesheet>`;

        const xsltClass = new Xslt({ outputMethod: 'json' });
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);
        const result = await xsltClass.xsltProcess(xml, xslt);

        const parsed = JSON.parse(result);
        assert(Array.isArray(parsed.products.product));
        assert.strictEqual(parsed.products.product.length, 2);
        assert.strictEqual(parsed.products.product[0].name, 'Product A');
        assert.strictEqual(parsed.products.product[1].name, 'Product B');
    });

    it('should return valid JSON for empty document', async () => {
        const xmlString = `<root/>`;

        const xsltString = `<?xml version="1.0"?>
          <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/">
              <xsl:copy-of select="root"/>
            </xsl:template>
          </xsl:stylesheet>`;

        const xsltClass = new Xslt({ outputMethod: 'json' });
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);
        const result = await xsltClass.xsltProcess(xml, xslt);

        // Should be valid JSON
        const parsed = JSON.parse(result);
        assert(typeof parsed === 'object');
    });
});

