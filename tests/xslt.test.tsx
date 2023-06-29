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
        assert.equal('CAB', html);
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
        assert.equal('ABC', html);
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
        assert.equal('CBA', html);
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
        assert.equal('xzyyy', html);
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
        assert.equal('<x y="z">k</x>', html);
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
        assert.equal('<item pos="2">A</item>' + '<item pos="3">B</item>' + '<item pos="1">C</item>', html);
    });
});
