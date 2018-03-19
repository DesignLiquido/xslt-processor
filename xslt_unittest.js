// Copyright 2006, Google Inc.
// All Rights Reserved.
//
// Unit test for the XSLT processor.
//
// Author: Steffen Meschkat <mesch@google.com>

//********************************************
// DGF BEWARE!  You MUST update this function if you add tests!
//********************************************
function exposeTestFunctionNames() {
    return ['testForEachSort', 'testForEachSortAscending', 'testForEachSortDescending', 'testApplyTemplates', 'testGlobalVariables', 'testTopLevelOutput', 'testCopy'];
}

function el(id) {
  return document.getElementById(id);
}

function testForEachSort() {
  const xml = xmlParse(el('xml').value);
  const xslt = xmlParse(el('xslt-for-each-sort').value);
  const html = xsltProcess(xml, xslt);
  assertEquals("CAB", html);
}

function testForEachSortAscending() {
  const xml = xmlParse(el('xml').value);
  const xslt = xmlParse(el('xslt-for-each-sort-ascending').value);
  const html = xsltProcess(xml, xslt);
  assertEquals("ABC", html);
}

function testForEachSortDescending() {
  const xml = xmlParse(el('xml').value);
  const xslt = xmlParse(el('xslt-for-each-sort-descending').value);
  const html = xsltProcess(xml, xslt);
  assertEquals("CBA", html);
}

function testApplyTemplates() {
  const xml = xmlParse(el('xml-apply-templates').value);
  const xslt = xmlParse(el('xslt-apply-templates').value);
  const html = xsltProcess(xml, xslt);
  assertEquals("ABC", html);
}

function testGlobalVariables() {
  const xml = xmlParse(el('xml').value);
  const xslt = xmlParse(el('xslt-global-variables').value);
  const html = xsltProcess(xml, xslt);
  assertEquals("xzyyy", html);
}

function testTopLevelOutput() {
  const xml = xmlParse(el('xml').value);
  const xslt = xmlParse(el('xslt-top-level-output').value);
  const html = xsltProcess(xml, xslt);
  assertEquals('<x y="z">k</x>', html);
}

function testCopy() {
  const xml = xmlParse(el('xml').value);
  const xslt = xmlParse(el('xslt-copy').value);
  const html = xsltProcess(xml, xslt);
  assertEquals('<item pos="2">A</item>' +
               '<item pos="3">B</item>' +
               '<item pos="1">C</item>', html);
}
