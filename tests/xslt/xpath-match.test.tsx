import { Xslt, XmlParser } from '../../src/index';

describe('XPath template matching, special cases', () => {
  let xslt: Xslt;
  let xmlParser: XmlParser;

  beforeEach(() => {
    xslt = new Xslt();
    xmlParser = new XmlParser();
  });

  // Issue #117: xsltProcess fails matching `//section` XPath expression
  // In some cases templates that use `//name` do not get applied while `//*` works.
  // This test reproduces that scenario and ensures `//section` and `section`
  // both match the `section` elements as expected.
  it('should match section elements using //section in template match attribute', async () => {
    const xml = xmlParser.xmlParse(
      '<root id="n12"><section id="n1">1</section><section id="n2">2</section></root>'
    );

    const stylesheet = xmlParser.xmlParse(`<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:output method="text" encoding="UTF-8" />
    <xsl:template match="//section">
        <xsl:value-of select="." />
    </xsl:template>
</xsl:stylesheet>`);

    const result = await xslt.xsltProcess(xml, stylesheet);

    // Expected output: "12" (concatenation of both section values)
    expect(result).toBe('12');
  });

  it('should match elements using //* as an alternative to //section', async () => {
    const xml = xmlParser.xmlParse(
      '<root id="n12"><section id="n1">1</section><section id="n2">2</section></root>'
    );

    const stylesheet = xmlParser.xmlParse(`<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:output method="text" encoding="UTF-8" />
    <xsl:template match="//*">
        <xsl:value-of select="." />
    </xsl:template>
</xsl:stylesheet>`);

    const result = await xslt.xsltProcess(xml, stylesheet);

    // This should work (mentioned in the issue as "behaves as expected")
    expect(result).toBeTruthy();
  });

  it('should match section elements using section element name', async () => {
    const xml = xmlParser.xmlParse(
      '<root id="n12"><section id="n1">1</section><section id="n2">2</section></root>'
    );

    const stylesheet = xmlParser.xmlParse(`<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:output method="text" encoding="UTF-8" />
    <xsl:template match="section">
        <xsl:value-of select="." />
    </xsl:template>
</xsl:stylesheet>`);

    const result = await xslt.xsltProcess(xml, stylesheet);

    // Expected output: "12" (concatenation of both section values)
    expect(result).toBe('12');
  });
});
