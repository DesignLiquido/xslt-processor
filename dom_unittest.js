// unit test for dom.js
// Author: Steffen Meschkat <mesch@google.com>

function testXmlParse() {

  var xml = [
      '<page>',
      '<request>',
      '<q>new york</q>',
      '</request>',
      '<location lat="100" lon="100"/>',
      '</page>'
  ].join('');

  var dom = xmlParse(xml);
  var dom1 = (new DOMParser).parseFromString(xml, 'text/xml');

  assertEquals('#document',
               dom.nodeName,
               dom1.nodeName);

  assertEquals('documentElement', dom.documentElement, dom.firstChild);
  assertEquals('documentElement', dom1.documentElement, dom1.firstChild);

  assertEquals('parentNode', dom.parentNode, null);
  assertEquals('parentNode', dom1.parentNode, null);

  assertEquals('parentNode', dom.documentElement.parentNode, dom);
  assertEquals('parentNode', dom1.documentElement.parentNode, dom1);

  assertEquals('page',
               dom.documentElement.nodeName, 
               dom1.documentElement.nodeName);
  assertEquals('dom.childNodes.length',
               dom.childNodes.length, 
               dom1.childNodes.length);
  assertEquals('dom.childNodes.length', 
               dom.childNodes.length,
               dom1.childNodes.length);
  assertEquals('page.childNodes.length',
               dom.firstChild.childNodes.length,
               dom1.firstChild.childNodes.length);
  assertEquals('page.childNodes.length', 
               dom.firstChild.childNodes.length,
               dom1.firstChild.childNodes.length);

  assertEquals('location.attributes.length', 
               dom.firstChild.childNodes[1].attributes.length,
               dom1.firstChild.childNodes[1].attributes.length);
  assertEquals('location.attributes.length', 
               dom.firstChild.childNodes[1].attributes.length, 2);
}
