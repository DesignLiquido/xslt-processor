function exposeTestFunctionNames() {
    return [
        'testVsNativeImplementation'
    ];
}

// these tests are courtesy of http://www.llamalab.com/js/xpath/benchmark.html
function testVsNativeImplementation() {
    // the reference result was derived from Firefox 2's native evaluate()
    // using the iframe setup below. Failures are commented out. As they are
    // fixed, they should be uncommented.
    var tests = [
          [ 'id("level10")/ancestor::SPAN', 9 ]
        , [ 'id("level10")/ancestor-or-self::SPAN', 10 ]
        //, [ '//attribute::*', 92 ]                                            // IE fails with "0"
        , [ 'child::HTML/child::BODY/child::H1', 1 ]
        //, [ 'descendant::node()', 230 ]                                       // Firefox fails with "90"
        , [ 'descendant-or-self::SPAN', 13 ]
        //, [ 'id("first")/following::text()', 112 ]                            // IE fails with "80"
        //, [ 'id("first")/following-sibling::node()', 13 ]                     // IE fails with "7"
        , [ 'id("level10")/parent::node()', 1 ]
        //, [ 'id("last")/preceding::text()', 156 ]                             // IE fails with "94"
        //, [ 'id("last")/preceding-sibling::node()', 15 ]                      // IE fails with "7"
        , [ '/HTML/BODY/H1/self::node()', 1 ]
        //, [ '//*[@name]', 9 ]                                                 // IE fails with "0"
        //, [ 'id("pet")/SELECT[@name="species"]/OPTION[@selected]/@value', 1 ] // IE fails with "7"
        //, [ 'descendant::INPUT[@name="name"]/@value', 1 ]                     // IE fails with "0"
        //, [ 'id("pet")/INPUT[@name="gender" and @checked]/@value', 1 ]        // IE fails with "2"
        , [ '//TEXTAREA[@name="description"]/text()', 1 ]
        , [ 'id("div1")|id("div2")|id("div3 div4 div5")', 4 ]
        //, [ '//LI[1]', 2 ]                                                    // Firefox fails with "1"
        //, [ '//LI[last()]/text()', 2 ]                                        // Firefox fails with "1"
        //, [ '//LI[position() mod 2]/@class', 1 ]                              // Firefox fails with "0"
        , [ '//text()[.="foo"]', 1 ]
        , [ 'descendant-or-self::SPAN[position() > 2]', 11 ]
        //, [ 'descendant::*[contains(@class," fruit ")]', 1 ]                  // IE fails with "0"
    ];
    
    var context = new ExprContext(document);
    context.setCaseInsensitive(true);
    for (var i = 0; i < tests.length; ++i) {
        var test = tests[i];
        var xpathObj = xpathParse(test[0]);
        var xpathResult = xpathObj.evaluate(context);
        var nodeCount = (xpathResult && xpathResult.value)
            ? xpathResult.value.length : 0;
        assertEquals(test[0], test[1], nodeCount);
    }
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
