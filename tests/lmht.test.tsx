/* eslint-disable no-undef */
import assert from 'assert';

import React from 'react';
import { dom } from 'isomorphic-jsx';
import { Xslt } from '../src/xslt';
import { xmlParse } from '../src/dom';

// Just touching the `dom`, otherwise Babel prunes the import.
console.log(dom);
describe.skip('LMHT', () => {
    it('Trivial', () => {
        const xmlString = (
            <lmht>
                <cabeca>
                    <titulo>Teste</titulo>
                </cabeca>
                <corpo>
                    Teste
                </corpo>
            </lmht>
        );

        const xsltString =
            '<?xml version="1.0"?>' +
            (
                <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:xs="http://www.w3.org/2001/XMLSchema">
                    <xsl:template match="lmht">
                        <html>
                            Teste
                        </html>
                    </xsl:template>
                </xsl:stylesheet>
            );

            const expectedOutString = (
                <html>Teste</html>
            );

            const xsltClass = new Xslt();
            const xml = xmlParse(xmlString);
            const xslt = xmlParse(xsltString);
            const outXmlString = xsltClass.xsltProcess(xml, xslt);

            assert.equal(outXmlString, expectedOutString);
    });
});
