// Copyright 2005, Google Inc.
// All Rights Reserved.
//
// Unit test for the XPath parser and engine.
//
// Author: Steffen Meschkat <mesch@google.com>

var expr = [
    "@*",
    "@*|node()",
    "/descendant-or-self::div",
    "//div",
    "substring('12345', 0, 3)",
    "//title | //link",
    "$x//title",
    "//*[@about]",
    "count(descendant::*)",
    "count(descendant::*) + count(ancestor::*)",
    "concat(substring-before(@image,'marker'),'icon',substring-after(@image,'marker'))",
    "@*|text()",
    "*|/",
    "source|destination",
    "$page != 'to' and $page != 'from'",
    "substring-after(icon/@image, '/mapfiles/marker')",
    "substring-before($str, $c)",
    "$page = 'from'",
    "segments/@time",
    "child::para",
    "child::*",
    "child::text()",
    "child::node()",
    "attribute::name",
    "attribute::*",
    "descendant::para",
    "ancestor::div",
    "ancestor-or-self::div",
    "descendant-or-self::para",
    "self::para",
    "child::chapter/descendant::para",
    "child::*/child::para",
    "/",
    "/descendant::para",
    "/descendant::olist/child::item",
    "child::para[position()=1]",
    "child::para[position()=last()]",
    "child::para[position()=last()-1]",
    "child::para[position()>1]",
    "following-sibling::chapter[position()=1]",
    "preceding-sibling::chapter[position()=1]",
    "/descendant::figure[position()=42]",
    "/child::doc/child::chapter[position()=5]/child::section[position()=2]",
    "child::para[attribute::type='warning']",
    "child::para[attribute::type='warning'][position()=5]",
    "child::para[position()=5][attribute::type='warning']",
    "child::chapter[child::title='Introduction']",
    "child::chapter[child::title]",
    "child::*[self::chapter or self::appendix]",
    "child::*[self::chapter or self::appendix][position()=last()]",

    // The following are all expressions that occur in maps XSLT templates. 
    // See maps/tools/xpathscan.pl. 

    "$address",
    "$address=string(/page/user/defaultlocation)",
    "$count-of-snippet-of-url = 0",
    "$daddr",
    "$form",
    "$form = 'from'",
    "$form = 'to'",
    "$form='near'",
    "$home",
    "$i",
    "$i > $page and $i < $page + $range",
    "$i < $page and $i >= $page - $range",
    "$i < @max",
    "$i <= $page",
    "$i + 1",
    "$i = $page",
    "$i = 1",
    "$info = position() or (not($info) and position() = 1)",
    "$is-first-order",
    "$is-first-order and $snippets-exist",
    "$more",
    "$more > 0",
    "$near-point",
    "$page",
    "$page != 'from'",
    "$page != 'to'",
    "$page != 'to' and $page != 'from'",
    "$page > 1",
    "$page = 'basics'",
    "$page = 'details'",
    "$page = 'from'",
    "$page = 'to'",
    "$page='from'",
    "$page='to'",
    "$r >= 0.5",
    "$r >= 1",
    "$r - 0",
    "$r - 1",
    "$r - 2",
    "$r - 3",
    "$r - 4",
    "$saddr",
    "$sources",
    "$sources[position() < $details]",
    "$src",
    "$str",
    "\"'\"",
    "(//location[string(info/references/reference[1]/url)=string($current-url)]/info/references/reference[1])[1]",
    "(not($count-of-snippet-of-url = 0) and (position() = 1) or not($current-url = //locations/location[position() = $last-pos]//reference[1]/url))",
    "(not($info) and position() = 1) or $info = position()",
    ".",
    "../@arg0",
    "../@filterpng",
    "/page/@filterpng",
    "4",
    "@attribution",
    "@id",
    "@max > @num",
    "@meters > 16093",
    "@name",
    "@start div @num + 1",
    "@url",
    "ad",
    "address/line",
    "adsmessage",
    "attr",
    "boolean(location[@id='near'][icon/@image])",
    "bubble/node()",
    "calltoaction/node()",
    "category",
    "contains($str, $c)",
    "count(//location[string(info/references/reference[1]/url)=string($current-url)]//snippet)",
    "count(//snippet)",
    "count(attr)",
    "count(location)",
    "count(structured/source) > 1",
    "description/node()",
    "destination",
    "destinationAddress",
    "domain",
    "false()",
    "icon/@class != 'noicon'",
    "icon/@image",
    "info",
    "info/address/line",
    "info/distance",
    "info/distance and $near-point",
    "info/distance and info/phone and $near-point",
    "info/distance or info/phone",
    "info/panel/node()",
    "info/phone",
    "info/references/reference[1]",
    "info/references/reference[1]/snippet",
    "info/references/reference[1]/url",
    "info/title",
    "info/title/node()",
    "line",
    "location",
    "location[@id!='near']",
    "location[@id='near'][icon/@image]",
    "location[position() > $numlocations div 2]",
    "location[position() <= $numlocations div 2]",
    "locations",
    "locations/location",
    "near",
    "node()",
    "not($count-of-snippets = 0)",
    "not($form = 'from')",
    "not($form = 'near')",
    "not($form = 'to')",
    "not(../@page)",
    "not(structured/source)",
    "notice",
    "number(../@info)",
    "number(../@items)",
    "number(/page/@linewidth)",
    "page/ads",
    "page/directions",
    "page/error",
    "page/overlay",
    "page/overlay/locations/location",
    "page/refinements",
    "page/request/canonicalnear",
    "page/request/near",
    "page/request/query",
    "page/spelling/suggestion",
    "page/user/defaultlocation",
    "phone",
    "position()",
    "position() != 1",
    "position() != last()",
    "position() > 1",
    "position() < $details",
    "position()-1",
    "query",
    "references/@total",
    "references/reference",
    "references/reference/domain",
    "references/reference/url",
    "reviews/@positive div (reviews/@positive + reviews/@negative) * 5",
    "reviews/@positive div (reviews/@positive + reviews/@negative) * (5)",
    "reviews/@total",
    "reviews/@total > 1",
    "reviews/@total > 5",
    "reviews/@total = 1",
    "segments/@distance",
    "segments/@time",
    "segments/segment",
    "shorttitle/node()",
    "snippet",
    "snippet/node()",
    "source",
    "sourceAddress",
    "sourceAddress and destinationAddress",
    "string(../@daddr)",
    "string(../@form)",
    "string(../@page)",
    "string(../@saddr)",
    "string(info/title)",
    "string(page/request/canonicalnear) != ''",
    "string(page/request/near) != ''",
    "string-length($address) > $linewidth",
    "structured/@total - $details",
    "structured/source",
    "structured/source[@name]",
    "substring($address, 1, $linewidth - 3)",
    "substring-after($str, $c)",
    "substring-after(icon/@image, '/mapfiles/marker')",
    "substring-before($str, $c)",
    "tagline/node()",
    "targetedlocation",
    "title",
    "title/node()",
    "true()",
    "url",
    "visibleurl"
];

