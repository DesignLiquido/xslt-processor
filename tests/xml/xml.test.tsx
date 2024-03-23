import assert from 'assert';

import { dom } from 'isomorphic-jsx';
import React from 'react';

import { XmlParser, xmlText } from '../../src/dom';

// Just touching the `dom`, otherwise Babel prunes the import.
console.log(dom);
describe('General XML', () => {
    it('Self-closing tags disabled', () => {
        const xmlString = (
            <root>
                <typeA />
                <typeB />
            </root>
        );

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
