import { assert, regExpEscape, xmlValue } from "../dom/util";
import { BooleanValue } from "./boolean-value";
import { NodeSetValue } from "./node-set-value";
import { NumberValue } from "./number-value";
import { StringValue } from "./string-value";

export class FunctionCallExpr {
    name: any;
    args: any[];

    xpathfunctions = {
        last(ctx) {
            assert(this.args.length == 0);
            // NOTE(mesch): XPath position starts at 1.
            return new NumberValue(ctx.contextSize());
        },
    
        position(ctx) {
            assert(this.args.length == 0);
            // NOTE(mesch): XPath position starts at 1.
            return new NumberValue(ctx.position + 1);
        },
    
        count(ctx) {
            assert(this.args.length == 1);
            const v = this.args[0].evaluate(ctx);
            return new NumberValue(v.nodeSetValue().length);
        },
    
        'generate-id'(_ctx) {
            throw 'not implmented yet: XPath function generate-id()';
        },
    
        id(ctx) {
            assert(this.args.length == 1);
            const e = this.args[0].evaluate(ctx);
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
            const d = ctx.root;
            for (let i = 0; i < ids.length; ++i) {
                const n = d.getElementById(ids[i]);
                if (n) {
                    ret.push(n);
                }
            }
            return new NodeSetValue(ret);
        },
        'xml-to-json'(ctx) {
            assert(this.args.length < 2);
            return new StringValue(JSON.stringify(!this.args.length ? 'null' : xmlValue(ctx.node)));
        },
        'local-name'(ctx) {
            assert(this.args.length == 1 || this.args.length == 0);
            let n;
            if (this.args.length == 0) {
                n = [ctx.node];
            } else {
                n = this.args[0].evaluate(ctx).nodeSetValue();
            }
    
            if (n.length == 0) {
                return new StringValue('');
            } else {
                return new StringValue(n[0].localName);
            }
        },
        'namespace-uri'(ctx) {
            assert(this.args.length == 1 || this.args.length == 0);
            let n;
            if (this.args.length == 0) {
                n = [ctx.node];
            } else {
                n = this.args[0].evaluate(ctx).nodeSetValue();
            }
    
            if (n.length == 0) {
                return new StringValue('');
            } else {
                return new StringValue(n[0].namespaceURI || '');
            }
        },
    
        name(ctx) {
            assert(this.args.length == 1 || this.args.length == 0);
            let n;
            if (this.args.length == 0) {
                n = [ctx.node];
            } else {
                n = this.args[0].evaluate(ctx).nodeSetValue();
            }
    
            if (n.length == 0) {
                return new StringValue('');
            } else {
                return new StringValue(n[0].nodeName);
            }
        },
    
        string(ctx) {
            assert(this.args.length == 1 || this.args.length == 0);
            if (this.args.length == 0) {
                return new StringValue(new NodeSetValue([ctx.node]).stringValue());
            } else {
                return new StringValue(this.args[0].evaluate(ctx).stringValue());
            }
        },
    
        concat(ctx) {
            let ret = '';
            for (let i = 0; i < this.args.length; ++i) {
                ret += this.args[i].evaluate(ctx).stringValue();
            }
            return new StringValue(ret);
        },
    
        'starts-with'(ctx) {
            assert(this.args.length == 2);
            const s0 = this.args[0].evaluate(ctx).stringValue();
            const s1 = this.args[1].evaluate(ctx).stringValue();
            return new BooleanValue(s0.indexOf(s1) == 0);
        },
    
        'ends-with'(ctx) {
            assert(this.args.length == 2);
            const s0 = this.args[0].evaluate(ctx).stringValue();
            const s1 = this.args[1].evaluate(ctx).stringValue();
            const re = new RegExp(`${regExpEscape(s1)}$`);
            return new BooleanValue(re.test(s0));
        },
    
        contains(ctx) {
            assert(this.args.length == 2);
            const s0 = this.args[0].evaluate(ctx).stringValue();
            const s1 = this.args[1].evaluate(ctx).stringValue();
            return new BooleanValue(s0.includes(s1));
        },
    
        'substring-before'(ctx) {
            assert(this.args.length == 2);
            const s0 = this.args[0].evaluate(ctx).stringValue();
            const s1 = this.args[1].evaluate(ctx).stringValue();
            const i = s0.indexOf(s1);
            let ret;
            if (i == -1) {
                ret = '';
            } else {
                ret = s0.substr(0, i);
            }
            return new StringValue(ret);
        },
    
        'substring-after'(ctx) {
            assert(this.args.length == 2);
            const s0 = this.args[0].evaluate(ctx).stringValue();
            const s1 = this.args[1].evaluate(ctx).stringValue();
            const i = s0.indexOf(s1);
            let ret;
            if (i == -1) {
                ret = '';
            } else {
                ret = s0.substr(i + s1.length);
            }
            return new StringValue(ret);
        },
    
        substring(ctx) {
            // NOTE: XPath defines the position of the first character in a
            // string to be 1, in JavaScript this is 0 ([XPATH] Section 4.2).
            assert(this.args.length == 2 || this.args.length == 3);
            const s0 = this.args[0].evaluate(ctx).stringValue();
            const s1 = this.args[1].evaluate(ctx).numberValue();
            let ret;
            if (this.args.length == 2) {
                let i1 = Math.max(0, Math.round(s1) - 1);
                ret = s0.substr(i1);
            } else {
                const s2 = this.args[2].evaluate(ctx).numberValue();
                const i0 = Math.round(s1) - 1;
                let i1 = Math.max(0, i0);
                const i2 = Math.round(s2) - Math.max(0, -i0);
                ret = s0.substr(i1, i2);
            }
            return new StringValue(ret);
        },
    
        'string-length'(ctx) {
            let s;
            if (this.args.length > 0) {
                s = this.args[0].evaluate(ctx).stringValue();
            } else {
                s = new NodeSetValue([ctx.node]).stringValue();
            }
            return new NumberValue(s.length);
        },
    
        'normalize-space'(ctx) {
            let s;
            if (this.args.length > 0) {
                s = this.args[0].evaluate(ctx).stringValue();
            } else {
                s = new NodeSetValue([ctx.node]).stringValue();
            }
            s = s.replace(/^\s*/, '').replace(/\s*$/, '').replace(/\s+/g, ' ');
            return new StringValue(s);
        },
    
        translate(ctx) {
            assert(this.args.length == 3);
            let s0 = this.args[0].evaluate(ctx).stringValue();
            const s1 = this.args[1].evaluate(ctx).stringValue();
            const s2 = this.args[2].evaluate(ctx).stringValue();
    
            for (let i = 0; i < s1.length; ++i) {
                s0 = s0.replace(new RegExp(s1.charAt(i), 'g'), s2.charAt(i));
            }
            return new StringValue(s0);
        },
    
        matches(ctx) {
            assert(this.args.length >= 2);
            const s0 = this.args[0].evaluate(ctx).stringValue();
            const s1 = this.args[1].evaluate(ctx).stringValue();
            let s2;
            if (this.args.length > 2) {
                s2 = this.args[2].evaluate(ctx).stringValue();
                if (/[^mi]/.test(s2)) {
                    throw `Invalid regular expression syntax: ${s2}`;
                }
            }
            let re;
            try {
                re = new RegExp(s1, s2);
            } catch (e) {
                throw `Invalid matches argument: ${s1}`;
            }
            return new BooleanValue(re.test(s0));
        },
    
        boolean(ctx) {
            assert(this.args.length == 1);
            return new BooleanValue(this.args[0].evaluate(ctx).booleanValue());
        },
    
        not(ctx) {
            assert(this.args.length == 1);
            const ret = !this.args[0].evaluate(ctx).booleanValue();
            return new BooleanValue(ret);
        },
    
        true() {
            assert(this.args.length == 0);
            return new BooleanValue(true);
        },
    
        false() {
            assert(this.args.length == 0);
            return new BooleanValue(false);
        },
    
        lang(ctx) {
            assert(this.args.length == 1);
            const lang = this.args[0].evaluate(ctx).stringValue();
            let xmllang;
            let n = ctx.node;
            while (n && n != n.parentNode /* just in case ... */) {
                xmllang = n.getAttribute('xml:lang');
                if (xmllang) {
                    break;
                }
                n = n.parentNode;
            }
            if (!xmllang) {
                return new BooleanValue(false);
            } else {
                const re = new RegExp(`^${lang}$`, 'i');
                return new BooleanValue(xmllang.match(re) || xmllang.replace(/_.*$/, '').match(re));
            }
        },
    
        number(ctx) {
            assert(this.args.length == 1 || this.args.length == 0);
    
            if (this.args.length == 1) {
                return new NumberValue(this.args[0].evaluate(ctx).numberValue());
            } else {
                return new NumberValue(new NodeSetValue([ctx.node]).numberValue());
            }
        },
    
        sum(ctx) {
            assert(this.args.length == 1);
            const n = this.args[0].evaluate(ctx).nodeSetValue();
            let sum = 0;
            for (let i = 0; i < n.length; ++i) {
                sum += xmlValue(n[i]) - 0;
            }
            return new NumberValue(sum);
        },
    
        floor(ctx) {
            assert(this.args.length == 1);
            const num = this.args[0].evaluate(ctx).numberValue();
            return new NumberValue(Math.floor(num));
        },
    
        ceiling(ctx) {
            assert(this.args.length == 1);
            const num = this.args[0].evaluate(ctx).numberValue();
            return new NumberValue(Math.ceil(num));
        },
    
        round(ctx) {
            assert(this.args.length == 1);
            const num = this.args[0].evaluate(ctx).numberValue();
            return new NumberValue(Math.round(num));
        },
    
        // TODO(mesch): The following functions are custom. There is a
        // standard that defines how to add functions, which should be
        // applied here.
    
        'ext-join'(ctx) {
            assert(this.args.length == 2);
            const nodes = this.args[0].evaluate(ctx).nodeSetValue();
            const delim = this.args[1].evaluate(ctx).stringValue();
            let ret = '';
            for (let i = 0; i < nodes.length; ++i) {
                if (ret) {
                    ret += delim;
                }
                ret += xmlValue(nodes[i]);
            }
            return new StringValue(ret);
        },
    
        // ext-if() evaluates and returns its second argument, if the
        // boolean value of its first argument is true, otherwise it
        // evaluates and returns its third argument.
    
        'ext-if'(ctx) {
            assert(this.args.length == 3);
            if (this.args[0].evaluate(ctx).booleanValue()) {
                return this.args[1].evaluate(ctx);
            } else {
                return this.args[2].evaluate(ctx);
            }
        },
    
        // ext-cardinal() evaluates its single argument as a number, and
        // returns the current node that many times. It can be used in the
        // select attribute to iterate over an integer range.
    
        'ext-cardinal'(ctx) {
            assert(this.args.length >= 1);
            const c = this.args[0].evaluate(ctx).numberValue();
            const ret = [];
            for (let i = 0; i < c; ++i) {
                ret.push(ctx.node);
            }
            return new NodeSetValue(ret);
        }
    };
    
    constructor(name) {
        this.name = name;
        this.args = [];
    }

    appendArg(arg) {
        this.args.push(arg);
    }

    evaluate(ctx) {
        const fn = `${this.name.value}`;
        const f = this.xpathfunctions[fn];
        if (f) {
            return f.call(this, ctx);
        } else {
            return new BooleanValue(false);
        }
    }
}