function testParse() {
  for (var i = 0; i < expr.length; ++i) {
    assert(expr[i], xpathParse(expr[i]));
  }
}

var numExpr = [
    /* number expressions */
    [ "1+1", 2 ],
    [ "floor( -3.1415 )", -4 ],
    [ "-5 mod -2", -1 ],
    [ "-5 mod 2", -1 ],
    [ "5 mod -2", 1 ],
    [ "5 mod 2", 1 ],
    [ "ceiling( 3.1415 )", 4.0 ], 
    [ "floor( 3.1415 )", 3.0 ], 
    [ "ceiling( -3.1415 )", -3.0 ],
    /* string expressions */
    [ "substring('12345', -42, 1 div 0)", "12345" ],
    [ "normalize-space( '  qwerty ' )", "qwerty" ],
    [ "contains('1234567890','9')", true ],
    [ "contains('1234567890','1')", true ],
    [ "'Hello World!'", 'Hello World!' ], 
    [ "substring('12345', 1.5, 2.6)", "234" ], 
    [ "substring('12345', 0, 3)", "12" ], 
    /* variables */
    [ "$foo", 'bar', { foo: 'bar' } ], 
    [ "$foo", 100, { foo: 100 } ], 
    [ "$foo", true, { foo: true } ], 
    [ "$foo + 1", 101, { foo: 100 } ]
];


function testEval() {
  for (var i = 0; i < numExpr.length; ++i) {
    var ctx = new ExprContext(null, 0, null, null);
    var e = numExpr[i];
    if (e[2]) {
      for (var k in e[2]) {
        var v = e[2][k];
        if (typeof v == 'number') {
          ctx.setVariable(k, new NumberValue(v));
          
        } else if (typeof v == 'string') {
          ctx.setVariable(k, new StringValue(v));

        } else if (typeof v == 'boolean') {
          ctx.setVariable(k, new BooleanValue(v));
        }
      }
    }

    var result = xpathParse(e[0]).evaluate(ctx);
    if (typeof e[1] == 'number') {
      assertEquals(e[0], e[1], result.numberValue());

    } else if (typeof e[1] == 'string') {
      assertEquals(e[0], e[1], result.stringValue());
      
    } else if (typeof e[1] == 'boolean') {
      assertEquals(e[0], e[1], result.booleanValue());
    }
  }
}

// eval an xpath expression to a single node
function evalNodeSet(expr, ctx) {
  var expr1 = xpathParse(expr);
  var e = expr1.evaluate(ctx);
  return e.nodeSetValue();
}

function testEvalDom() {
  var xml = [
      '<page>',
      '<request>',
      '<q>new york</q>',
      '</request>',
      '<location lat="100" lon="100"/>',
      '</page>'
  ].join('');

  var ctx = new ExprContext(xmlParse(xml));
  var ctx1 = new ExprContext((new DOMParser).parseFromString(xml, 'text/xml'));

  var ns = evalNodeSet('page', ctx);
  assertEquals('page', ns.length, 1);

  ns = evalNodeSet('page', ctx1);
  assertEquals('page', ns.length, 1);

  ns = evalNodeSet('/page', ctx);
  assertEquals('/page', ns.length, 1);

  ns = evalNodeSet('/page', ctx1);
  assertEquals('/page', ns.length, 1);

  assertEquals('/', evalNodeSet('/', ctx).length, 1);
  assertEquals('/', evalNodeSet('/', ctx1).length, 1);

  assertEquals('/', evalNodeSet('/', ctx)[0].nodeName, '#document');
  assertEquals('/', evalNodeSet('/', ctx1)[0].nodeName, '#document');

  assertEquals('/page', evalNodeSet('/page', ctx)[0].nodeName, 'page');
  assertEquals('/page', evalNodeSet('/page', ctx1)[0].nodeName, 'page');

  var n = evalNodeSet('/page/location/@lat', ctx)[0];
  assertEquals('/page/location/@lat', n.nodeName, 'lat');
  assertEquals('/page/location/@lat', n.nodeValue, '100');

  n = evalNodeSet('/page/location/@lat', ctx1)[0];
  assertEquals('/page/location/@lat', n.nodeName, 'lat');
  assertEquals('/page/location/@lat', n.nodeValue, '100');
}
