import { Xslt } from '../src/xslt';
import { XmlParser } from '../src/dom';

describe('Text node ordering', () => {
  test('Issue #158: Text node before block element should stay before it', async () => {
    const xmlSource = `<root>
      <users>
          <user>Alice</user>
          <user>Bob</user>
      </users>
    </root>`;

    const xsltSource = `<xsl:stylesheet
          version="1.0"
          xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
          xmlns:html="http://www.w3.org/1999/xhtml"
          xmlns="http://www.w3.org/1999/xhtml"
          exclude-result-prefixes="html">
          <xsl:output method="html" />
          <xsl:template match="/">
              Users:
              <ul>
                  <xsl:for-each select="root/users/user">
                      <li>
                          <xsl:copy-of select="text()"/>
                      </li>
                  </xsl:for-each>
              </ul>
          </xsl:template>
    </xsl:stylesheet>`;

    const xmlParser = new XmlParser();
    const xml = xmlParser.xmlParse(xmlSource);
    const xslt = xmlParser.xmlParse(xsltSource);
    
    const xsltClass = new Xslt();
    const output = await xsltClass.xsltProcess(xml, xslt);
    
    // The text "Users:" should appear BEFORE the <ul> element, not after
    // This is the expected behavior per XSLT spec and Java's XSLT processor
    const usersIndex = output.indexOf('Users:');
    const ulIndex = output.indexOf('<ul>');
    
    expect(usersIndex).toBeLessThan(ulIndex);
    expect(output).toMatch(/Users:\s*<ul>/);
  });

  test('Issue #158: Text node in block element works correctly', async () => {
    const xmlSource = `<root>
      <users>
          <user>Alice</user>
          <user>Bob</user>
      </users>
    </root>`;

    const xsltSource = `<xsl:stylesheet
          version="1.0"
          xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
          xmlns:html="http://www.w3.org/1999/xhtml"
          xmlns="http://www.w3.org/1999/xhtml"
          exclude-result-prefixes="html">
          <xsl:output method="html" />
          <xsl:template match="/">
              <p>Users:</p>
              <ul>
                  <xsl:for-each select="root/users/user">
                      <li>
                          <xsl:copy-of select="text()"/>
                      </li>
                  </xsl:for-each>
              </ul>
          </xsl:template>
    </xsl:stylesheet>`;

    const xmlParser = new XmlParser();
    const xml = xmlParser.xmlParse(xmlSource);
    const xslt = xmlParser.xmlParse(xsltSource);
    
    const xsltClass = new Xslt();
    const output = await xsltClass.xsltProcess(xml, xslt);
    
    // This case works correctly - text is in correct position
    const pIndex = output.indexOf('<p>Users:</p>');
    const ulIndex = output.indexOf('<ul>');
    
    expect(pIndex).toBeLessThan(ulIndex);
  });

  test('Issue #158: Multiple text nodes should preserve order', async () => {
    const xmlSource = `<root/>`;

    const xsltSource = `<xsl:stylesheet
          version="1.0"
          xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
          <xsl:output method="html" />
          <xsl:template match="/">
              Start
              <div>Content</div>
              Middle
              <div>More</div>
              End
          </xsl:template>
    </xsl:stylesheet>`;

    const xmlParser = new XmlParser();
    const xml = xmlParser.xmlParse(xmlSource);
    const xslt = xmlParser.xmlParse(xsltSource);
    
    const xsltClass = new Xslt();
    const output = await xsltClass.xsltProcess(xml, xslt);
    
    // All text nodes should be in correct order
    const startIndex = output.indexOf('Start');
    const div1Index = output.indexOf('<div>Content</div>');
    const middleIndex = output.indexOf('Middle');
    const div2Index = output.indexOf('<div>More</div>');
    const endIndex = output.indexOf('End');
    
    expect(startIndex).toBeLessThan(div1Index);
    expect(div1Index).toBeLessThan(middleIndex);
    expect(middleIndex).toBeLessThan(div2Index);
    expect(div2Index).toBeLessThan(endIndex);
  });
});
