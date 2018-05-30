// Copyright 2018 Johannes Wilm
// Copyright 2006, Google Inc.
// All Rights Reserved.
//
// Unit test for the XSLT processor.
//
// Author: Steffen Meschkat <mesch@google.com>

import {xsltProcess} from "../src/xslt.js"
import {xmlParse} from "../src/dom.js"
//********************************************
// DGF BEWARE!  You MUST update this function if you add tests!
//********************************************
window.exposeTestFunctionNames = function() {
    return ['testForEachSort', 'testForEachSortAscending', 'testForEachSortDescending', 'testApplyTemplates', 'testGlobalVariables', 'testTopLevelOutput', 'testCopy'];
}

function el(id) {
  return document.getElementById(id);
}

window.testForEachSort = function() {
  const xml = xmlParse(el('xml').value);
  const xslt = xmlParse(el('xslt-for-each-sort').value);
  const html = xsltProcess(xml, xslt);
  assertEquals("CAB", html);
}

window.testForEachSortAscending = function() {
  const xml = xmlParse(el('xml').value);
  const xslt = xmlParse(el('xslt-for-each-sort-ascending').value);
  const html = xsltProcess(xml, xslt);
  assertEquals("ABC", html);
}

window.testForEachSortDescending = function() {
  const xml = xmlParse(el('xml').value);
  const xslt = xmlParse(el('xslt-for-each-sort-descending').value);
  const html = xsltProcess(xml, xslt);
  assertEquals("CBA", html);
}

window.testApplyTemplates = function() {
  const xml = xmlParse(el('xml-apply-templates').value);
  const xslt = xmlParse(el('xslt-apply-templates').value);
  const html = xsltProcess(xml, xslt);
  assertEquals("ABC", html);
}

window.testGlobalVariables = function() {
  const xml = xmlParse(el('xml').value);
  const xslt = xmlParse(el('xslt-global-variables').value);
  const html = xsltProcess(xml, xslt);
  assertEquals("xzyyy", html);
}

window.testTopLevelOutput = function() {
  const xml = xmlParse(el('xml').value);
  const xslt = xmlParse(el('xslt-top-level-output').value);
  const html = xsltProcess(xml, xslt);
  assertEquals('<x y="z">k</x>', html);
}

window.testCopy = function() {
  const xml = xmlParse(el('xml').value);
  const xslt = xmlParse(el('xslt-copy').value);
  const html = xsltProcess(xml, xslt);
  assertEquals('<item pos="2">A</item>' +
               '<item pos="3">B</item>' +
               '<item pos="1">C</item>', html);
}
