import assert from 'assert';

import { dom } from 'isomorphic-jsx';
import React from 'react';

import { xmlParse, xmlText } from '../../src/dom';

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

        const outXmlString = xmlText(xmlParse(xmlString), {
            cData: false,
            selfClosingTags: false,
            escape: true
        });
        assert.equal(outXmlString, '<root><typeA></typeA><typeB></typeB></root>');
    });
});
