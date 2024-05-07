import assert from 'assert';

import { XmlParser, xmlText } from '../../src/dom';

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
});
