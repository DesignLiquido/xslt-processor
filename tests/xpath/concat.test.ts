import { Xslt, XmlParser } from '../../src/index';

describe('concat() function with XPath expressions', () => {
  let xslt: Xslt;
  let xmlParser: XmlParser;

  beforeEach(() => {
    xslt = new Xslt();
    xmlParser = new XmlParser();
  });

  // Test case for the bug described in TODO.md:
  // When using concat() with XPath expressions as arguments, the function
  // returns malformed output instead of properly concatenating string values.
  it('should concatenate XPath node values correctly', async () => {
    const xml = xmlParser.xmlParse(
      '<root><first>Hello</first><second>World</second></root>'
    );

    const stylesheet = xmlParser.xmlParse(`<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:output method="text" encoding="UTF-8" />
    <xsl:template match="root">
        <xsl:value-of select="concat(first, ' ', second)" />
    </xsl:template>
</xsl:stylesheet>`);

    const result = await xslt.xsltProcess(xml, stylesheet);
    expect(result).toBe('Hello World');
  });

  it('should concatenate multiple XPath expressions with separators', async () => {
    const xml = xmlParser.xmlParse(
      '<root><a>1</a><b>2</b><c>3</c></root>'
    );

    const stylesheet = xmlParser.xmlParse(`<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:output method="text" encoding="UTF-8" />
    <xsl:template match="root">
        <xsl:value-of select="concat(a, '-', b, '-', c)" />
    </xsl:template>
</xsl:stylesheet>`);

    const result = await xslt.xsltProcess(xml, stylesheet);
    expect(result).toBe('1-2-3');
  });

  it('should handle concat with path expressions using slashes', async () => {
    const xml = xmlParser.xmlParse(
      '<root><first>Hello</first><second>World</second></root>'
    );

    const stylesheet = xmlParser.xmlParse(`<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:output method="text" encoding="UTF-8" />
    <xsl:template match="/">
        <xsl:value-of select="concat(root/first, ' ', root/second)" />
    </xsl:template>
</xsl:stylesheet>`);

    const result = await xslt.xsltProcess(xml, stylesheet);
    expect(result).toBe('Hello World');
  });

  it('should handle concat with descendant axis', async () => {
    const xml = xmlParser.xmlParse(
      '<root><child><name>John</name></child><child><name>Jane</name></child></root>'
    );

    const stylesheet = xmlParser.xmlParse(`<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:output method="text" encoding="UTF-8" />
    <xsl:template match="/">
        <xsl:value-of select="concat(//child[1]/name, ' and ', //child[2]/name)" />
    </xsl:template>
</xsl:stylesheet>`);

    const result = await xslt.xsltProcess(xml, stylesheet);
    expect(result).toBe('John and Jane');
  });

  it('should handle concat with string literals only', async () => {
    const xml = xmlParser.xmlParse('<root/>');

    const stylesheet = xmlParser.xmlParse(`<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:output method="text" encoding="UTF-8" />
    <xsl:template match="/">
        <xsl:value-of select="concat('a', 'b', 'c')" />
    </xsl:template>
</xsl:stylesheet>`);

    const result = await xslt.xsltProcess(xml, stylesheet);
    expect(result).toBe('abc');
  });

  it('should handle concat with numeric values', async () => {
    const xml = xmlParser.xmlParse('<root><num>42</num></root>');

    const stylesheet = xmlParser.xmlParse(`<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:output method="text" encoding="UTF-8" />
    <xsl:template match="root">
        <xsl:value-of select="concat('Value: ', num)" />
    </xsl:template>
</xsl:stylesheet>`);

    const result = await xslt.xsltProcess(xml, stylesheet);
    expect(result).toBe('Value: 42');
  });

  it('should handle concat with empty node-set', async () => {
    const xml = xmlParser.xmlParse('<root><a>test</a></root>');

    const stylesheet = xmlParser.xmlParse(`<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:output method="text" encoding="UTF-8" />
    <xsl:template match="root">
        <xsl:value-of select="concat(a, nonexistent, 'end')" />
    </xsl:template>
</xsl:stylesheet>`);

    const result = await xslt.xsltProcess(xml, stylesheet);
    // Empty node-set should convert to empty string per XPath spec
    expect(result).toBe('testend');
  });

  it('should handle concat with boolean values', async () => {
    const xml = xmlParser.xmlParse('<root/>');

    const stylesheet = xmlParser.xmlParse(`<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:output method="text" encoding="UTF-8" />
    <xsl:template match="/">
        <xsl:value-of select="concat(true(), '-', false())" />
    </xsl:template>
</xsl:stylesheet>`);

    const result = await xslt.xsltProcess(xml, stylesheet);
    expect(result).toBe('true-false');
  });

  it('should handle concat inside for-each', async () => {
    const xml = xmlParser.xmlParse(
      '<root><item><first>A</first><second>1</second></item><item><first>B</first><second>2</second></item></root>'
    );

    const stylesheet = xmlParser.xmlParse(`<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:output method="text" encoding="UTF-8" />
    <xsl:template match="root">
        <xsl:for-each select="item">
            <xsl:value-of select="concat(first, ':', second)" />
            <xsl:if test="position() != last()">|</xsl:if>
        </xsl:for-each>
    </xsl:template>
</xsl:stylesheet>`);

    const result = await xslt.xsltProcess(xml, stylesheet);
    expect(result).toBe('A:1|B:2');
  });

  it('should handle concat with attribute values', async () => {
    const xml = xmlParser.xmlParse(
      '<root><item id="123" name="test"/></root>'
    );

    const stylesheet = xmlParser.xmlParse(`<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:output method="text" encoding="UTF-8" />
    <xsl:template match="item">
        <xsl:value-of select="concat(@id, '-', @name)" />
    </xsl:template>
</xsl:stylesheet>`);

    const result = await xslt.xsltProcess(xml, stylesheet);
    expect(result).toBe('123-test');
  });
});
