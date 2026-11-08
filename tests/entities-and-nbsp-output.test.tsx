import { XmlParser, xmlEscapeText } from '../src/dom';
import { htmlEntityDecode } from '../src/dom/html-entity-decoder';
import { Xslt } from '../src/xslt';

const NBSP = ' ';

const transform = async (xml: string, body: string): Promise<string> => {
    const parser = new XmlParser();
    const stylesheet = `<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:output method="text"/>
        <xsl:template match="/">${body}</xsl:template>
    </xsl:stylesheet>`;
    return new Xslt({ outputMethod: 'text' }).xsltProcess(parser.xmlParse(xml), parser.xmlParse(stylesheet));
};

describe('NBSP-only values', () => {
    it.each([
        ['one NBSP', NBSP],
        ['several NBSP', `${NBSP}${NBSP}`],
        ['NBSP around a space', `${NBSP} ${NBSP}`]
    ])('keeps an attribute with %s', async (_name, value) => {
        const output = await transform(`<r a="${value}"/>`, '[<xsl:value-of select="r/@a"/>]');
        expect(output).toBe(`[${value}]`);
    });

    it('keeps an element with only NBSP', async () => {
        const output = await transform(`<r><t>${NBSP}</t></r>`, '[<xsl:value-of select="r/t"/>]');
        expect(output).toBe(`[${NBSP}]`);
    });

    it('still drops whitespace-only text nodes', async () => {
        const output = await transform('<r> \n\t </r>', '[<xsl:value-of select="normalize-space(r)"/>]');
        expect(output).toBe('[]');
    });
});

describe('Entity decoding', () => {
    it.each([
        ['&amp;#37;', '&#37;'],
        ['&amp;#x41;', '&#x41;'],
        ['&amp;lt;', '&lt;'],
        ['&amp;gt;', '&gt;'],
        ['&amp;amp;', '&amp;']
    ])('decodes %s only once', async (source, expected) => {
        const fromElement = await transform(`<r><t>a${source}b</t></r>`, '<xsl:value-of select="r/t"/>');
        const fromAttribute = await transform(`<r a="a${source}b"/>`, '<xsl:value-of select="r/@a"/>');
        expect(fromElement).toBe(`a${expected}b`);
        expect(fromAttribute).toBe(`a${expected}b`);
    });

    it.each([
        ['&#37;', '%'],
        ['&#x25;', '%'],
        ['&lt;', '<'],
        ['&gt;', '>'],
        ['&amp;', '&']
    ])('still decodes a real %s reference', async (source, expected) => {
        const output = await transform(`<r><t>a${source}b</t></r>`, '<xsl:value-of select="r/t"/>');
        expect(output).toBe(`a${expected}b`);
    });

    it.each([
        ['&#128512;', '\u{1F600}'],
        ['&#x1F600;', '\u{1F600}'],
        ['&#x10FFFF;', '\u{10FFFF}']
    ])('decodes %s above U+FFFF', async (source, expected) => {
        const output = await transform(`<r><t>${source}</t></r>`, '<xsl:value-of select="r/t"/>');
        expect(output).toBe(expected);
    });

    it('leaves an out-of-range reference untouched', () => {
        expect(htmlEntityDecode('&#x110000;')).toBe('&#x110000;');
    });

    it.each([
        ["'&amp;lt;x&amp;gt;'", '&lt;x&gt;'],
        ["'17&amp;#37;'", '17&#37;'],
        ["'&amp;amp;'", '&amp;']
    ])('decodes stylesheet attribute %s only once', async (select, expected) => {
        const output = await transform('<r/>', `<xsl:value-of select="${select}"/>`);
        expect(output).toBe(expected);
    });
});

describe('XML text escaping', () => {
    it.each([
        ['&', '&amp;'],
        ['&amp;', '&amp;amp;'],
        ['&amp;amp;', '&amp;amp;amp;'],
        ['<a>', '&lt;a&gt;']
    ])('escapes %s as %s', (text, expected) => {
        expect(xmlEscapeText(text)).toBe(expected);
    });

    it('re-escapes a literal "&amp;" value on XML output', async () => {
        const parser = new XmlParser();
        const stylesheet = `<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/"><out><xsl:value-of select="r"/></out></xsl:template>
        </xsl:stylesheet>`;
        const output = await new Xslt({ escape: true }).xsltProcess(
            parser.xmlParse('<r>&amp;amp;</r>'),
            parser.xmlParse(stylesheet)
        );
        expect(output).toBe('<out>&amp;amp;</out>');
    });
});
