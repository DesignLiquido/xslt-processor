/* eslint-disable no-undef */
import assert from 'assert';

import React from 'react';
import { dom } from 'isomorphic-jsx';

import { Xslt } from '../src/xslt';
import { XmlParser } from '../src/dom';

// Just touching the `dom`, otherwise Babel prunes the import.
console.log(dom);
describe('root-element', () => {
    it('select root element test', async () => {
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
                <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:xs="http://www.w3.org/2001/XMLSchema">
                    <xsl:template match="test">
                        <span>
                            {' '}
                            <xsl:value-of select="@name" />{' '}
                        </span>
                    </xsl:template>
                    <xsl:template match="/root">
                        <div>
                            <xsl:apply-templates select="test" />
                        </div>
                    </xsl:template>
                </xsl:stylesheet>
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
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);
        const outXmlString = await xsltClass.xsltProcess(xml, xslt);

        assert.equal(outXmlString, expectedOutString);
    });
});
