/* eslint-disable no-undef */

// Copyright 2023 Design Liquido
// Copyright 2018 Johannes Wilm
// Copyright 2006, Google Inc.
// All Rights Reserved.
//
// Unit test for the XSLT processor.
//
// Author: Steffen Meschkat <mesch@google.com>
//         Johannes Wilm <johannes@fiduswriter.org>
import assert from 'assert';

import { dom } from 'isomorphic-jsx';
import React from 'react';

import { xmlParse } from '../src/dom';
import { Xslt } from '../src/xslt';

// Just touching the `dom`, otherwise Babel prunes the import.
console.log(dom);
const xmlString = (
    <all>
        <item pos="2">A</item>
        <item pos="3">B</item>
        <item pos="1">C</item>
    </all>
);

describe('xslt', () => {
    describe('xsl:for-each', () => {
        it('handles for-each sort', () => {
            const xsltForEachSort = (
                <xsl:stylesheet>
                    <xsl:template match="/">
                        <xsl:for-each select="//item">
                            <xsl:sort select="@pos" />
                            <xsl:value-of select="." />
                        </xsl:for-each>
                    </xsl:template>
                </xsl:stylesheet>
            );

            const xsltClass = new Xslt();
            const xml = xmlParse(xmlString);
            const xslt = xmlParse(xsltForEachSort);
            const html = xsltClass.xsltProcess(xml, xslt);
            assert.equal(html, 'CAB');
        });

        it('handles for-each sort ascending', () => {
            const xsltForEachSortAscending = (
                <xsl:stylesheet>
                    <xsl:template match="/">
                        <xsl:for-each select="//item">
                            <xsl:sort select="." order="ascending" />
                            <xsl:value-of select="." />
                        </xsl:for-each>
                    </xsl:template>
                </xsl:stylesheet>
            );

            const xsltClass = new Xslt();
            const xml = xmlParse(xmlString);
            const xslt = xmlParse(xsltForEachSortAscending);
            const html = xsltClass.xsltProcess(xml, xslt);
            assert.equal(html, 'ABC');
        });

        it('handles for-each sort descending', () => {
            const xsltForEachSortDescending = (
                <xsl:stylesheet>
                    <xsl:template match="/">
                        <xsl:for-each select="//item">
                            <xsl:sort select="." order="descending" />
                            <xsl:value-of select="." />
                        </xsl:for-each>
                    </xsl:template>
                </xsl:stylesheet>
            );

            const xsltClass = new Xslt();
            const xml = xmlParse(xmlString);
            const xslt = xmlParse(xsltForEachSortDescending);
            const html = xsltClass.xsltProcess(xml, xslt);
            assert.equal(html, 'CBA');
        });
    });

    describe('xsl:template', () => {
        it('Trivial', () => {
            const xmlString = (
                <root>
                    <typeA />
                    <typeB />
                </root>
            );

            const xsltString = <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml" version="1.0" encoding="utf-8" indent="yes" />
                <xsl:template match="*|/*">
                    <outputUnknown original-name="{name(.)}">
                        <xsl:apply-templates select="*" />
                    </outputUnknown>
                </xsl:template>
                <xsl:template match="typeA">
                    <outputA />
                </xsl:template>
                <xsl:template match="/*/typeB">
                    <outputB>I have text!</outputB>
                </xsl:template>
            </xsl:stylesheet>

            // Needs to be this way. `isomorphic-jsx rewrites `<outputA />` as `<outputA></outputA>`.
            const expectedOutString = `<outputUnknown original-name="root">`+
                `<outputA/>`+
                `<outputB>I have text!</outputB>`+
            `</outputUnknown>`;

            const xsltClass = new Xslt();
            const xml = xmlParse(xmlString);
            const xslt = xmlParse(xsltString);
            const outXmlString = xsltClass.xsltProcess(
                xml,
                xslt
            );

            assert.equal(outXmlString, expectedOutString);
        });

        // The three examples below from Marco Balestra illustrate
        // a behavior that should not be happening: template matches
        // should match _only once_, following a best match heuristic.
        // The base match algorithm should consider them.
        // For more information: https://github.com/DesignLiquido/xslt-processor/pull/62#issuecomment-1636684453

        it.skip('Example 1 from Marco', () => {
            const xmlString = (
                <root>
                    <typeA />
                    <typeB />
                </root>
            );

            const xsltString = <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml" version="1.0" encoding="utf-8" indent="yes" />
                <xsl:template match="*|/*">
                    <outputUnknown original-name="{name(.)}">
                        <subnode>Custom text</subnode>
                        <xsl:apply-templates select="*" />
                    </outputUnknown>
                </xsl:template>
                <xsl:template match="typeA">
                    <outputA>
                        <yep />
                    </outputA>
                </xsl:template>
                <xsl:template match="/*/typeB">
                    <outputB foo="bar">I have text!</outputB>
                </xsl:template>
            </xsl:stylesheet>;

            const expectedOutString = `<outputUnknown original-name="root">` +
                `<subnode>Custom text</subnode>` +
                `<outputA>`+
                    `<yep/>`+
                `</outputA>`+
                `<outputB foo="bar">I have text!</outputB>`+
            `</outputUnknown>`;

            const xsltClass = new Xslt();
            const xml = xmlParse(xmlString);
            const xslt = xmlParse(xsltString);
            const outXmlString = xsltClass.xsltProcess(
                xml,
                xslt
            );

            assert.equal(outXmlString, expectedOutString);
        });

        it.skip('Example 2 from Marco', () => {
            const xmlString = (
                <root>
                    <typeA />
                    <typeB />
                </root>
            );

            const xsltString = <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml" version="1.0" encoding="utf-8" indent="yes" />
                <xsl:template match="*|/*">
                    <outputUnknown original-name="{name(.)}">
                        <xsl:apply-templates select="*" />
                    </outputUnknown>
                </xsl:template>
                <xsl:template match="typeA">
                    <outputA>
                        <yep />
                    </outputA>
                </xsl:template>
                <xsl:template match="/*/typeB">
                    <outputB foo="bar">I have text!</outputB>
                </xsl:template>
            </xsl:stylesheet>;

            const expectedOutString = `<outputUnknown original-name="root">`+
                `<outputA>`+
                    `<yep/>`+
                `</outputA>`+
                `<outputB foo="bar">I have text!</outputB>`+
            `</outputUnknown>`;

            const xsltClass = new Xslt();
            const xml = xmlParse(xmlString);
            const xslt = xmlParse(xsltString);
            const outXmlString = xsltClass.xsltProcess(
                xml,
                xslt
            );

            assert.equal(outXmlString, expectedOutString);
        });

        it.skip('Example 3 from Marco', () => {
            const xmlString = (
                <root>
                    <typeA />
                    <typeB />
                </root>
            );

            const xsltString = <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="xml" version="1.0" encoding="utf-8" indent="yes" />
                <xsl:template match="*|/*">
                    <outputUnknown original-name="{name(.)}">
                        <xsl:apply-templates select="*" />
                    </outputUnknown>
                </xsl:template>
                <xsl:template match="typeA">
                    <outputA />
                </xsl:template>
                <xsl:template match="/*/typeB">
                    <outputB foo="bar">I have text!</outputB>
                </xsl:template>
            </xsl:stylesheet>;

            const expectedOutString = `<outputUnknown original-name="root">`+
                `<outputA/>`+
                `<outputB foo="bar">I have text!</outputB>`+
            `</outputUnknown>`;

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

    describe('xsl:text', () => {
        it('disable-output-escaping', () => {
            const xml = <anything></anything>;
            const xslt = <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="html" indent="yes" />
                <xsl:template match="/">
                    <xsl:text disable-output-escaping="yes">&lt;!DOCTYPE html&gt;</xsl:text>
                </xsl:template>
            </xsl:stylesheet>;

            const xsltClass = new Xslt();
            const parsedXml = xmlParse(xml);
            const parsedXslt = xmlParse(xslt);
            const html = xsltClass.xsltProcess(parsedXml, parsedXslt);
            assert.equal(html, '<!DOCTYPE html>');
        });
    });

    it('applies templates', () => {
        const xmlApplyTemplates = (
            <all>
                <item type="X">A</item>
                <item type="Y">B</item>
                <item type="X">C</item>
            </all>
        );

        const xsltApplyTemplates = (
            <xsl:stylesheet>
                <xsl:template match="/">
                    <xsl:apply-templates select="//item" />
                </xsl:template>
                <xsl:template match="item[@type='X']">
                    <xsl:value-of select="." />
                </xsl:template>
                <xsl:template match="item[@type='Y']">
                    <xsl:value-of select="." />
                </xsl:template>
            </xsl:stylesheet>
        );

        const xsltClass = new Xslt();
        const xml = xmlParse(xmlApplyTemplates);
        const xslt = xmlParse(xsltApplyTemplates);
        const html = xsltClass.xsltProcess(xml, xslt);
        assert.equal(html, 'ABC');
    });

    it('handles global variables', () => {
        const xsltGlobalVariables = (
            <xsl:stylesheet>
                <xsl:variable name="x" select="'x'" />
                <xsl:variable name="y" select="'y'" />
                <xsl:variable name="z">
                    <xsl:text>z</xsl:text>
                </xsl:variable>
                <xsl:template match="/">
                    <xsl:value-of select="$x" />
                    <xsl:value-of select="$z" />
                    <xsl:for-each select="//item">
                        <xsl:value-of select="$y" />
                    </xsl:for-each>
                </xsl:template>
            </xsl:stylesheet>
        );

        const xsltClass = new Xslt();
        const xml = xmlParse(xmlString);
        const xslt = xmlParse(xsltGlobalVariables);
        const html = xsltClass.xsltProcess(xml, xslt);
        assert.equal(html, 'xzyyy');
    });

    it('handles top level output', () => {
        const xsltTopLevelOutput = (
            <xsl:stylesheet>
                <xsl:template match="/">
                    <xsl:element name="x">
                        <xsl:attribute name="y">
                            <xsl:text>z</xsl:text>
                        </xsl:attribute>
                        <xsl:text>k</xsl:text>
                    </xsl:element>
                </xsl:template>
            </xsl:stylesheet>
        );

        const xsltClass = new Xslt();
        const xml = xmlParse(xmlString);
        const xslt = xmlParse(xsltTopLevelOutput);
        const html = xsltClass.xsltProcess(xml, xslt);
        assert.equal(html, '<x y="z">k</x>');
    });

    it('handles copy', () => {
        const xsltCopy = (
            <xsl:stylesheet>
                <xsl:template match="/">
                    <xsl:for-each select="//item">
                        <xsl:copy>
                            <xsl:for-each select="@*|node()">
                                <xsl:copy />
                            </xsl:for-each>
                        </xsl:copy>
                    </xsl:for-each>
                </xsl:template>
            </xsl:stylesheet>
        );

        const xsltClass = new Xslt();
        const xml = xmlParse(xmlString);
        const xslt = xmlParse(xsltCopy);
        const html = xsltClass.xsltProcess(xml, xslt);
        assert.equal(html, '<item pos="2">A</item><item pos="3">B</item><item pos="1">C</item>');
    });
});
