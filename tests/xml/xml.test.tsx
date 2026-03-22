import assert from 'assert';

import { XmlParser, xmlText, xmlTransformedText } from '../../src/dom';

describe('General XML', () => {
    it('Self-closing tags disabled', () => {
        const xmlString = `<root><typeA /><typeB /></root>`;

        const xmlParser = new XmlParser();
        const outXmlString = xmlText(xmlParser.xmlParse(xmlString), {
            cData: true,
            selfClosingTags: false,
            escape: true,
            outputMethod: 'xml'
        });
        assert.equal(outXmlString, '<root><typeA></typeA><typeB></typeB></root>');
    });

    it('preserves comment boundaries in transformed serialization', () => {
        const xmlString = '<root><!--1234567890 1234567890--></root>';

        const xmlParser = new XmlParser();
        const outXmlString = xmlTransformedText(xmlParser.xmlParse(xmlString), {
            cData: true,
            selfClosingTags: true,
            escape: true,
            outputMethod: 'xml'
        });

        assert.equal(outXmlString, xmlString);
    });
});
