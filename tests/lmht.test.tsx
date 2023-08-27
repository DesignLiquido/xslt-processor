/* eslint-disable no-undef */
import assert from 'assert';

import React from 'react';
import { dom } from 'isomorphic-jsx';
import { Xslt } from '../src/xslt';
import { xmlParse } from '../src/dom';

// Just touching the `dom`, otherwise Babel prunes the import.
console.log(dom);
describe('LMHT', () => {
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
            <xsl:transform xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:xs="http://www.w3.org/2001/XMLSchema" version="2.0">
                <xsl:output method="html" version="5.0" omit-xml-declaration="yes" encoding="UTF-8" indent="yes" />

                <xsl:template match="/lmht">
                    <html>
                        <xsl:apply-templates select="node()" />
                    </html>
                </xsl:template>

                <xsl:template match="/lmht/cabeca|/lmht/cabeça">
                    <head>
                        <xsl:apply-templates select="@*|node()" />
                    </head>
                </xsl:template>
                <xsl:template match="/lmht/cabeca/titulo|/lmht/cabeca/título|/lmht/cabeça/titulo|/lmht/cabeça/título">
                    <title>
                        <xsl:apply-templates select="@*|node()" />
                    </title>
                </xsl:template>

                <xsl:template match="/lmht/corpo">
                    <body>
                        <xsl:apply-templates select="@*|node()" />
                    </body>
                </xsl:template>
            </xsl:transform>
            );

            const expectedOutString = (
                <html>
                    <head>
                        <title>Teste</title>
                    </head>
                    <body>
                        Teste
                    </body>
                </html>
            );

            const xsltClass = new Xslt();
            const xml = xmlParse(xmlString);
            const xslt = xmlParse(xsltString);
            const outXmlString = xsltClass.xsltProcess(xml, xslt);

            assert.equal(outXmlString, expectedOutString);
    });
});
