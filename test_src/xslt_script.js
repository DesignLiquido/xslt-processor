// Copyright 2018 Johannes Wilm
// Copyright 2005 Google Inc.
// All Rights Reserved
//
// Tests for the XSLT processor. To run the test, open the file from
// the file system. No server support is required.
//
//
// Author: Steffen Meschkat <mesch@google.com>
import {
    xmlParse
} from "../src/dom"
import {
    xsltProcess
} from "../src/xslt"

window.logging = true;
window.xsltdebug = true;

window.el = function(id) {
    return document.getElementById(id);
}

window.test_xslt = function() {
    const xml = xmlParse(el('xml').value);
    const xslt = xmlParse(el('xslt').value);
    const html = xsltProcess(xml, xslt);
    el('html').value = html;
    el('htmldisplay').innerHTML = html;
}

window.cleanxml = function() {
    cleanvalue('xml');
    cleanvalue('xslt');
}

window.cleanvalue = function(id) {
    const x = el(id);
    x.value = x.value.replace(/^\s*/, '').replace(/\n\s*/g, '\n');
}
