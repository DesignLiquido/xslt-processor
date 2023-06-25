// Copyright 2018 Johannes Wilm
// Copyright 2005 Google Inc.
// All Rights Reserved
//
//
// Author: Steffen Meschkat <mesch@google.com>
//         Junji Takagi <jtakagi@google.com>
//         Johannes Wilm <johannes@fiduswriter.org>
import he from "he"

import {
    xmlParse
} from "../src/dom.js"
import {
    xmlText
} from "../src/util.js"

import assert from 'assert';
import { dom } from 'isomorphic-jsx';

describe('dom parsing', () => {

    it('can parse xml', () => {
        const xml = <page>
            <request>
                <q id="q">new york</q>
            </request>
            <location lat="100" lon='200'/>
        </page>;

        const dom1 = xmlParse(`<?xml version="1.0"?>${xml}`);
        const dom2 = xmlParse(`<?xml version='1.1'?>${xml}`);
        doTestXmlParse(dom1, dom2);

        const tag = 'q';
        const byTag = dom1.getElementsByTagName(tag);
        assert.equal(1, byTag.length);
        assert.equal(tag, byTag[0].nodeName);

        const id = 'q';
        const byId = dom1.getElementById(id);
        assert.notEqual(byId, null);
        assert.equal(id, byId.getAttribute('id'));

    })

    it('can parse weird xml', () => {
        const xml = [
            '<_>',
            '<_.:->',
            '<:>!"#$%&\'()*+,-./:;&lt;=&gt;?[\\]^_`{|}~</:>',
            '</_.:->',
            '<:-_. _=".-" :="-."/>',
            '</_>'
        ].join('');

        const dom1 = xmlParse(`<?xml version="1.0"?>${xml}`);
        const dom2 = xmlParse(`<?xml version='1.1'?>${xml}`);
        doTestXmlParse(dom1, dom2);
    })

    it('can parse Japanese xml', () => {
        const xml = [
            '<\u30da\u30fc\u30b8>',
            '<\u30ea\u30af\u30a8\u30b9\u30c8>',
            '<\u30af\u30a8\u30ea>\u6771\u4eac</\u30af\u30a8\u30ea>',
            '</\u30ea\u30af\u30a8\u30b9\u30c8>',
            '<\u4f4d\u7f6e \u7def\u5ea6="\u4e09\u5341\u4e94" ',
            "\u7d4c\u5ea6='\u767e\u56db\u5341'/>",
            '</\u30da\u30fc\u30b8>'
        ].join('');

        const dom1 = xmlParse(`<?xml version="1.0"?>${xml}`);
        const dom2 = xmlParse(`<?xml version='1.1'?>${xml}`);
        doTestXmlParse(dom1, dom2);
    })

    it('can resolve entities', () => {
        assert.equal('";"', he.decode('&quot;;&quot;'));
    })

})


const doTestXmlParse = (dom1, dom2) => {
    assert.equal(xmlText(dom1), xmlText(dom2), 'xmlText');

    assert.equal(
        dom1.nodeName,
        dom2.nodeName,
        '#document'
    );

    assert.equal(dom1.documentElement, dom1.firstChild, 'documentElement');
    assert.equal(dom2.documentElement, dom2.firstChild, 'documentElement');

    assert.equal(dom1.parentNode, null, 'parentNode');
    assert.equal(dom2.parentNode, null, 'parentNode');

    assert.equal(dom1.documentElement.parentNode, dom1, 'parentNode');
    assert.equal(dom2.documentElement.parentNode, dom2, 'parentNode');

    assert.equal(
        dom1.documentElement.nodeName,
        dom2.documentElement.nodeName,
        'page'
    );
    assert.equal(
        dom1.childNodes.length,
        dom2.childNodes.length,
        'dom.childNodes.length'
    );
    assert.equal(
        dom1.childNodes.length,
        dom2.childNodes.length,
        'dom.childNodes.length'
    );
    assert.equal(
        dom1.firstChild.childNodes.length,
        dom2.firstChild.childNodes.length,
        'dom.childNodes.length'
    );
    assert.equal(
        dom1.firstChild.childNodes.length,
        dom2.firstChild.childNodes.length,
        'dom.childNodes.length'
    );

    assert.equal(
        dom1.firstChild.childNodes[1].attributes.length,
        dom2.firstChild.childNodes[1].attributes.length,
        'location.attributes.length'
    );
    assert.equal(
        dom1.firstChild.childNodes[1].attributes.length,
        2,
        'location.attributes.length'
    );
}
