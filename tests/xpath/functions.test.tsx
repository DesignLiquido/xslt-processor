/* eslint-disable no-undef */

// Copyright 2023-2024 Design Liquido
// All Rights Reserved.

import assert from 'assert';

import { XmlParser } from '../../src/dom';
import { Xslt } from '../../src/xslt';

describe('XPath Functions', () => {
    let xmlParser: XmlParser;

    beforeAll(() => {
        xmlParser = new XmlParser();
    });

    describe('1.0', () => {
        it('current', async () => {
            const xml = xmlParser.xmlParse(`<root>test</root>`);
            const xsltDefinition = xmlParser.xmlParse(
                `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                    <xsl:template match="/">
                        <xsl:value-of select="current()" />
                    </xsl:template>
                </xsl:stylesheet>`
            );

            const xsltClass = new Xslt();
            const outXmlString = await xsltClass.xsltProcess(xml, xsltDefinition);

            assert.equal(outXmlString, 'test');
        });

        describe('format-number', () => {
            xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(`<root></root>`);

            it('Trivial', async () => {
                const xsltDefinition = xmlParser.xmlParse(
                    `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                        <xsl:template match="/">
                            <xsl:value-of select="format-number(500100, '#')" />
                        </xsl:template>
                    </xsl:stylesheet>`
                );

                const xsltClass = new Xslt();
                const outXmlString = await xsltClass.xsltProcess(xml, xsltDefinition);

                assert.equal(outXmlString, '500100');
            });

            it('Decimal, only integer part', async () => {
                const xsltDefinition = xmlParser.xmlParse(
                    `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                        <xsl:template match="/">
                            <xsl:value-of select="format-number(500100.20, '#')" />
                        </xsl:template>
                    </xsl:stylesheet>`
                );

                const xsltClass = new Xslt();
                const outXmlString = await xsltClass.xsltProcess(xml, xsltDefinition);

                assert.equal(outXmlString, '500100');
            });

            it('Decimal, everything', async () => {
                const xsltDefinition = xmlParser.xmlParse(
                    `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                        <xsl:template match="/">
                            <xsl:value-of select="format-number(500100.20, '#.#')" />
                        </xsl:template>
                    </xsl:stylesheet>`
                );

                const xsltClass = new Xslt();
                const outXmlString = await xsltClass.xsltProcess(xml, xsltDefinition);

                assert.equal(outXmlString, '500100.2');
            });

            it('Decimal, mask with thousand separator, everything', async () => {
                const xsltDefinition = xmlParser.xmlParse(
                    `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                        <xsl:template match="/">
                            <xsl:value-of select="format-number(500100.20, '###,###.#')" />
                        </xsl:template>
                    </xsl:stylesheet>`
                );

                const xsltClass = new Xslt();
                const outXmlString = await xsltClass.xsltProcess(xml, xsltDefinition);

                assert.equal(outXmlString, '500,100.2');
            });

            it('Decimal, mask with filling zeroes', async () => {
                const xsltDefinition = xmlParser.xmlParse(
                    `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                        <xsl:template match="/">
                            <xsl:value-of select="format-number(500100.20, '#.000')" />
                        </xsl:template>
                    </xsl:stylesheet>`
                );

                const xsltClass = new Xslt();
                const outXmlString = await xsltClass.xsltProcess(xml, xsltDefinition);

                assert.equal(outXmlString, '500100.200');
            });

            it('NaN', async () => {
                const xsltDefinition = xmlParser.xmlParse(
                    `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                        <xsl:template match="/">
                            <xsl:value-of select="format-number('test', '#')" />
                        </xsl:template>
                    </xsl:stylesheet>`
                );

                const xsltClass = new Xslt();
                const outXmlString = await xsltClass.xsltProcess(xml, xsltDefinition);

                assert.equal(outXmlString, 'NaN');
            });
        });

        // TODO: This returns the following in other transformers:
        // "Unable to generate the XML document using the provided XML/XSL input. Cannot create an attribute node (uid) whose parent is a document node. Most recent element start tag was output at line -1 of module *unknown*"
        it.skip('generate-id, trivial', async () => {
            const xml = xmlParser.xmlParse(`<root></root>`);
            const xsltDefinition = xmlParser.xmlParse(
                `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                    <xsl:template match="/">
                        <xsl:attribute name="uid">
                            <xsl:value-of select="generate-id(.)" />
                        </xsl:attribute>
                    </xsl:template>
                </xsl:stylesheet>`
            );

            const xsltClass = new Xslt();

            const outXmlString = await xsltClass.xsltProcess(xml, xsltDefinition);

            assert.ok(outXmlString);
        });

        it.skip('generate-id, complete', async () => {
            const xsltDefinition = xmlParser.xmlParse(
                `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                    <xsl:output method="xml" omit-xml-declaration="yes" />

                    <xsl:template match="chapter | sect1 | sect2">
                        <xsl:copy>
                            <xsl:attribute name="uid">
                                <xsl:value-of select="generate-id(.)" />
                            </xsl:attribute>
                            <xsl:apply-templates select="@*|node()" />
                        </xsl:copy>
                    </xsl:template>

                    <xsl:template match="@*|node()">
                        <xsl:copy>
                            <xsl:apply-templates select="@*|node()" />
                        </xsl:copy>
                    </xsl:template>
                </xsl:stylesheet>`
            );

            const xml = xmlParser.xmlParse(
                `<chapter>
                    <para>Then with expanded wings he steers his flight</para>
                    <figure>
                        <title>"Incumbent on the Dusky Air"</title>
                        <graphic fileref="pic1.jpg" />
                    </figure>
                    <para>Aloft, incumbent on the dusky Air</para>
                    <sect1>
                        <para>That felt unusual weight, till on dry Land</para>
                        <figure>
                            <title>"He Lights"</title>
                            <graphic fileref="pic2.jpg" />
                        </figure>
                        <para>He lights, if it were Land that ever burned</para>
                        <sect2>
                            <para>With solid, as the Lake with liquid fire</para>
                            <figure>
                                <title>"The Lake with Liquid Fire"</title>
                                <graphic fileref="pic3.jpg" />
                            </figure>
                        </sect2>
                    </sect1>
                </chapter>`
            );

            const xsltClass = new Xslt();

            const outXmlString = await xsltClass.xsltProcess(xml, xsltDefinition);

            // Uncomment below to see the results
            // console.log(outXmlString);
            assert.ok(!outXmlString);
        });

        it('translate', async () => {
            const xmlString = (
                `<root>
                    <typeA />
                    <typeB />
                </root>`
            );

            const xsltString = (
                `<xsl:template match="/">
                    <xsl:variable name="smallcase" select="'abcdefghijklmnopqrstuvwxyz'" />
                    <xsl:variable name="uppercase" select="'ABCDEFGHIJKLMNOPQRSTUVWXYZ'" />
                    <xsl:value-of select="translate(DELETED, $smallcase, $uppercase)" />
                </xsl:template>`
            );

            const xsltClass = new Xslt();

            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            const outXmlString = await xsltClass.xsltProcess(xml, xslt);

            // Uncomment below to see the results
            // console.log(outXmlString);
            assert.ok(!outXmlString);
        });
    });

    describe('2.0', () => {
        it('upper-case', async () => {
            const xmlString = (
                `<root></root>`
            );

            const xsltString = (
                `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="2.0">
                    <xsl:template match="/">
                        <xsl:value-of select="upper-case('Lily')" />
                    </xsl:template>
                </xsl:stylesheet>`
            )

            const xsltClass = new Xslt();

            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            const outXmlString = await xsltClass.xsltProcess(xml, xslt);

            assert.equal(outXmlString, 'LILY');
        });

        it('lower-case', async () => {
            const xmlString = (
                `<root></root>`
            );

            const xsltString = (
                `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="2.0">
                    <xsl:template match="/">
                        <xsl:value-of select="lower-case('Lily')" />
                    </xsl:template>
                </xsl:stylesheet>`
            )

            const xsltClass = new Xslt();

            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            const outXmlString = await xsltClass.xsltProcess(xml, xslt);

            assert.equal(outXmlString, 'lily');
        });

        it('replace simple text', async () => {
            const xmlString = (
                `<root></root>`
            );

            const xsltString = (
                `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="2.0">
                    <xsl:template match="/">
                        <xsl:value-of select="replace('Lily','Li','*')" />
                    </xsl:template>
                </xsl:stylesheet>`
            )

            const xsltClass = new Xslt();

            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            const outXmlString = await xsltClass.xsltProcess(xml, xslt);

            assert.equal(outXmlString, '*ly');
        });

        it('replace regex text', async () => {
            const xmlString = (
                `<root></root>`
            );

            const xsltString = (
                `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="2.0">
                    <xsl:template match="/">
                        <xsl:value-of select="replace('This is some 123 text 456 with 789 numbers.', '[^\\d]+', '')" />
                    </xsl:template>
                </xsl:stylesheet>`
            )

            const xsltClass = new Xslt();

            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            const outXmlString = await xsltClass.xsltProcess(xml, xslt);

            assert.equal(outXmlString, '123456789');
        });
    });
});
