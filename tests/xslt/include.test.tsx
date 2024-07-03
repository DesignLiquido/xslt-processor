import assert from 'assert';

import { XmlParser } from "../../src/dom";
import { Xslt } from "../../src/xslt";

describe('xsl:include', () => {
    it.skip('Trivial', async () => {
        const xmlSource = `<html></html>`;

        const xsltSource = `<xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:fo="http://www.w3.org/1999/XSL/Format">
            <xsl:output method="html" indent="yes"/>
            <xsl:include href="https://raw.githubusercontent.com/DesignLiquido/xslt-processor/xsl-include/examples/head.xsl"/>
        </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlSource);
        const xslt = xmlParser.xmlParse(xsltSource);
        const resultingXml = await xsltClass.xsltProcess(xml, xslt);
        assert.equal(resultingXml, '<html><head><link rel="stylesheet" type="text/css" href="style.css"><title/></head><body><div id="container"><div id="header"><div id="menu"><ul><li><a href="#" class="active">Home</a></li><li><a href="#">about</a></li></ul></div></div></div></body></html>');
    });
});
