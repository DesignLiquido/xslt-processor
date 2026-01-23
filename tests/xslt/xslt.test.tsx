/* eslint-disable no-undef */

// Copyright 2023-2026 Design Liquido
// Copyright 2018 Johannes Wilm
// Copyright 2006, Google Inc.
// All Rights Reserved.
//
// Unit test for the XSLT processor.
//
// Author: Steffen Meschkat <mesch@google.com>
//         Johannes Wilm <johannes@fiduswriter.org>
import assert from 'assert';

import { XmlParser } from '../../src/dom';
import { Xslt } from '../../src/xslt';

describe('xslt', () => {
    describe('xsl:template', () => {
        it('Trivial', async () => {
            const xmlString = (
                `<root>
                    <typeA />
                    <typeB />
                </root>`
            );

            const xsltString = `<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
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
            </xsl:stylesheet>`

            // Needs to be this way. `isomorphic-jsx rewrites `<outputA />` as `<outputA></outputA>`.
            const expectedOutString = `<outputUnknown original-name="root">`+
                `<outputA/>`+
                `<outputB>I have text!</outputB>`+
            `</outputUnknown>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const outXmlString = await xsltClass.xsltProcess(
                xml,
                xslt
            );

            assert.equal(outXmlString, expectedOutString);
        });

        // The three examples below from Marco Balestra illustrate
        // the difference between triggering `<xsl:template>` vs. triggering
        // `<xsl:apply-templates>`:
        //
        // - For the top input node, only one `<xsl:template>` is triggered.
        // it should follow a "best match heuristic" (to be implemented);
        // - For `<xsl:apply-templates>`, all the templates can be triggered,
        // except the template that started the processing.
        // For more information: https://github.com/DesignLiquido/xslt-processor/pull/62#issuecomment-1636684453

        it('Example 1 from Marco', async () => {
            const xmlString = (
                `<root>
                    <typeA />
                    <typeB />
                </root>`
            );

            const xsltString = `<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
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
            </xsl:stylesheet>`;

            const expectedOutString = `<outputUnknown original-name="root">` +
                `<subnode>Custom text</subnode>` +
                `<outputA>`+
                    `<yep/>`+
                `</outputA>`+
                `<outputB foo="bar">I have text!</outputB>`+
            `</outputUnknown>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const outXmlString = await xsltClass.xsltProcess(
                xml,
                xslt
            );

            assert.equal(outXmlString, expectedOutString);
        });

        it('Example 2 from Marco', async () => {
            const xmlString = (
                `<root>
                    <typeA />
                    <typeB />
                </root>`
            );

            const xsltString = `<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
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
            </xsl:stylesheet>`;

            const expectedOutString = `<outputUnknown original-name="root">`+
                `<outputA>`+
                    `<yep/>`+
                `</outputA>`+
                `<outputB foo="bar">I have text!</outputB>`+
            `</outputUnknown>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const outXmlString = await xsltClass.xsltProcess(
                xml,
                xslt
            );

            assert.equal(outXmlString, expectedOutString);
        });

        it('Example 3 from Marco', async () => {
            const xmlString = (
                `<root>
                    <typeA />
                    <typeB />
                </root>`
            );

            const xsltString = `<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
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
            </xsl:stylesheet>`;

            const expectedOutString = `<outputUnknown original-name="root">`+
                `<outputA/>`+
                `<outputB foo="bar">I have text!</outputB>`+
            `</outputUnknown>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);
            const outXmlString = await xsltClass.xsltProcess(
                xml,
                xslt
            );

            assert.equal(outXmlString, expectedOutString);
        });
    });

    describe('xsl:text', () => {
        // Note: `disable-output-escaping` only works with escaped entities like `&lt;!DOCTYPE html&gt;`.
        // Direct DOCTYPE declarations in XSLT (e.g., `<!DOCTYPE html>`) violate XML well-formedness rules
        // and will cause parsing errors. The feature correctly converts escaped content to literal markup.
        it('disable-output-escaping, XML/HTML entities', async () => {
            const xml = `<anything></anything>`;
            const xslt = `<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:output method="html" indent="yes" />
                <xsl:template match="/">
                    <xsl:text disable-output-escaping='yes'>&lt;!DOCTYPE html&gt;</xsl:text>
                </xsl:template>
            </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const parsedXml = xmlParser.xmlParse(xml);
            const parsedXslt = xmlParser.xmlParse(xslt);
            const html = await xsltClass.xsltProcess(parsedXml, parsedXslt);
            assert.equal(html, '<!DOCTYPE html>');
        });

        it('CDATA as JavaScript', async () => {
            const xml = `<XampleXml xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                xmlns:xsd="http://www.w3.org/2001/XMLSchema">
                <ReportName>My first transformation in js</ReportName>
                <GenerationDate>01/06/2024</GenerationDate>
            </XampleXml>`;
            const xslt = `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
                <xsl:output method="html" version="4.0" encoding="utf-8" omit-xml-declaration="yes" />
                <xsl:template match="/">
                    <html>
                        <head>
                            <script type="text/javascript">
                                <xsl:text disable-output-escaping="yes">
                                    <![CDATA[
                                        if (1 < 2) {}
                                    ]]>
                                </xsl:text>
                            </script>
                        </head>
                        <body>
                            <h1>
                                <xsl:value-of select="//ReportName"/>
                            </h1>
                            <p>
                                <xsl:value-of select="//GenerationDate"/>
                            </p>
                        </body>
                    </html>
                </xsl:template>
                </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const parsedXml = xmlParser.xmlParse(xml);
            const parsedXslt = xmlParser.xmlParse(xslt);
            const html = await xsltClass.xsltProcess(parsedXml, parsedXslt);
            assert.equal(html, '<html><head><script type="text/javascript">\n                                    \n                                        if (1 < 2) {}\n                                    \n                                </script></head><body><h1>My first transformation in js</h1><p>01/06/2024</p></body></html>');
        });
    });

    it('applies templates', async () => {
        const xmlApplyTemplates = (
            `<all>
                <item type="X">A</item>
                <item type="Y">B</item>
                <item type="X">C</item>
            </all>`
        );

        const xsltApplyTemplates = (
            `<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:template match="/">
                    <xsl:apply-templates select="//item" />
                </xsl:template>
                <xsl:template match="item[@type='X']">
                    <xsl:value-of select="." />
                </xsl:template>
                <xsl:template match="item[@type='Y']">
                    <xsl:value-of select="." />
                </xsl:template>
            </xsl:stylesheet>`
        );

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlApplyTemplates);
        const xslt = xmlParser.xmlParse(xsltApplyTemplates);
        const result = await xsltClass.xsltProcess(xml, xslt);
        assert.equal(result, 'ABC');
    });

    it('handles global variables', async () => {
        const xmlString = (
            `<all>
                <item pos="2">A</item>
                <item pos="3">B</item>
                <item pos="1">C</item>
            </all>`
        );

        const xsltGlobalVariables = (
            `<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
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
            </xsl:stylesheet>`
        );

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltGlobalVariables);
        const html = await xsltClass.xsltProcess(xml, xslt);
        assert.equal(html, 'xzyyy');
    });

    it('handles top level output', async () => {
        const xmlString = (
            `<all>
                <item pos="2">A</item>
                <item pos="3">B</item>
                <item pos="1">C</item>
            </all>`
        );

        const xsltTopLevelOutput = (
            `<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:template match="/">
                    <xsl:element name="x">
                        <xsl:attribute name="y">
                            <xsl:text>z</xsl:text>
                        </xsl:attribute>
                        <xsl:text>k</xsl:text>
                    </xsl:element>
                </xsl:template>
            </xsl:stylesheet>`
        );

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltTopLevelOutput);
        const html = await xsltClass.xsltProcess(xml, xslt);
        assert.equal(html, '<x y="z">k</x>');
    });

    it('handles copy', async () => {
        const xmlString = (
            `<all>
                <item pos="2">A</item>
                <item pos="3">B</item>
                <item pos="1">C</item>
            </all>`
        );

        const xsltCopy = (
            `<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:template match="/">
                    <xsl:for-each select="//item">
                        <xsl:copy>
                            <xsl:for-each select="@*|node()">
                                <xsl:copy />
                            </xsl:for-each>
                        </xsl:copy>
                    </xsl:for-each>
                </xsl:template>
            </xsl:stylesheet>`
        );

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltCopy);
        const html = await xsltClass.xsltProcess(xml, xslt);
        assert.equal(html, '<item pos="2">A</item><item pos="3">B</item><item pos="1">C</item>');
    });
});
