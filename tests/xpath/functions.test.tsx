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
    it('generate-id, trivial', () => {
        const xml = xmlParse(<root></root>);
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

        const xml = xmlParse(
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
});
