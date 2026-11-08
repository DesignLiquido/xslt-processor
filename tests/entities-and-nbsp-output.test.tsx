import { XmlParser } from '../src/dom';
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
});
