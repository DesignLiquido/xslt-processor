// Copyright 2023-2026 Design Liquido
// Copyright 2018 Johannes Wilm
// Copyright 2005 Google Inc.
// All Rights Reserved
//
//
// Author: Steffen Meschkat <mesch@google.com>
//         Junji Takagi <jtakagi@google.com>
//         Johannes Wilm <johannes@fiduswriter.org>
import { htmlEntityDecode } from '../src/dom/html-entity-decoder';
import assert from 'assert';

import { XmlParser, xmlText } from '../src/dom';

import { DOM_ATTRIBUTE_NODE } from '../src/constants';

describe('dom parsing', () => {
    let xmlParser: XmlParser;

    beforeAll(() => {
        xmlParser = new XmlParser();
    });

    it('can parse xml', () => {
        const xml = "<page> " +
                "    <request> " +
                "        <q id=\"q\">new york</q> " +
                "    </request> " +
                "    <location lat=\"100\" lon=\"200\" /> " +
                "</page>";

        const dom1 = xmlParser.xmlParse(`<?xml version="1.0"?>${xml}`);
        const dom2 = xmlParser.xmlParse(`<?xml version='1.1'?>${xml}`);
        doTestXmlParse(dom1, dom2);

        const dom1Attributes = dom1.firstChild.childNodes[1].childNodes.filter(n => n.nodeType === DOM_ATTRIBUTE_NODE);
        const dom2Attributes = dom2.firstChild.childNodes[1].childNodes.filter(n => n.nodeType === DOM_ATTRIBUTE_NODE);

        assert.equal(
            dom1Attributes.length,
            dom2Attributes.length,
            'location.attributes.length'
        );

        const tag = 'q';
        const byTag = dom1.getElementsByTagName(tag);
        assert.equal(1, byTag.length);
        assert.equal(tag, (byTag[0] as any).nodeName);

        const id = 'q';
        const byId = dom1.getElementById(id);
        assert.notEqual(byId, null);
        assert.equal(id, byId.getAttributeValue('id'));
    });

    it('can parse weird xml', () => {
        const xml = [
            '<_>',
            '<_.:->',
            '<:>!"#$%&\'()*+,-./:;&lt;=&gt;?[\\]^_`{|}~</:>',
            '</_.:->',
            '<:-_. _=".-" :="-."/>',
            '</_>'
        ].join('');

        const dom1 = xmlParser.xmlParse(`<?xml version="1.0"?>${xml}`);
        const dom2 = xmlParser.xmlParse(`<?xml version='1.1'?>${xml}`);
        doTestXmlParse(dom1, dom2);

        const dom1Attributes = dom1.firstChild.childNodes[1].childNodes.filter(n => n.nodeType === DOM_ATTRIBUTE_NODE);
        const dom2Attributes = dom2.firstChild.childNodes[1].childNodes.filter(n => n.nodeType === DOM_ATTRIBUTE_NODE);

        assert.equal(
            dom1Attributes.length,
            dom2Attributes.length,
            'location.attributes.length'
        );
        assert.equal(dom1Attributes.length, 2, 'location.attributes.length');
    });

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

        const dom1 = xmlParser.xmlParse(`<?xml version="1.0"?>${xml}`);
        const dom2 = xmlParser.xmlParse(`<?xml version='1.1'?>${xml}`);
        doTestXmlParse(dom1, dom2);

        const dom1Attributes = dom1.firstChild.childNodes[1].childNodes.filter(n => n.nodeType === DOM_ATTRIBUTE_NODE);
        const dom2Attributes = dom2.firstChild.childNodes[1].childNodes.filter(n => n.nodeType === DOM_ATTRIBUTE_NODE);

        assert.equal(
            dom1Attributes.length,
            dom2Attributes.length,
            'location.attributes.length'
        );
        assert.equal(dom1Attributes.length, 2, 'location.attributes.length');
    });

    it('can resolve entities', () => {
        assert.equal('";"', htmlEntityDecode('&quot;;&quot;'));
    });
});

const doTestXmlParse = (dom1: any, dom2: any) => {
    assert.equal(xmlText(dom1), xmlText(dom2), 'xmlText');

    assert.equal(dom1.nodeName, dom2.nodeName, '#document');

    assert.equal(dom1.documentElement, dom1.firstChild, 'documentElement');
    assert.equal(dom2.documentElement, dom2.firstChild, 'documentElement');

    assert.equal(dom1.parentNode, null, 'parentNode');
    assert.equal(dom2.parentNode, null, 'parentNode');

    assert.equal(dom1.documentElement.parentNode, dom1, 'parentNode');
    assert.equal(dom2.documentElement.parentNode, dom2, 'parentNode');

    assert.equal(dom1.documentElement.nodeName, dom2.documentElement.nodeName, 'page');
    assert.equal(dom1.childNodes.length, dom2.childNodes.length, 'dom.childNodes.length');
    assert.equal(dom1.childNodes.length, dom2.childNodes.length, 'dom.childNodes.length');
    assert.equal(dom1.firstChild.childNodes.length, dom2.firstChild.childNodes.length, 'dom.childNodes.length');
    assert.equal(dom1.firstChild.childNodes.length, dom2.firstChild.childNodes.length, 'dom.childNodes.length');
};
