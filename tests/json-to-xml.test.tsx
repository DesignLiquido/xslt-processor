/* eslint-disable no-useless-escape */
import assert from 'assert';

import { Xslt } from '../src/xslt';
import { XmlParser } from '../src/dom';

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
                message: /json-to-xml\(\) is only supported in XSLT 3\.0/
            }
        );
    });

    it('json-to-xml() should throw error in XSLT 2.0', async () => {
        const xmlString = `<root/>`;

        const xsltString = `<?xml version="1.0"?>
          <xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
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
                message: /json-to-xml\(\) is only supported in XSLT 3\.0/
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

        // Should contain a root element with text content "hello"
        assert(outXmlString.includes('hello'));
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

        // Should contain the number 42
        assert(outXmlString.includes('42'));
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

        // Should contain "true"
        assert(outXmlString.includes('true'));
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

        // Should contain "false"
        assert(outXmlString.includes('false'));
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

        // Should contain an empty root element
        assert(outXmlString.includes('<root'));
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

        // Should contain name and age elements
        assert(outXmlString.includes('name'));
        assert(outXmlString.includes('John'));
        assert(outXmlString.includes('age'));
        assert(outXmlString.includes('30'));
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

        // Should contain nested person element
        assert(outXmlString.includes('person'));
        assert(outXmlString.includes('name'));
        assert(outXmlString.includes('John'));
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

        // Should contain value element (empty)
        assert(outXmlString.includes('value'));
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

        // Should contain item elements
        assert(outXmlString.includes('item'));
        assert(outXmlString.includes('1'));
        assert(outXmlString.includes('2'));
        assert(outXmlString.includes('3'));
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

        // Should contain multiple item elements with id
        assert(outXmlString.includes('item'));
        assert(outXmlString.includes('id'));
        assert(outXmlString.includes('1'));
        assert(outXmlString.includes('2'));
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

        // Should contain root element (empty)
        assert(outXmlString.includes('<root'));
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

        // Should contain items and item elements
        assert(outXmlString.includes('items'));
        assert(outXmlString.includes('item'));
        assert(outXmlString.includes('1'));
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

        // Parse the output to verify element name and content
        const outputDoc = xmlParser.xmlParse(outXmlString);
        const resultElement = outputDoc.getElementsByTagName('result')[0];
        assert(resultElement, 'Result element should exist');
        
        // json-to-xml creates a <root> element containing the JSON properties
        const rootElement = resultElement.getElementsByTagName('root')[0] as Element;
        assert(rootElement, 'Root element from json-to-xml should exist');
        
        // Get the property element (should be the sanitized property name)
        const propertyElement = rootElement.firstChild as Element;
        assert(propertyElement, 'Property element should exist');
        
        const elementName = propertyElement.nodeName;
        // Element name should start with a letter or underscore (not a digit)
        assert(/^[a-zA-Z_]/.test(elementName), `Element name '${elementName}' should start with letter or underscore`);
        // Element name should contain 'prop' (the original property name part)
        assert(elementName.includes('prop'), `Element name '${elementName}' should contain 'prop'`);
        
        // Get the text content from the first child text node
        const textNode = propertyElement.firstChild;
        assert(textNode, 'Text node should exist');
        assert.strictEqual(textNode.nodeValue, 'value', 'Element should contain the correct value');
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
