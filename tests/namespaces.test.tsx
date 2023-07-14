/* eslint-disable no-undef */
import assert from 'assert';

import React from 'react';
import { dom } from 'isomorphic-jsx';

import { Xslt } from '../src/xslt';
import { xmlParse } from '../src/dom';

// TODO:
// "xsl" prefix for non-XSL namespace
// namespaces in input XML
// using namespace prefixes in xpath

// Just touching the `dom`, otherwise Babel prunes the import.
console.log(dom);
describe('namespaces', () => {
    it('non-"xsl" prefix in stylesheet test', () => {
        const xmlString = (
            <root>
                <test name="test1" />
                <test name="test2" />
                <test name="test3" />
                <test name="test4" />
            </root>
        );

        const xsltString =
            '<?xml version="1.0"?>' +
            (
                <abc:stylesheet version="1.0" xmlns:abc="http://www.w3.org/1999/XSL/Transform">
                    <abc:template match="test">
                        <span>
                            {' '}
                            <abc:value-of select="@name" />{' '}
                        </span>
                    </abc:template>
                    <abc:template match="/">
                        <div>
                            <abc:apply-templates select="//test" />
                        </div>
                    </abc:template>
                </abc:stylesheet>
            );

        const expectedOutString = (
            <div>
                <span>test1</span>
                <span>test2</span>
                <span>test3</span>
                <span>test4</span>
            </div>
        );

        const xsltClass = new Xslt();
        const xml = xmlParse(xmlString);
        const xslt = xmlParse(xsltString);
        const outXmlString = xsltClass.xsltProcess(
            xml,
            xslt
        );

        assert.equal(outXmlString, expectedOutString);
    });

    it('namespace-uri() test', () => {
        const xmlString = (
            <root xmlns="http://example.com">
                <test />
                <test xmlns="http://example.test/2" />
                <example:test xmlns:example="http://example.test/3" />
                <test xmlns="" />
            </root>
        );

        const xsltString =
            '<?xml version="1.0"?>' +
            (
                <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    <xsl:template match="*/*">
                        <span>
                            {' '}
                            <xsl:value-of select="namespace-uri()" />{' '}
                        </span>
                    </xsl:template>
                    <xsl:template match="/">
                        <div>
                            <xsl:apply-templates select="//*" />
                        </div>
                    </xsl:template>
                </xsl:stylesheet>
            );

        const expectedOutString = (
            <div>
                <span>http://example.com</span>
                <span>http://example.test/2</span>
                <span>http://example.test/3</span>
                <span></span>
            </div>
        );

        const xsltClass = new Xslt();
        const xml = xmlParse(xmlString);
        const xslt = xmlParse(xsltString);
        const outXmlString = xsltClass.xsltProcess(
            xml,
            xslt
        );

        assert.equal(outXmlString, expectedOutString);
    });

    it.only('namespace per node', () => {
        const xmlString = `<?xml version="1.0" encoding="ISO-8859-1"?>
            <ClinicalDocument xmlns="http://testnamespace">
                <test name="test1" />
                <test name="test2" />
                <test name="test3" />
                <test name="test5" />
            </ClinicalDocument>`;

        const xsltString = `<?xml version="1.0"?>
            <xsl:stylesheet version="1.0"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:n="http://testnamespace">
                <xsl:template match="/">
                    <xsl:copy-of select="n:ClinicalDocument/n:test" />
                </xsl:template>
            </xsl:stylesheet>`;

        const expectedOutString = `<?xml version="1.0"?>
            <test xmlns="http://testnamespace" name="test1"/>
            <test xmlns="http://testnamespace" name="test2"/>
            <test xmlns="http://testnamespace" name="test3"/>
            <test xmlns="http://testnamespace" name="test5"/>`

        const xsltClass = new Xslt();
        const xml = xmlParse(xmlString);
        const xslt = xmlParse(xsltString);
        const outXmlString = xsltClass.xsltProcess(
            xml,
            xslt
        );

        assert.equal(outXmlString, expectedOutString);
    });
});
