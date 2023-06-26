// XPath expression evaluation context. An XPath context consists of a
// DOM node, a list of DOM nodes that contains this node, a number
// that represents the position of the single node in the list, and a
// current set of variable bindings. (See XPath spec.)
//
// The interface of the expression context:
//
//   Constructor -- gets the node, its position, the node set it
//   belongs to, and a parent context as arguments. The parent context
//   is used to implement scoping rules for variables: if a variable
//   is not found in the current context, it is looked for in the
//   parent context, recursively. Except for node, all arguments have
//   default values: default position is 0, default node set is the
//   set that contains only the node, and the default parent is null.
//
//     Notice that position starts at 0 at the outside interface;
//     inside XPath expressions this shows up as position()=1.
//
//   clone() -- creates a new context with the current context as
//   parent. If passed as argument to clone(), the new context has a
//   different node, position, or node set. What is not passed is
//   inherited from the cloned context.
//
//   setVariable(name, expr) -- binds given XPath expression to the
//   name.
//
//   getVariable(name) -- what the name says.
//
//   setNode(position) -- sets the context to the node at the given
//   position. Needed to implement scoping rules for variables in
//   XPath. (A variable is visible to all subsequent siblings, not
//   only to its children.)
//
//   set/isCaseInsensitive -- specifies whether node name tests should
//   be case sensitive.  If you're executing xpaths against a regular
//   HTML DOM, you probably don't want case-sensitivity, because
//   browsers tend to disagree about whether elements & attributes
//   should be upper/lower case.  If you're running xpaths in an
//   XSLT instance, you probably DO want case sensitivity, as per the
//   XSL spec.
//
//   set/isReturnOnFirstMatch -- whether XPath evaluation should quit as soon
//   as a result is found. This is an optimization that might make sense if you
//   only care about the first result.
//
//   set/isIgnoreNonElementNodesForNTA -- whether to ignore non-element nodes
//   when evaluating the "node()" any node test. While technically this is
//   contrary to the XPath spec, practically it can enhance performance
//   significantly, and makes sense if you a) use "node()" when you mean "*",
//   and b) use "//" when you mean "/descendant::*/".

import { DOM_DOCUMENT_NODE } from "../constants";
import { BooleanValue } from "./boolean-value";
import { NodeSetValue } from "./node-set-value";
import { NumberValue } from "./number-value";
import { StringValue } from "./string-value";
import { TOK_NUMBER } from "./tokens";

export class ExprContext {
    node: any;

    position: any;

    nodelist: any;

    variables: any;

    parent: any;

    caseInsensitive: any;

    ignoreAttributesWithoutValue: any;

    returnOnFirstMatch: any;

    ignoreNonElementNodesForNTA: any;

    root: any;

    constructor(
        node: any,
        opt_position?: any,
        opt_nodelist?: any,
        opt_parent?: any,
        opt_caseInsensitive?: any,
        opt_ignoreAttributesWithoutValue?: any,
        opt_returnOnFirstMatch?: any,
        opt_ignoreNonElementNodesForNTA?: any
    ) {
        this.node = node;
        this.position = opt_position || 0;
        this.nodelist = opt_nodelist || [node];
        this.variables = {};
        this.parent = opt_parent || null;
        this.caseInsensitive = opt_caseInsensitive || false;
        this.ignoreAttributesWithoutValue = opt_ignoreAttributesWithoutValue || false;
        this.returnOnFirstMatch = opt_returnOnFirstMatch || false;
        this.ignoreNonElementNodesForNTA = opt_ignoreNonElementNodesForNTA || false;
        if (opt_parent) {
            this.root = opt_parent.root;
        } else if (this.node.nodeType == DOM_DOCUMENT_NODE) {
            // NOTE(mesch): DOM Spec stipulates that the ownerDocument of a
            // document is null. Our root, however is the document that we are
            // processing, so the initial context is created from its document
            // node, which case we must handle here explcitly.
            this.root = node;
        } else {
            this.root = node.ownerDocument;
        }
    }

    clone(opt_node: any, opt_position: any, opt_nodelist: any[]) {
        return new ExprContext(
            opt_node || this.node,
            typeof opt_position != 'undefined' ? opt_position : this.position,
            opt_nodelist || this.nodelist,
            this,
            this.caseInsensitive,
            this.ignoreAttributesWithoutValue,
            this.returnOnFirstMatch,
            this.ignoreNonElementNodesForNTA
        );
    }

    setVariable(name?: any, value?: any) {
        if (
            value instanceof StringValue ||
            value instanceof BooleanValue ||
            value instanceof NumberValue ||
            value instanceof NodeSetValue
        ) {
            this.variables[name] = value;
            return;
        }
        if ('true' === value) {
            this.variables[name] = new BooleanValue(true);
        } else if ('false' === value) {
            this.variables[name] = new BooleanValue(false);
        } else if (TOK_NUMBER.re.test(value)) {
            this.variables[name] = new NumberValue(value);
        } else {
            // DGF What if it's null?
            this.variables[name] = new StringValue(value);
        }
    }

    getVariable(name) {
        if (typeof this.variables[name] != 'undefined') {
            return this.variables[name];
        } else if (this.parent) {
            return this.parent.getVariable(name);
        } else {
            return null;
        }
    }

    setNode(position) {
        this.node = this.nodelist[position];
        this.position = position;
    }

    contextSize() {
        return this.nodelist.length;
    }

    isCaseInsensitive() {
        return this.caseInsensitive;
    }

    setCaseInsensitive(caseInsensitive) {
        return (this.caseInsensitive = caseInsensitive);
    }

    isIgnoreAttributesWithoutValue() {
        return this.ignoreAttributesWithoutValue;
    }

    setIgnoreAttributesWithoutValue(ignore) {
        return (this.ignoreAttributesWithoutValue = ignore);
    }

    isReturnOnFirstMatch() {
        return this.returnOnFirstMatch;
    }

    setReturnOnFirstMatch(returnOnFirstMatch) {
        return (this.returnOnFirstMatch = returnOnFirstMatch);
    }

    isIgnoreNonElementNodesForNTA() {
        return this.ignoreNonElementNodesForNTA;
    }

    setIgnoreNonElementNodesForNTA(ignoreNonElementNodesForNTA) {
        return (this.ignoreNonElementNodesForNTA = ignoreNonElementNodesForNTA);
    }
}
