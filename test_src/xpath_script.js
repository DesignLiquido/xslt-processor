// Copyright 2018 Johannes Wilm
// Copyright 2005 Google Inc.
// All Rights Reserved
//
// Tests for the XPath parser. To run the test, open the file from the
// file system. No server support is required.
//
//
// Author: Steffen Meschkat <mesch@google.com>
import {
    Log
} from "./simplelog.js"
import {
    xpathParse
} from "../src/xpath.js"
import {
    expr
} from "../tests_src/xpath_unittest.js"
import {
    parseTree
} from "../src/xpathdebug.js"

window.logging = true;
window.xpathdebug = true;

window.load_expr = () => {
    const s = document.getElementById('s');
    for (let i = 0; i < expr.length; ++i) {
        const o = new Option(expr[i].replace(/&gt;/, '>').replace(/&lt;/, '<'));
        s.options[s.options.length] = o;
    }
    s.selectedIndex = 0;
}

let log = new Log()

window.xpath_test = form => {
    log.clear();
    try {
        const i = form.cases.selectedIndex;
        const options = form.cases.options;

        const text = options[i].value;
        log.writeRaw(`<tt><b>${text}</b></tt>`);

        const expr = xpathParse(text, message => log.write(message));
        log.writeRaw(`<tt><b>${text}</b></tt>`);
        log.writeRaw(`<pre>${parseTree(expr, '')}</pre>`);

        options[i].selected = false;
        if (i < options.length - 1) {
            options[i + 1].selected = true;
        } else {
            options[0].selected = true;
        }

    } catch (e) {
        log.write(`EXCEPTION ${e}`);
    }
}
