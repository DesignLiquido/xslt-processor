function exposeTestFunctionNames() {
    return [
        'testVsNativeImplementation'
    ];
}

// these tests are courtesy of http://www.llamalab.com/js/xpath/benchmark.html
function testVsNativeImplementation() {
    if (!hasNativeXPath()) {
        return;
    }

    // the reference results are derived from the native evaluate()
    // implementation, if available.
    var tests = [
          'id("level10")/ancestor::SPAN'
        , 'id("level10")/ancestor-or-self::SPAN'
        , '//attribute::*'
        , 'child::HTML/child::BODY/child::H1'
        , 'descendant::node()'                                         // Opera 9.5 fails 249:250
        , 'descendant-or-self::SPAN'
        , 'id("first")/following::text()'                              // Opera 9.5 fails 104:105
        , 'id("first")/following-sibling::node()'                      // Opera 9.5 fails 13:14
        , 'id("level10")/parent::node()'
        , 'id("last")/preceding::text()'
        , 'id("last")/preceding-sibling::node()'
        , '/HTML/BODY/H1/self::node()'
        , '//*[@name]'
        , 'id("pet")/SELECT[@name="species"]/OPTION[@selected]/@value'
        , 'descendant::INPUT[@name="name"]/@value'
        , 'id("pet")/INPUT[@name="gender" and @checked]/@value'
        , '//TEXTAREA[@name="description"]/text()'
        , 'id("div1")|id("div2")|id("div3 div4 div5")'
        , '//LI[1]'
        , '//LI[last()]/text()'
        , '//LI[position() mod 2]/@class'
        , '//text()[.="foo"]'
        , 'descendant-or-self::SPAN[position() > 2]'
        , 'descendant::*[contains(@class," fruit ")]'
    ];
    
    var context = new ExprContext(document);
    context.setCaseInsensitive(true);
    for (var i = 0; i < tests.length; ++i) {
        var test = tests[i];
        var xpathObj = xpathParse(test);
        var xpathResult = xpathObj.evaluate(context);
        var nodeCount = (xpathResult && xpathResult.value)
            ? xpathResult.value.length : 0;
        assertEquals(test, getNativeXPathCount(test), nodeCount);
    }
}

/**
 * Detects whether native XPath is available.
 */
function hasNativeXPath() {
    return document.evaluate != undefined;
}

/**
 * Utility function used to generate the native implementation counts for
 * reference.
 */
function getNativeXPathCount(xpath) {
    var results = document.evaluate(xpath, document, null,
        XPathResult.ANY_TYPE, null);
    var count = 0;
    while (results.iterateNext()) {
        ++count;
    }
    return count;
}
