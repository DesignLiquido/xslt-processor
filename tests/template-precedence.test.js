import assert from 'assert';
import { dom } from 'isomorphic-jsx';
import { xsltProcess, xmlParse } from '../src'

describe('template-precedence', () => {

  it('XSLT template precedence test', () => {
    const xmlString = <root>
      <test name="test1" />
      <test name="test2" />
      <test name="test3" />
      <test name="test4" />
    </root>;

    const xsltString = '<?xml version="1.0"?>' +
      <xsl:stylesheet version="1.0">
        <xsl:template match="test">
          <span> <xsl:value-of select="@name" /> </span>
        </xsl:template>
        <xsl:template match="test[@name='test1']">
          <span>another name</span>
        </xsl:template>
        <xsl:template match="/">
          <div>
            <xsl:apply-templates select="//test" />
          </div>
        </xsl:template>
      </xsl:stylesheet>;

    const expectedOutString = <div>
      <span>another name</span>
      <span>test2</span>
      <span>test3</span>
      <span>test4</span>
    </div>;

    const outXmlString = xsltProcess(
      xmlParse(xmlString),
      xmlParse(xsltString)
    );

    assert.equal(
      outXmlString,
      expectedOutString
    );
  })

})
