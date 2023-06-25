import assert from 'assert';
import { dom } from 'isomorphic-jsx';
import { xsltProcess, xmlParse } from '../src'

// TODO:
// "xsl" prefix for non-XSL namespace
// namespaces in input XML
// using namespace prefixes in xpath

describe('namespaces', () => {

	it('non-"xsl" prefix in stylesheet test', () => {
		const xmlString = <root>
			<test name="test1" />
			<test name="test2" />
			<test name="test3" />
			<test name="test4" />
		</root>;

		const xsltString = '<?xml version="1.0"?>' +
			<abc:stylesheet version="1.0" xmlns:abc="http://www.w3.org/1999/XSL/Transform">
				<abc:template match="test">
				  <span> <abc:value-of select="@name" /> </span>
				</abc:template>
				<abc:template match="/">
					<div>
						<abc:apply-templates select="//test" />
					</div>
				</abc:template>
			</abc:stylesheet>;

		const expectedOutString = <div>
			<span>test1</span>
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
	});

  it('namespace-uri() test', () => {
    const xmlString = <root xmlns="http://example.com">
      <test />
      <test xmlns="http://example.test/2" />
      <example:test xmlns:example="http://example.test/3" />
      <test xmlns="" />
    </root>;

    const xsltString = '<?xml version="1.0"?>' +
      <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="*/*">
          <span> <xsl:value-of select="namespace-uri()" /> </span>
        </xsl:template>
        <xsl:template match="/">
         <div>
          <xsl:apply-templates select="//*"/>
         </div>
        </xsl:template>
      </xsl:stylesheet>;

    const expectedOutString = <div>
      <span>http://example.com</span>
      <span>http://example.test/2</span>
      <span>http://example.test/3</span>
      <span></span>
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
