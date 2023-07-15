import { assert, regExpEscape } from ".";
import { xmlValue } from "../../dom";
import { ExprContext } from "../expr-context";
import { BooleanValue, NodeSetValue, NumberValue, StringValue } from "../values";

function cyrb53(str: string, seed = 0) {
    let h1 = 0xdeadbeef ^ seed;
    let h2 = 0x41c6ce57 ^ seed;

    for(let i = 0, ch: any; i < str.length; i++) {
        ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }

    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
    h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
    h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

// In theory none of the `this.args` should work here,
// but `this` is replaced on `FunctionCallExpr.evaluate()`
// executes.

export function boolean(context: ExprContext) {
    assert(this.args.length === 1);
    return new BooleanValue(this.args[0].evaluate(context).booleanValue());
}

export function ceiling(context: ExprContext) {
    assert(this.args.length === 1);
    const num = this.args[0].evaluate(context).numberValue();
    return new NumberValue(Math.ceil(num));
}

export function concat(context: ExprContext) {
    let ret = '';
    for (let i = 0; i < this.args.length; ++i) {
        ret += this.args[i].evaluate(context).stringValue();
    }
    return new StringValue(ret);
}

export function contains(context: ExprContext) {
    assert(this.args.length === 2);
    const s0 = this.args[0].evaluate(context).stringValue();
    const s1 = this.args[1].evaluate(context).stringValue();
    return new BooleanValue(s0.includes(s1));
}

export function count(context: ExprContext) {
    assert(this.args.length === 1);
    const v = this.args[0].evaluate(context);
    return new NumberValue(v.nodeSetValue().length);
}

export function endsWith(context: ExprContext) {
    assert(this.args.length == 2);
    const s0 = this.args[0].evaluate(context).stringValue();
    const s1 = this.args[1].evaluate(context).stringValue();
    const re = new RegExp(`${regExpEscape(s1)}$`);
    return new BooleanValue(re.test(s0));
}

export function _false() {
    assert(this.args.length === 0);
    return new BooleanValue(false);
}

export function floor(context: ExprContext) {
    assert(this.args.length === 1);
    const num = this.args[0].evaluate(context).numberValue();
    return new NumberValue(Math.floor(num));
}

export function generateId(context: ExprContext) {
    return new StringValue(
        'A' + cyrb53(
            JSON.stringify(context.nodeList[context.position].id)
        )
    );
}

export function id(context: ExprContext) {
    assert(this.args.length === 1);
    const e = this.args[0].evaluate(context);
    const ret = [];
    let ids;
    if (e.type == 'node-set') {
        ids = [];
        const en = e.nodeSetValue();
        for (let i = 0; i < en.length; ++i) {
            const v = xmlValue(en[i]).split(/\s+/);
            for (let ii = 0; ii < v.length; ++ii) {
                ids.push(v[ii]);
            }
        }
    } else {
        ids = e.stringValue().split(/\s+/);
    }
    const d = context.root;
    for (let i = 0; i < ids.length; ++i) {
        const n = d.getElementById(ids[i]);
        if (n) {
            ret.push(n);
        }
    }
    return new NodeSetValue(ret);
}

export function lang(context: ExprContext) {
    assert(this.args.length === 1);
    const lang = this.args[0].evaluate(context).stringValue();
    let xmllang;
    let n = context.nodeList[context.position];
    while (n && n != n.parentNode /* just in case ... */) {
        xmllang = n.getAttributeValue('xml:lang');
        if (xmllang) {
            break;
        }
        n = n.parentNode;
    }
    if (!xmllang) {
        return new BooleanValue(false);
    }

    const re = new RegExp(`^${lang}$`, 'i');
    return new BooleanValue(xmllang.match(re) || xmllang.replace(/_.*$/, '').match(re));
}

export function last(context: ExprContext) {
    assert(this.args.length === 0);
    // NOTE(mesch): XPath position starts at 1.
    return new NumberValue(context.contextSize());
}

export function localName(context: ExprContext) {
    assert(this.args.length === 1 || this.args.length === 0);
    let n;
    if (this.args.length == 0) {
        n = [context.nodeList[context.position]];
    } else {
        n = this.args[0].evaluate(context).nodeSetValue();
    }

    if (n.length === 0) {
        return new StringValue('');
    }

    return new StringValue(n[0].localName);
}

export function matches(context: ExprContext) {
    assert(this.args.length >= 2);
    const s0 = this.args[0].evaluate(context).stringValue();
    const s1 = this.args[1].evaluate(context).stringValue();
    let s2: string;
    if (this.args.length > 2) {
        s2 = this.args[2].evaluate(context).stringValue();
        if (/[^mi]/.test(s2)) {
            throw new Error(`Invalid regular expression syntax: ${s2}`);
        }
    }
    let re: RegExp;
    try {
        re = new RegExp(s1, s2);
    } catch (e) {
        throw new Error(`Invalid matches argument: ${s1}`);
    }
    return new BooleanValue(re.test(s0));
}

export function _name(context: ExprContext) {
    assert(this.args.length === 1 || this.args.length === 0);
    let n;
    if (this.args.length === 0) {
        n = [context.nodeList[context.position]];
    } else {
        n = this.args[0].evaluate(context).nodeSetValue();
    }

    if (n.length === 0) {
        return new StringValue('');
    }

    return new StringValue(n[0].nodeName);
}

export function namespaceUri(context: ExprContext) {
    assert(this.args.length === 1 || this.args.length === 0);
    let n;
    if (this.args.length === 0) {
        n = [context.nodeList[context.position]];
    } else {
        n = this.args[0].evaluate(context).nodeSetValue();
    }

    if (n.length === 0) {
        return new StringValue('');
    }

    return new StringValue(n[0].namespaceURI || '');
}

export function normalizeSpace(context: ExprContext) {
    let s: string;
    if (this.args.length > 0) {
        s = this.args[0].evaluate(context).stringValue();
    } else {
        s = new NodeSetValue([context.nodeList[context.position]]).stringValue();
    }
    s = s.replace(/^\s*/, '').replace(/\s*$/, '').replace(/\s+/g, ' ');
    return new StringValue(s);
}

export function not(context: ExprContext) {
    assert(this.args.length === 1);
    const ret = !this.args[0].evaluate(context).booleanValue();
    return new BooleanValue(ret);
}

export function number(context: ExprContext) {
    assert(this.args.length === 1 || this.args.length === 0);

    if (this.args.length === 1) {
        return new NumberValue(this.args[0].evaluate(context).numberValue());
    }

    return new NumberValue(new NodeSetValue([context.nodeList[context.position]]).numberValue());
}

export function position(context: ExprContext) {
    assert(this.args.length === 0);
    // NOTE(mesch): XPath position starts at 1.
    return new NumberValue(context.position + 1);
}

export function round(context: ExprContext) {
    assert(this.args.length === 1);
    const num = this.args[0].evaluate(context).numberValue();
    return new NumberValue(Math.round(num));
}

export function startsWith(context: ExprContext) {
    assert(this.args.length == 2);
    const s0 = this.args[0].evaluate(context).stringValue();
    const s1 = this.args[1].evaluate(context).stringValue();
    return new BooleanValue(s0.indexOf(s1) === 0);
}

export function _string(context: ExprContext) {
    assert(this.args.length === 1 || this.args.length === 0);
    if (this.args.length === 0) {
        return new StringValue(new NodeSetValue([context.nodeList[context.position]]).stringValue());
    }

    return new StringValue(this.args[0].evaluate(context).stringValue());
}

export function stringLength(context: ExprContext) {
    let s;
    if (this.args.length > 0) {
        s = this.args[0].evaluate(context).stringValue();
    } else {
        s = new NodeSetValue([context.nodeList[context.position]]).stringValue();
    }
    return new NumberValue(s.length);
}

export function substring(context: ExprContext) {
    // NOTE: XPath defines the position of the first character in a
    // string to be 1, in JavaScript this is 0 ([XPATH] Section 4.2).
    assert(this.args.length === 2 || this.args.length === 3);
    const s0 = this.args[0].evaluate(context).stringValue();
    const s1 = this.args[1].evaluate(context).numberValue();
    let ret;
    if (this.args.length === 2) {
        let i1 = Math.max(0, Math.round(s1) - 1);
        ret = s0.substr(i1);
    } else {
        const s2 = this.args[2].evaluate(context).numberValue();
        const i0 = Math.round(s1) - 1;
        let i1 = Math.max(0, i0);
        const i2 = Math.round(s2) - Math.max(0, -i0);
        ret = s0.substr(i1, i2);
    }
    return new StringValue(ret);
}

export function substringAfter(context: ExprContext) {
    assert(this.args.length === 2);
    const s0 = this.args[0].evaluate(context).stringValue();
    const s1 = this.args[1].evaluate(context).stringValue();
    const i = s0.indexOf(s1);
    let ret;
    if (i === -1) {
        ret = '';
    } else {
        ret = s0.substr(i + s1.length);
    }
    return new StringValue(ret);
}

export function substringBefore(context: ExprContext) {
    assert(this.args.length === 2);
    const s0 = this.args[0].evaluate(context).stringValue();
    const s1 = this.args[1].evaluate(context).stringValue();
    const i = s0.indexOf(s1);
    let ret;
    if (i === -1) {
        ret = '';
    } else {
        ret = s0.substr(0, i);
    }
    return new StringValue(ret);
}

export function sum(context: ExprContext) {
    assert(this.args.length === 1);
    const n = this.args[0].evaluate(context).nodeSetValue();
    let sum = 0;
    for (let i = 0; i < n.length; ++i) {
        sum += xmlValue(n[i]) - 0;
    }
    return new NumberValue(sum);
}

export function translate(context: ExprContext) {
    assert(this.args.length === 3);
    let s0 = this.args[0].evaluate(context).stringValue();
    const s1 = this.args[1].evaluate(context).stringValue();
    const s2 = this.args[2].evaluate(context).stringValue();

    for (let i = 0; i < s1.length; ++i) {
        s0 = s0.replace(new RegExp(s1.charAt(i), 'g'), s2.charAt(i));
    }
    return new StringValue(s0);
}

export function _true() {
    assert(this.args.length === 0);
    return new BooleanValue(true);
}

export function xmlToJson(context: ExprContext) {
    assert(this.args.length < 2);
    return new StringValue(JSON.stringify(!this.args.length ? 'null' : xmlValue(context.nodeList[context.position])));
}
