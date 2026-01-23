/* eslint-disable no-useless-escape */
import assert from 'assert';

import { Xslt } from '../src/xslt';
import { XmlParser } from '../src/dom';

// Helper function to get text content from an element
// XNode doesn't have textContent property, so we need to get it from child text nodes
function getTextContent(element: any): string {
    if (!element) return '';
    if (element.nodeType === 3) { // Text node
        return element.nodeValue || '';
    }
    if (element.childNodes && element.childNodes.length > 0) {
        return element.childNodes
            .filter((node: any) => node.nodeType === 3) // Only text nodes
            .map((node: any) => node.nodeValue || '')
            .join('');
    }
    return '';
}

describe('json-to-xml', () => {
    it('json-to-xml() should throw error in XSLT 1.0', async () => {
        const xmlString = `<root/>`;

        const xsltString = `<?xml version="1.0"?>
          <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/">
              <result><xsl:value-of select="json-to-xml('&quot;test&quot;')"/></result>
            </xsl:template>
          </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        await assert.rejects(
            async () => await xsltClass.xsltProcess(xml, xslt),
            {
                message: /json-to-xml\(\) is not supported in XSLT 1\.0/
            }
        );
    });

    it('json-to-xml() should convert simple string JSON in XSLT 3.0', async () => {
        const xmlString = `<root/>`;

        const xsltString = `<?xml version="1.0"?>
          <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/">
              <result>
                <xsl:copy-of select="json-to-xml('&quot;hello&quot;')"/>
              </result>
            </xsl:template>
          </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);
        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        // Parse output and verify structure
        const outDoc = xmlParser.xmlParse(outXmlString);
        const rootElements = outDoc.getElementsByTagName('root');
        assert.strictEqual(rootElements.length, 1, 'Should have exactly one root element');
        assert.strictEqual(getTextContent(rootElements[0]), 'hello', 'Root element should contain text "hello"');
    });

    it('json-to-xml() should convert simple number JSON', async () => {
        const xmlString = `<root/>`;

        const xsltString = `<?xml version="1.0"?>
          <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/">
              <result>
                <xsl:copy-of select="json-to-xml('42')"/>
              </result>
            </xsl:template>
          </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);
        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        // Parse output and verify structure
        const outDoc = xmlParser.xmlParse(outXmlString);
        const rootElements = outDoc.getElementsByTagName('root');
        assert.strictEqual(rootElements.length, 1, 'Should have exactly one root element');
        assert.strictEqual(getTextContent(rootElements[0]), '42', 'Root element should contain text "42"');
    });

    it('json-to-xml() should convert boolean true', async () => {
        const xmlString = `<root/>`;

        const xsltString = `<?xml version="1.0"?>
          <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/">
              <result>
                <xsl:copy-of select="json-to-xml('true')"/>
              </result>
            </xsl:template>
          </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);
        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        // Parse output and verify structure
        const outDoc = xmlParser.xmlParse(outXmlString);
        const rootElements = outDoc.getElementsByTagName('root');
        assert.strictEqual(rootElements.length, 1, 'Should have exactly one root element');
        assert.strictEqual(getTextContent(rootElements[0]), 'true', 'Root element should contain text "true"');
    });

    it('json-to-xml() should convert boolean false', async () => {
        const xmlString = `<root/>`;

        const xsltString = `<?xml version="1.0"?>
          <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/">
              <result>
                <xsl:copy-of select="json-to-xml('false')"/>
              </result>
            </xsl:template>
          </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);
        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        // Parse output and verify structure
        const outDoc = xmlParser.xmlParse(outXmlString);
        const rootElements = outDoc.getElementsByTagName('root');
        assert.strictEqual(rootElements.length, 1, 'Should have exactly one root element');
        assert.strictEqual(getTextContent(rootElements[0]), 'false', 'Root element should contain text "false"');
    });

    it('json-to-xml() should convert null JSON', async () => {
        const xmlString = `<root/>`;

        const xsltString = `<?xml version="1.0"?>
          <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/">
              <result>
                <xsl:copy-of select="json-to-xml('null')"/>
              </result>
            </xsl:template>
          </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);
        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        // Parse output and verify structure
        const outDoc = xmlParser.xmlParse(outXmlString);
        const rootElements = outDoc.getElementsByTagName('root');
        assert.strictEqual(rootElements.length, 1, 'Should have exactly one root element');
        assert.strictEqual(rootElements[0].childNodes.length, 0, 'Root element should be empty for null value');
    });

    it('json-to-xml() should convert simple object', async () => {
        const xmlString = `<root/>`;

        const xsltString = `<?xml version="1.0"?>
          <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/">
              <result>
                <xsl:copy-of select="json-to-xml('{&quot;name&quot;:&quot;John&quot;,&quot;age&quot;:30}')"/>
              </result>
            </xsl:template>
          </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);
        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        // Parse output and verify structure
        const outDoc = xmlParser.xmlParse(outXmlString);
        const rootElements = outDoc.getElementsByTagName('root');
        assert.strictEqual(rootElements.length, 1, 'Should have exactly one root element');
        
        const nameElements = outDoc.getElementsByTagName('name');
        assert.strictEqual(nameElements.length, 1, 'Should have exactly one name element');
        assert.strictEqual(getTextContent(nameElements[0]), 'John', 'Name element should contain "John"');
        
        const ageElements = outDoc.getElementsByTagName('age');
        assert.strictEqual(ageElements.length, 1, 'Should have exactly one age element');
        assert.strictEqual(getTextContent(ageElements[0]), '30', 'Age element should contain "30"');
    });

    it('json-to-xml() should convert nested objects', async () => {
        const xmlString = `<root/>`;

        const xsltString = `<?xml version="1.0"?>
          <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/">
              <result>
                <xsl:copy-of select="json-to-xml('{&quot;person&quot;:{&quot;name&quot;:&quot;John&quot;,&quot;age&quot;:30}}')"/>
              </result>
            </xsl:template>
          </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);
        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        // Parse output and verify structure
        const outDoc = xmlParser.xmlParse(outXmlString);
        const personElements = outDoc.getElementsByTagName('person');
        assert.strictEqual(personElements.length, 1, 'Should have exactly one person element');
        
        const nameElements = outDoc.getElementsByTagName('name');
        assert.strictEqual(nameElements.length, 1, 'Should have exactly one name element');
        assert.strictEqual(getTextContent(nameElements[0]), 'John', 'Name element should contain "John"');
        
        // Verify parent-child relationship
        const nameParent = nameElements[0].parentNode;
        assert.strictEqual(nameParent.nodeName, 'person', 'Name element should be child of person element');
    });

    it('json-to-xml() should handle object with null value', async () => {
        const xmlString = `<root/>`;

        const xsltString = `<?xml version="1.0"?>
          <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/">
              <result>
                <xsl:copy-of select="json-to-xml('{&quot;value&quot;:null}')"/>
              </result>
            </xsl:template>
          </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);
        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        // Parse output and verify structure
        const outDoc = xmlParser.xmlParse(outXmlString);
        const valueElements = outDoc.getElementsByTagName('value');
        assert.strictEqual(valueElements.length, 1, 'Should have exactly one value element');
        assert.strictEqual(valueElements[0].childNodes.length, 0, 'Value element should be empty for null');
    });

    it('json-to-xml() should convert simple array', async () => {
        const xmlString = `<root/>`;

        const xsltString = `<?xml version="1.0"?>
          <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/">
              <result>
                <xsl:copy-of select="json-to-xml('[1,2,3]')"/>
              </result>
            </xsl:template>
          </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);
        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        // Parse output and verify structure
        const outDoc = xmlParser.xmlParse(outXmlString);
        const itemElements = outDoc.getElementsByTagName('item');
        assert.strictEqual(itemElements.length, 3, 'Should have exactly three item elements');
        assert.strictEqual(getTextContent(itemElements[0]), '1', 'First item should contain "1"');
        assert.strictEqual(getTextContent(itemElements[1]), '2', 'Second item should contain "2"');
        assert.strictEqual(getTextContent(itemElements[2]), '3', 'Third item should contain "3"');
    });

    it('json-to-xml() should convert array of objects', async () => {
        const xmlString = `<root/>`;

        const xsltString = `<?xml version="1.0"?>
          <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/">
              <result>
                <xsl:copy-of select="json-to-xml('[{&quot;id&quot;:1},{&quot;id&quot;:2}]')"/>
              </result>
            </xsl:template>
          </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);
        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        // Parse output and verify structure
        const outDoc = xmlParser.xmlParse(outXmlString);
        const itemElements = outDoc.getElementsByTagName('item');
        assert.strictEqual(itemElements.length, 2, 'Should have exactly two item elements');
        
        const idElements = outDoc.getElementsByTagName('id');
        assert.strictEqual(idElements.length, 2, 'Should have exactly two id elements');
        assert.strictEqual(getTextContent(idElements[0]), '1', 'First id element should contain "1"');
        assert.strictEqual(getTextContent(idElements[1]), '2', 'Second id element should contain "2"');
        
        // Verify parent-child relationship
        assert.strictEqual(idElements[0].parentNode.nodeName, 'item', 'First id should be child of item element');
        assert.strictEqual(idElements[1].parentNode.nodeName, 'item', 'Second id should be child of item element');
    });

    it('json-to-xml() should convert empty array', async () => {
        const xmlString = `<root/>`;

        const xsltString = `<?xml version="1.0"?>
          <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/">
              <result>
                <xsl:copy-of select="json-to-xml('[]')"/>
              </result>
            </xsl:template>
          </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);
        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        // Parse output and verify structure
        const outDoc = xmlParser.xmlParse(outXmlString);
        const rootElements = outDoc.getElementsByTagName('root');
        assert.strictEqual(rootElements.length, 1, 'Should have exactly one root element');
        
        const itemElements = outDoc.getElementsByTagName('item');
        assert.strictEqual(itemElements.length, 0, 'Should have no item elements for empty array');
    });

    it('json-to-xml() should handle complex nested structure', async () => {
        const xmlString = `<root/>`;

        const xsltString = `<?xml version="1.0"?>
          <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/">
              <result>
                <xsl:copy-of select="json-to-xml('{&quot;items&quot;:[1,2,3]}')"/>
              </result>
            </xsl:template>
          </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);
        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        // Parse output and verify structure
        const outDoc = xmlParser.xmlParse(outXmlString);
        const itemsElements = outDoc.getElementsByTagName('items');
        assert.strictEqual(itemsElements.length, 1, 'Should have exactly one items element');
        
        const itemElements = outDoc.getElementsByTagName('item');
        assert.strictEqual(itemElements.length, 3, 'Should have exactly three item elements');
        assert.strictEqual(getTextContent(itemElements[0]), '1', 'First item should contain "1"');
        
        // Verify parent-child relationship
        assert.strictEqual(itemElements[0].parentNode.nodeName, 'items', 'Item elements should be children of items element');
    });

    it('json-to-xml() should sanitize property names starting with numbers', async () => {
        const xmlString = `<root/>`;

        const xsltString = `<?xml version="1.0"?>
          <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/">
              <result>
                <xsl:copy-of select="json-to-xml('{&quot;1prop&quot;:&quot;value&quot;}')"/>
              </result>
            </xsl:template>
          </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);
        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        // Parse output and verify structure
        const outDoc = xmlParser.xmlParse(outXmlString);
        const rootElements = outDoc.getElementsByTagName('root');
        assert.strictEqual(rootElements.length, 1, 'Should have exactly one root element');
        
        // The property name should be sanitized (prefixed with underscore or modified)
        // Check that the sanitized element exists and contains the value
        const rootElement = rootElements[0];
        assert(rootElement.childNodes.length > 0, 'Root should have child elements');
        const firstChild = rootElement.childNodes[0];
        assert.strictEqual(getTextContent(firstChild), 'value', 'Sanitized property element should contain "value"');
        
        // Property name should start with underscore or letter (not a number)
        assert(/^[a-zA-Z_]/.test(firstChild.nodeName), 'Element name should start with letter or underscore');
    });

    it('json-to-xml() should handle empty and whitespace JSON strings', async () => {
        const xmlString = `<root/>`;

        const xsltString = `<?xml version="1.0"?>
          <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/">
              <result>
                <xsl:if test="json-to-xml('')">
                  <found>yes</found>
                </xsl:if>
                <xsl:if test="not(json-to-xml(''))">
                  <notFound>yes</notFound>
                </xsl:if>
              </result>
            </xsl:template>
          </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);
        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        // Empty/whitespace JSON should return empty/null result
        assert(outXmlString.includes('notFound'));
    });

    it('json-to-xml() should handle invalid JSON gracefully', async () => {
        const xmlString = `<root/>`;

        const xsltString = `<?xml version="1.0"?>
          <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/">
              <result>
                <xsl:if test="json-to-xml('{invalid json}')">
                  <found>yes</found>
                </xsl:if>
                <xsl:if test="not(json-to-xml('{invalid json}'))">
                  <notFound>yes</notFound>
                </xsl:if>
              </result>
            </xsl:template>
          </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);
        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        // Invalid JSON should return null/empty result
        assert(outXmlString.includes('notFound'));
    });
});
