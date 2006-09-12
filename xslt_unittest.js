// Copyright 2006, Google Inc.
// All Rights Reserved.
//
// Unit test for the XSLT processor.
//
// Author: Steffen Meschkat <mesch@google.com>


function el(id) {
  return document.getElementById(id);
}

function testForEachSort() {
  var xml = xmlParse(el('xml').value);
  var xslt = xmlParse(el('xslt-for-each-sort').value);
  var html = xsltProcess(xml, xslt);
  assertEquals("CAB", html);
}

function testForEachSortAscending() {
  var xml = xmlParse(el('xml').value);
  var xslt = xmlParse(el('xslt-for-each-sort-ascending').value);
  var html = xsltProcess(xml, xslt);
  assertEquals("ABC", html);
}

function testForEachSortDescending() {
  var xml = xmlParse(el('xml').value);
  var xslt = xmlParse(el('xslt-for-each-sort-descending').value);
  var html = xsltProcess(xml, xslt);
  assertEquals("CBA", html);
}
