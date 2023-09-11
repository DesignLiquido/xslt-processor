/* eslint-disable no-undef */

// Copyright 2023 Design Liquido
// All Rights Reserved.

import assert from 'assert';

import { dom } from 'isomorphic-jsx';
import React from 'react';

import { xmlParse } from '../../src/dom';
import { Xslt } from '../../src/xslt';

// Just touching the `dom`, otherwise Babel prunes the import.
console.log(dom);

describe('XPath Functions', () => {
    it('current', () => {
        const xml = xmlParser.xmlParse(<root>test</root>);
        const xsltDefinition = xmlParse(
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                <xsl:template match="/">
                    <xsl:value-of select="current()"/>
                </xsl:template>
            </xsl:stylesheet>
        );

        const xsltClass = new Xslt();
        const outXmlString = xsltClass.xsltProcess(
            xml,
            xsltDefinition
        );

        assert.equal(outXmlString, 'test');
    });

    describe('format-number', () => {
        const xml = xmlParser.xmlParse(<root></root>);

        it('Trivial', () => {
            const xsltDefinition = xmlParse(
                <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                    <xsl:template match="/">
                        <xsl:value-of select="format-number(500100, '#')"/>
                    </xsl:template>
                </xsl:stylesheet>
            );

            const xsltClass = new Xslt();
            const outXmlString = xsltClass.xsltProcess(
                xml,
                xsltDefinition
            );

            assert.equal(outXmlString, '500100');
        });

        it('Decimal, only integer part', () => {
            const xsltDefinition = xmlParse(
                <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                    <xsl:template match="/">
                        <xsl:value-of select="format-number(500100.20, '#')"/>
                    </xsl:template>
                </xsl:stylesheet>
            );

            const xsltClass = new Xslt();
            const outXmlString = xsltClass.xsltProcess(
                xml,
                xsltDefinition
            );

            assert.equal(outXmlString, '500100');
        });

        it('Decimal, everything', () => {
            const xsltDefinition = xmlParse(
                <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                    <xsl:template match="/">
                        <xsl:value-of select="format-number(500100.20, '#.#')"/>
                    </xsl:template>
                </xsl:stylesheet>
            );

            const xsltClass = new Xslt();
            const outXmlString = xsltClass.xsltProcess(
                xml,
                xsltDefinition
            );

            assert.equal(outXmlString, '500100.2');
        });

        it('Decimal, mask with thousand separator, everything', () => {
            const xsltDefinition = xmlParse(
                <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                    <xsl:template match="/">
                        <xsl:value-of select="format-number(500100.20, '###,###.#')"/>
                    </xsl:template>
                </xsl:stylesheet>
            );

            const xsltClass = new Xslt();
            const outXmlString = xsltClass.xsltProcess(
                xml,
                xsltDefinition
            );

            assert.equal(outXmlString, '500,100.2');
        });

        it('Decimal, mask with filling zeroes', () => {
            const xsltDefinition = xmlParse(
                <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                    <xsl:template match="/">
                        <xsl:value-of select="format-number(500100.20, '#.000')"/>
                    </xsl:template>
                </xsl:stylesheet>
            );

            const xsltClass = new Xslt();
            const outXmlString = xsltClass.xsltProcess(
                xml,
                xsltDefinition
            );

            assert.equal(outXmlString, '500100.200');
        });

        it('NaN', () => {
            const xsltDefinition = xmlParse(
                <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                    <xsl:template match="/">
                        <xsl:value-of select="format-number('test', '#')"/>
                    </xsl:template>
                </xsl:stylesheet>
            );

            const xsltClass = new Xslt();
            const outXmlString = xsltClass.xsltProcess(
                xml,
                xsltDefinition
            );

            assert.equal(outXmlString, 'NaN');
        });
    });

    it('generate-id, trivial', () => {
        const xml = xmlParser.xmlParse(<root></root>);
        const xsltDefinition = xmlParse(
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                <xsl:template match="/">
                    <xsl:attribute name="uid">
                        <xsl:value-of select="generate-id(.)"/>
                    </xsl:attribute>
                </xsl:template>
            </xsl:stylesheet>
        );

        const xsltClass = new Xslt();

        const outXmlString = xsltClass.xsltProcess(
            xml,
            xsltDefinition
        );

        assert.ok(outXmlString);
    });

    it.skip('generate-id, complete', () => {
        const xsltDefinition = xmlParse(
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                <xsl:output method="xml" omit-xml-declaration="yes"/>

                <xsl:template match="chapter | sect1 | sect2">
                    <xsl:copy>
                        <xsl:attribute name="uid">
                            <xsl:value-of select="generate-id(.)"/>
                        </xsl:attribute>
                        <xsl:apply-templates select="@*|node()"/>
                    </xsl:copy>
                </xsl:template>

                <xsl:template match="@*|node()">
                    <xsl:copy>
                        <xsl:apply-templates select="@*|node()"/>
                    </xsl:copy>
                </xsl:template>

            </xsl:stylesheet>
        );

        const xml = xmlParser.xmlParse(
            <chapter>
                <para>Then with expanded wings he steers his flight</para>
                <figure>
                    <title>"Incumbent on the Dusky Air"</title>
                    <graphic fileref="pic1.jpg"/>
                </figure>
                <para>Aloft, incumbent on the dusky Air</para>
                <sect1>
                    <para>That felt unusual weight, till on dry Land</para>
                    <figure>
                        <title>"He Lights"</title>
                        <graphic fileref="pic2.jpg"/>
                    </figure>
                    <para>He lights, if it were Land that ever burned</para>
                    <sect2>
                        <para>With solid, as the Lake with liquid fire</para>
                        <figure>
                            <title>"The Lake with Liquid Fire"</title>
                            <graphic fileref="pic3.jpg"/>
                        </figure>
                    </sect2>
                </sect1>
            </chapter>
        );

        const xsltClass = new Xslt();

        const outXmlString = xsltClass.xsltProcess(
            xml,
            xsltDefinition
        );

        console.log(outXmlString)
        assert.ok(!outXmlString);
    });

    it('translate', () => {
        const xmlString = (
            <root>
                <typeA />
                <typeB />
            </root>
        );

        const xsltString = <xsl:template match="/">
            <xsl:variable name="smallcase" select="'abcdefghijklmnopqrstuvwxyz'" />
            <xsl:variable name="uppercase" select="'ABCDEFGHIJKLMNOPQRSTUVWXYZ'" />
            <xsl:value-of select="translate(DELETED, $smallcase, $uppercase)" />
        </xsl:template>

        const xsltClass = new Xslt();

        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);

        const outXmlString = xsltClass.xsltProcess(
            xml,
            xslt
        );

        console.log(outXmlString)
        assert.ok(!outXmlString);
    })
});
