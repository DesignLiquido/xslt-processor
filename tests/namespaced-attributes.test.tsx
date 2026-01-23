/* eslint-env mocha */
import assert from 'assert';

import { Xslt } from '../src/xslt';
import { XmlParser } from '../src/dom';

describe('namespaced attributes', () => {
    it('extract namespaced attribute with direct namespace prefix (@ns:attribute)', async () => {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<root xmlns:ns="http://example.com/namespace">
  <element ns:attribute="TestValue" />
</root>`;

        const xslt = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" 
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:ns="http://example.com/namespace">
  
  <xsl:output method="text"/>
  
  <xsl:template match="/root/element">
    <xsl:value-of select="@ns:attribute"/>
  </xsl:template>
  
</xsl:stylesheet>`;

        const xmlDoc = new XmlParser().xmlParse(xml);
        const xsltDoc = new XmlParser().xmlParse(xslt);

        const processor = new Xslt();
        const result = await processor.xsltProcess(xmlDoc, xsltDoc);

        assert.equal(result, 'TestValue', 'Should extract namespaced attribute using direct prefix');
    });

    it('extract namespaced attribute using local-name()', async () => {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<root xmlns:ns="http://example.com/namespace">
  <element ns:attribute="TestValue" />
</root>`;

        const xslt = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" 
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:ns="http://example.com/namespace">
  
  <xsl:output method="text"/>
  
  <xsl:template match="/root/element">
    <xsl:value-of select="@*[local-name()='attribute']"/>
  </xsl:template>
  
</xsl:stylesheet>`;

        const xmlDoc = new XmlParser().xmlParse(xml);
        const xsltDoc = new XmlParser().xmlParse(xslt);

        const processor = new Xslt();
        const result = await processor.xsltProcess(xmlDoc, xsltDoc);

        assert.equal(result, 'TestValue', 'Should extract namespaced attribute using local-name()');
    });

    it('extract namespaced attribute using namespace-uri() and local-name()', async () => {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<root xmlns:ns="http://example.com/namespace">
  <element ns:attribute="TestValue" />
</root>`;

        const xslt = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" 
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:ns="http://example.com/namespace">
  
  <xsl:output method="text"/>
  
  <xsl:template match="/root/element">
    <xsl:value-of select="@*[local-name()='attribute' and namespace-uri()='http://example.com/namespace']"/>
  </xsl:template>
  
</xsl:stylesheet>`;

        const xmlDoc = new XmlParser().xmlParse(xml);
        const xsltDoc = new XmlParser().xmlParse(xslt);

        const processor = new Xslt();
        const result = await processor.xsltProcess(xmlDoc, xsltDoc);

        assert.equal(result, 'TestValue', 'Should extract namespaced attribute using namespace-uri() and local-name()');
    });

    it('all three methods for extracting namespaced attributes', async () => {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<root xmlns:ns="http://example.com/namespace">
  <element ns:attribute="TestValue" />
</root>`;

        const xslt = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" 
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:ns="http://example.com/namespace">
  
  <xsl:output method="text"/>
  
  <xsl:template match="/root/element">
    <xsl:text>Method 1 (@ns:attribute): </xsl:text>
    <xsl:value-of select="@ns:attribute"/>
    <xsl:text>&#10;</xsl:text>
    
    <xsl:text>Method 2 (local-name): </xsl:text>
    <xsl:value-of select="@*[local-name()='attribute']"/>
    <xsl:text>&#10;</xsl:text>
    
    <xsl:text>Method 3 (namespace-uri): </xsl:text>
    <xsl:value-of select="@*[local-name()='attribute' and namespace-uri()='http://example.com/namespace']"/>
    <xsl:text>&#10;</xsl:text>
  </xsl:template>
  
</xsl:stylesheet>`;

        const xmlDoc = new XmlParser().xmlParse(xml);
        const xsltDoc = new XmlParser().xmlParse(xslt);

        const processor = new Xslt();
        const result = await processor.xsltProcess(xmlDoc, xsltDoc);

        const expectedOutput = `Method 1 (@ns:attribute): TestValue
Method 2 (local-name): TestValue
Method 3 (namespace-uri): TestValue
`;

        assert.equal(result, expectedOutput, 'All three methods should return the same value');
    });

    it('namespaced attribute with call-template', async () => {
        const xml = `<pak:root xmlns:pak="http://test" pak:attr="VALUE"/>`;

        const xslt = `<?xml version="1.0"?>
<xsl:stylesheet version="1.0" 
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:pak="http://test">
  <xsl:output method="text"/>
  <xsl:template match="/">
    <xsl:text>A|</xsl:text>
    <xsl:apply-templates select="pak:root"/>
    <xsl:text>|C</xsl:text>
  </xsl:template>
  
  <xsl:template match="pak:root">
    <xsl:text>B|</xsl:text>
    <xsl:call-template name="get-value"/>
    <xsl:text>|D</xsl:text>
  </xsl:template>
  
  <xsl:template name="get-value">
    <xsl:value-of select="@pak:attr"/>
  </xsl:template>
</xsl:stylesheet>`;

        const parser = new XmlParser();
        const xmlDoc = await parser.xmlParse(xml);
        const xsltDoc = await parser.xmlParse(xslt);
        const xsltProc = new Xslt();
        const result = await xsltProc.xsltProcess(xmlDoc, xsltDoc);

        const expectedOutput = 'A|B|VALUE|D|C';
        assert.equal(result, expectedOutput, `Expected "${expectedOutput}" but got "${result}". Output order bug: VALUE should appear inline, not deferred to the end`);
    });

    it('multiple namespaced attributes', async () => {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<root xmlns:ns="http://example.com/namespace">
  <element ns:attr1="Value1" ns:attr2="Value2" ns:attr3="Value3" />
</root>`;

        const xslt = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" 
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:ns="http://example.com/namespace">
  
  <xsl:output method="text"/>
  
  <xsl:template match="/root/element">
    <xsl:value-of select="@ns:attr1"/>
    <xsl:text>|</xsl:text>
    <xsl:value-of select="@ns:attr2"/>
    <xsl:text>|</xsl:text>
    <xsl:value-of select="@ns:attr3"/>
  </xsl:template>
  
</xsl:stylesheet>`;

        const xmlDoc = new XmlParser().xmlParse(xml);
        const xsltDoc = new XmlParser().xmlParse(xslt);

        const processor = new Xslt();
        const result = await processor.xsltProcess(xmlDoc, xsltDoc);

        const expectedOutput = 'Value1|Value2|Value3';
        assert.equal(result, expectedOutput, 'Should extract multiple namespaced attributes');
    });

    it('mixed namespaced and non-namespaced attributes', async () => {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<root xmlns:ns="http://example.com/namespace">
  <element normalAttr="Normal" ns:attribute="Namespaced" />
</root>`;

        const xslt = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" 
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:ns="http://example.com/namespace">
  
  <xsl:output method="text"/>
  
  <xsl:template match="/root/element">
    <xsl:value-of select="@normalAttr"/>
    <xsl:text>|</xsl:text>
    <xsl:value-of select="@ns:attribute"/>
  </xsl:template>
  
</xsl:stylesheet>`;

        const xmlDoc = new XmlParser().xmlParse(xml);
        const xsltDoc = new XmlParser().xmlParse(xslt);

        const processor = new Xslt();
        const result = await processor.xsltProcess(xmlDoc, xsltDoc);

        const expectedOutput = 'Normal|Namespaced';
        assert.equal(result, expectedOutput, 'Should extract both namespaced and non-namespaced attributes');
    });
});
