import assert from 'assert';

import { Xslt } from '../src/xslt';
import { XmlParser } from '../src/dom';
import { NodeSetValue } from '../src/xpath/values';

describe('variables-as-parameters', () => {
    it('variables-as-parameters 1', async () => {
        const xmlString = `<root>
          <test name="test1"/>
        </root> `;

        const xsltString = `<?xml version="1.0"?>
          <xsl:stylesheet version="1.0">
            <xsl:template match="test">
              <span> <xsl:value-of select="$test" /> </span>
            </xsl:template>
            <xsl:template match="root">
              <xsl:element name="{local-name()}">
                <xsl:apply-templates select="test"/>
              </xsl:element>
            </xsl:template>
            <xsl:template match="/">
              <xsl:apply-templates select="root"/>
            </xsl:template>
          </xsl:stylesheet>`;

        const expectedOutString = `<root><span>hugo</span></root>`;

        const xsltClass = new Xslt({ parameters: [
          { name: 'test', value: 'hugo' }
        ] });
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);
        const outXmlString = await xsltClass.xsltProcess(
          xml,
          xslt,
        );

        assert.equal(outXmlString, expectedOutString);
    });

    it('number parameter is preserved, not coerced to string', async () => {
        const xmlString = `<root/>`;

        const xsltString = `<?xml version="1.0"?>
          <xsl:stylesheet version="1.0">
            <xsl:param name="count"/>
            <xsl:template match="/">
              <out><xsl:value-of select="$count + 1" /></out>
            </xsl:template>
          </xsl:stylesheet>`;

        const xsltClass = new Xslt({ parameters: [
          { name: 'count', value: 42 }
        ] });
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);
        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        assert.equal(outXmlString, '<out>43</out>');
    });

    it('boolean parameter is preserved, not coerced to string', async () => {
        const xmlString = `<root/>`;

        const xsltString = `<?xml version="1.0"?>
          <xsl:stylesheet version="1.0">
            <xsl:param name="flag"/>
            <xsl:template match="/">
              <out><xsl:if test="not($flag)">yes</xsl:if></out>
            </xsl:template>
          </xsl:stylesheet>`;

        const xsltClass = new Xslt({ parameters: [
          { name: 'flag', value: false }
        ] });
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);
        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        assert.equal(outXmlString, '<out>yes</out>');
    });

    it('string "false" is truthy in XPath tests', async () => {
        const xmlString = `<root/>`;

        const xsltString = `<?xml version="1.0"?>
          <xsl:stylesheet version="1.0">
            <xsl:param name="flag"/>
            <xsl:template match="/">
              <out><xsl:if test="$flag">yes</xsl:if></out>
            </xsl:template>
          </xsl:stylesheet>`;

        const xsltClass = new Xslt({ parameters: [
          { name: 'flag', value: 'false' }
        ] });
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);
        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        assert.equal(outXmlString, '<out>yes</out>');
    });

    it('node-set parameter can be passed as NodeSetValue', async () => {
        const xmlParser = new XmlParser();

        const lookupDoc = xmlParser.xmlParse(`<lookup>
          <entry key="a">Alpha</entry>
          <entry key="b">Beta</entry>
        </lookup>`);

        const xmlString = `<root><item ref="a"/></root>`;

        const xsltString = `<?xml version="1.0"?>
          <xsl:stylesheet version="1.0">
            <xsl:param name="lookupDoc"/>
            <xsl:template match="item">
              <out><xsl:value-of select="$lookupDoc/lookup/entry[@key=current()/@ref]" /></out>
            </xsl:template>
            <xsl:template match="/">
              <xsl:apply-templates select="root/item"/>
            </xsl:template>
          </xsl:stylesheet>`;

        const xsltClass = new Xslt({ parameters: [
          { name: 'lookupDoc', value: new NodeSetValue([lookupDoc]) }
        ] });
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);
        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        assert.equal(outXmlString, '<out>Alpha</out>');
    });
});
