// Copyright 2018 Johannes Wilm
// Copyright 2005 Google Inc.
// All Rights Reserved
//
// An XPath parser and evaluator written in JavaScript. The
// implementation is complete except for functions handling
// namespaces.
//
// Reference: [XPATH] XPath Specification
// <http://www.w3.org/TR/1999/REC-xpath-19991116>.
//
//
// The API of the parser has several parts:
//
// 1. The parser function xpathParse() that takes a string and returns
// an expession object.
//
// 2. The expression object that has an evaluate() method to evaluate the
// XPath expression it represents. (It is actually a hierarchy of
// objects that resembles the parse tree, but an application will call
// evaluate() only on the top node of this hierarchy.)
//
// 3. The context object that is passed as an argument to the evaluate()
// method, which represents the DOM context in which the expression is
// evaluated.
//
// 4. The value object that is returned from evaluate() and represents
// values of the different types that are defined by XPath (number,
// string, boolean, and node-set), and allows to convert between them.
//
// These parts are near the top of the file, the functions and data
// that are used internally follow after them.
//
//
// Original author: Steffen Meschkat <mesch@google.com>
// The entry point for the parser.
//
// @param expr a string that contains an XPath expression.
// @return an expression object that can be evaluated with an
// expression context.
import {
    assert,
    mapExec,
    mapExpr,
    reverseInplace,
    copyArray,
    copyArrayIgnoringAttributesWithoutValue,
    xmlValue,
    regExpEscape,
    predicateExprHasPositionalSelector
} from "./util.js"
import {
    XML_NC_NAME
} from "./xmltoken.js"
import {
    XNode,
    DOM_DOCUMENT_NODE,
    DOM_ATTRIBUTE_NODE,
    DOM_ELEMENT_NODE,
    DOM_TEXT_NODE,
    DOM_COMMENT_NODE,
    DOM_PROCESSING_INSTRUCTION_NODE
} from "./dom.js"
import {
    toString
} from "./xpathdebug.js"

export function xpathParse(expr, xpathLog=()=>{}) {
    xpathLog(`parse ${expr}`);
    xpathParseInit(xpathLog);

    const cached = xpathCacheLookup(expr);
    if (cached) {
        xpathLog(' ... cached');
        return cached;
    }

    // Optimize for a few common cases: simple attribute node tests
    // (@id), simple element node tests (page), variable references
    // ($address), numbers (4), multi-step path expressions where each
    // step is a plain element node test
    // (page/overlay/locations/location).

    if (expr.match(/^(\$|@)?\w+$/i)) {
        let ret = makeSimpleExpr(expr);
        xpathParseCache[expr] = ret;
        xpathLog(' ... simple');
        return ret;
    }

    if (expr.match(/^\w+(\/\w+)*$/i)) {
        let ret = makeSimpleExpr2(expr);
        xpathParseCache[expr] = ret;
        xpathLog(' ... simple 2');
        return ret;
    }

    const cachekey = expr; // expr is modified during parse

    const stack = [];
    let ahead = null;
    let previous = null;
    let done = false;

    let parse_count = 0;
    let lexer_count = 0;
    let reduce_count = 0;

    while (!done) {
        parse_count++;
        expr = expr.replace(/^\s*/, '');
        previous = ahead;
        ahead = null;

        let rule = null;
        let match = '';
        for (let i = 0; i < xpathTokenRules.length; ++i) {
            let result = xpathTokenRules[i].re.exec(expr);
            lexer_count++;
            if (result && result.length > 0 && result[0].length > match.length) {
                rule = xpathTokenRules[i];
                match = result[0];
                break;
            }
        }

        // Special case: allow operator keywords to be element and
        // variable names.

        // NOTE(mesch): The parser resolves conflicts by looking ahead,
        // and this is the only case where we look back to
        // disambiguate. So this is indeed something different, and
        // looking back is usually done in the lexer (via states in the
        // general case, called "start conditions" in flex(1)). Also,the
        // conflict resolution in the parser is not as robust as it could
        // be, so I'd like to keep as much off the parser as possible (all
        // these precedence values should be computed from the grammar
        // rules and possibly associativity declarations, as in bison(1),
        // and not explicitly set.

        if (rule &&
            (rule == TOK_DIV ||
                rule == TOK_MOD ||
                rule == TOK_AND ||
                rule == TOK_OR) &&
            (!previous ||
                previous.tag == TOK_AT ||
                previous.tag == TOK_DSLASH ||
                previous.tag == TOK_SLASH ||
                previous.tag == TOK_AXIS ||
                previous.tag == TOK_DOLLAR)) {
            rule = TOK_QNAME;
        }

        if (rule) {
            expr = expr.substr(match.length);
            xpathLog(`token: ${match} -- ${rule.label}`);
            ahead = {
                tag: rule,
                match,
                prec: rule.prec ? rule.prec : 0, // || 0 is removed by the compiler
                expr: makeTokenExpr(match)
            };

        } else {
            xpathLog('DONE');
            done = true;
        }

        while (xpathReduce(stack, ahead, xpathLog)) {
            reduce_count++;
            xpathLog(`stack: ${stackToString(stack)}`);
        }
    }

    xpathLog(`stack: ${stackToString(stack)}`);

    // DGF any valid XPath should "reduce" to a single Expr token
    if (stack.length != 1) {
        throw `XPath parse error ${cachekey}:\n${stackToString(stack)}`;
    }

    let result = stack[0].expr;
    xpathParseCache[cachekey] = result;

    xpathLog(`XPath parse: ${parse_count} / ${lexer_count} / ${reduce_count}`);

    return result;
}

let xpathParseCache = {};

function xpathCacheLookup(expr) {
    return xpathParseCache[expr];
}

/*DGF xpathReduce is where the magic happens in this parser.
Skim down to the bottom of this file to find the table of
grammatical rules and precedence numbers, "The productions of the grammar".

The idea here
is that we want to take a stack of tokens and apply
grammatical rules to them, "reducing" them to higher-level
tokens.  Ultimately, any valid XPath should reduce to exactly one
"Expr" token.

Reduce too early or too late and you'll have two tokens that can't reduce
to single Expr.  For example, you may hastily reduce a qname that
should name a function, incorrectly treating it as a tag name.
Or you may reduce too late, accidentally reducing the last part of the
XPath into a top-level "Expr" that won't reduce with earlier parts of
the XPath.

A "cand" is a grammatical rule candidate, with a given precedence
number.  "ahead" is the upcoming token, which also has a precedence
number.  If the token has a higher precedence number than
the rule candidate, we'll "shift" the token onto the token stack,
instead of immediately applying the rule candidate.

Some tokens have left associativity, in which case we shift when they
have LOWER precedence than the candidate.
*/
function xpathReduce(stack, ahead, xpathLog) {
    let cand = null;

    if (stack.length > 0) {
        const top = stack[stack.length - 1];
        const ruleset = xpathRules[top.tag.key];

        if (ruleset) {
            for (let i = 0; i < ruleset.length; ++i) {
                const rule = ruleset[i];
                const match = xpathMatchStack(stack, rule[1]);
                if (match.length) {
                    cand = {
                        tag: rule[0],
                        rule,
                        match
                    };
                    cand.prec = xpathGrammarPrecedence(cand);
                    break;
                }
            }
        }
    }

    let ret;
    if (cand && (!ahead || cand.prec > ahead.prec ||
            (ahead.tag.left && cand.prec >= ahead.prec))) {
        for (let i = 0; i < cand.match.matchlength; ++i) {
            stack.pop();
        }

        xpathLog(`reduce ${cand.tag.label} ${cand.prec} ahead ${ahead ? ahead.tag.label + ' ' + ahead.prec +
                      (ahead.tag.left ? ' left' : '')
                      : ' none '}`);

        const matchexpr = mapExpr(cand.match, m => m.expr);
        xpathLog(`going to apply ${toString(cand.rule[3])}`);
        cand.expr = cand.rule[3].apply(null, matchexpr);

        stack.push(cand);
        ret = true;

    } else {
        if (ahead) {
            xpathLog(`shift ${ahead.tag.label} ${ahead.prec}${ahead.tag.left ? ' left' : ''} over ${cand ? cand.tag.label + ' ' +
                     cand.prec : ' none'}`);
            stack.push(ahead);
        }
        ret = false;
    }
    return ret;
}

function xpathMatchStack(stack, pattern) {
    // NOTE(mesch): The stack matches for variable cardinality are
    // greedy but don't do backtracking. This would be an issue only
    // with rules of the form A* A, i.e. with an element with variable
    // cardinality followed by the same element. Since that doesn't
    // occur in the grammar at hand, all matches on the stack are
    // unambiguous.

    const S = stack.length;
    const P = pattern.length;
    let p;
    let s;
    const match = [];
    match.matchlength = 0;
    let ds = 0;
    for (p = P - 1, s = S - 1; p >= 0 && s >= 0; --p, s -= ds) {
        ds = 0;
        const qmatch = [];
        if (pattern[p] == Q_MM) {
            p -= 1;
            match.push(qmatch);
            while (s - ds >= 0 && stack[s - ds].tag == pattern[p]) {
                qmatch.push(stack[s - ds]);
                ds += 1;
                match.matchlength += 1;
            }

        } else if (pattern[p] == Q_01) {
            p -= 1;
            match.push(qmatch);
            while (s - ds >= 0 && ds < 2 && stack[s - ds].tag == pattern[p]) {
                qmatch.push(stack[s - ds]);
                ds += 1;
                match.matchlength += 1;
            }

        } else if (pattern[p] == Q_1M) {
            p -= 1;
            match.push(qmatch);
            if (stack[s].tag == pattern[p]) {
                while (s - ds >= 0 && stack[s - ds].tag == pattern[p]) {
                    qmatch.push(stack[s - ds]);
                    ds += 1;
                    match.matchlength += 1;
                }
            } else {
                return [];
            }

        } else if (stack[s].tag == pattern[p]) {
            match.push(stack[s]);
            ds += 1;
            match.matchlength += 1;

        } else {
            return [];
        }

        reverseInplace(qmatch);
        qmatch.expr = mapExpr(qmatch, m => m.expr);
    }

    reverseInplace(match);

    if (p == -1) {
        return match;

    } else {
        return [];
    }
}

function xpathTokenPrecedence(tag) {
    return tag.prec || 2;
}

function xpathGrammarPrecedence(frame) {
    let ret = 0;

    if (frame.rule) { /* normal reduce */
        if (frame.rule.length >= 3 && frame.rule[2] >= 0) {
            ret = frame.rule[2];

        } else {
            for (let i = 0; i < frame.rule[1].length; ++i) {
                let p = xpathTokenPrecedence(frame.rule[1][i]);
                ret = Math.max(ret, p);
            }
        }
    } else if (frame.tag) { /* TOKEN match */
        ret = xpathTokenPrecedence(frame.tag);

    } else if (frame.length) { /* Q_ match */
        for (let j = 0; j < frame.length; ++j) {
            let p = xpathGrammarPrecedence(frame[j]);
            ret = Math.max(ret, p);
        }
    }

    return ret;
}

function stackToString(stack) {
    let ret = '';
    for (let i = 0; i < stack.length; ++i) {
        if (ret) {
            ret += '\n';
        }
        ret += stack[i].tag.label;
    }
    return ret;
}


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

export class ExprContext {
    constructor(
        node,
        opt_position,
        opt_nodelist,
        opt_parent,
        opt_caseInsensitive,
        opt_ignoreAttributesWithoutValue,
        opt_returnOnFirstMatch,
        opt_ignoreNonElementNodesForNTA) {
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

    clone(opt_node, opt_position, opt_nodelist) {
        return new ExprContext(
            opt_node || this.node,
            typeof opt_position != 'undefined' ? opt_position : this.position,
            opt_nodelist || this.nodelist, this, this.caseInsensitive,
            this.ignoreAttributesWithoutValue, this.returnOnFirstMatch,
            this.ignoreNonElementNodesForNTA);
    }

    setVariable(name, value) {
        if (value instanceof StringValue || value instanceof BooleanValue ||
            value instanceof NumberValue || value instanceof NodeSetValue) {
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
        return this.caseInsensitive = caseInsensitive;
    }

    isIgnoreAttributesWithoutValue() {
        return this.ignoreAttributesWithoutValue;
    }

    setIgnoreAttributesWithoutValue(ignore) {
        return this.ignoreAttributesWithoutValue = ignore;
    }

    isReturnOnFirstMatch() {
        return this.returnOnFirstMatch;
    }

    setReturnOnFirstMatch(returnOnFirstMatch) {
        return this.returnOnFirstMatch = returnOnFirstMatch;
    }

    isIgnoreNonElementNodesForNTA() {
        return this.ignoreNonElementNodesForNTA;
    }

    setIgnoreNonElementNodesForNTA(ignoreNonElementNodesForNTA) {
        return this.ignoreNonElementNodesForNTA = ignoreNonElementNodesForNTA;
    }
}

// XPath expression values. They are what XPath expressions evaluate
// to. Strangely, the different value types are not specified in the
// XPath syntax, but only in the semantics, so they don't show up as
// nonterminals in the grammar. Yet, some expressions are required to
// evaluate to particular types, and not every type can be coerced
// into every other type. Although the types of XPath values are
// similar to the types present in JavaScript, the type coercion rules
// are a bit peculiar, so we explicitly model XPath types instead of
// mapping them onto JavaScript types. (See XPath spec.)
//
// The four types are:
//
//   StringValue
//
//   NumberValue
//
//   BooleanValue
//
//   NodeSetValue
//
// The common interface of the value classes consists of methods that
// implement the XPath type coercion rules:
//
//   stringValue() -- returns the value as a JavaScript String,
//
//   numberValue() -- returns the value as a JavaScript Number,
//
//   booleanValue() -- returns the value as a JavaScript Boolean,
//
//   nodeSetValue() -- returns the value as a JavaScript Array of DOM
//   Node objects.
//

export class StringValue {
    constructor(value) {
        this.value = value;
        this.type = 'string';
    }

    stringValue() {
        return this.value;
    }

    booleanValue() {
        return this.value.length > 0;
    }

    numberValue() {
        return this.value - 0;
    }

    nodeSetValue() {
        throw this;
    }
}

export class BooleanValue {
    constructor(value) {
        this.value = value;
        this.type = 'boolean';
    }

    stringValue() {
        return `${this.value}`;
    }

    booleanValue() {
        return this.value;
    }

    numberValue() {
        return this.value ? 1 : 0;
    }

    nodeSetValue() {
        throw this;
    }
}

export class NumberValue {
    constructor(value) {
        this.value = value;
        this.type = 'number';
    }

    stringValue() {
        return `${this.value}`;
    }

    booleanValue() {
        return !!this.value;
    }

    numberValue() {
        return this.value - 0;
    }

    nodeSetValue() {
        throw this;
    }
}

export class NodeSetValue {
    constructor(value) {
        this.value = value;
        this.type = 'node-set';
    }

    stringValue() {
        if (this.value.length == 0) {
            return '';
        } else {
            return xmlValue(this.value[0]);
        }
    }

    booleanValue() {
        return this.value.length > 0;
    }

    numberValue() {
        return this.stringValue() - 0;
    }

    nodeSetValue() {
        return this.value;
    }
}

// XPath expressions. They are used as nodes in the parse tree and
// possess an evaluate() method to compute an XPath value given an XPath
// context. Expressions are returned from the parser. Teh set of
// expression classes closely mirrors the set of non terminal symbols
// in the grammar. Every non trivial nonterminal symbol has a
// corresponding expression class.
//
// The common expression interface consists of the following methods:
//
// evaluate(context) -- evaluates the expression, returns a value.
//
// toString(expr) -- returns the XPath text representation of the
// expression (defined in xsltdebug.js).
//
// parseTree(expr, indent) -- returns a parse tree representation of the
// expression (defined in xsltdebug.js).

export class TokenExpr {
    constructor(m) {
        this.value = m;
    }

    evaluate() {
        return new StringValue(this.value);
    }
}

export class LocationExpr {
    constructor() {
        this.absolute = false;
        this.steps = [];
    }

    appendStep(s) {
        const combinedStep = this._combineSteps(this.steps[this.steps.length - 1], s);
        if (combinedStep) {
            this.steps[this.steps.length - 1] = combinedStep;
        } else {
            this.steps.push(s);
        }
    }

    prependStep(s) {
        const combinedStep = this._combineSteps(s, this.steps[0]);
        if (combinedStep) {
            this.steps[0] = combinedStep;
        } else {
            this.steps.unshift(s);
        }
    }

    // DGF try to combine two steps into one step (perf enhancement)
    _combineSteps(prevStep, nextStep) {
        if (!prevStep) return null;
        if (!nextStep) return null;
        const hasPredicates = (prevStep.predicates && prevStep.predicates.length > 0);
        if (prevStep.nodetest instanceof NodeTestAny && !hasPredicates) {
            // maybe suitable to be combined
            if (prevStep.axis == xpathAxis.DESCENDANT_OR_SELF) {
                if (nextStep.axis == xpathAxis.CHILD) {
                    // HBC - commenting out, because this is not a valid reduction
                    //nextStep.axis = xpathAxis.DESCENDANT;
                    //return nextStep;
                } else if (nextStep.axis == xpathAxis.SELF) {
                    nextStep.axis = xpathAxis.DESCENDANT_OR_SELF;
                    return nextStep;
                }
            } else if (prevStep.axis == xpathAxis.DESCENDANT) {
                if (nextStep.axis == xpathAxis.SELF) {
                    nextStep.axis = xpathAxis.DESCENDANT;
                    return nextStep;
                }
            }
        }
        return null;
    }

    evaluate(ctx) {
        let start;
        if (this.absolute) {
            start = ctx.root;

        } else {
            start = ctx.node;
        }

        const nodes = [];
        xPathStep(nodes, this.steps, 0, start, ctx);
        return new NodeSetValue(nodes);
    }
}

function xPathStep(nodes, steps, step, input, ctx) {
    const s = steps[step];
    const ctx2 = ctx.clone(input);

    if (ctx.returnOnFirstMatch && !s.hasPositionalPredicate) {
        let nodelist = s.evaluate(ctx2).nodeSetValue();
        // the predicates were not processed in the last evaluate(), so that we can
        // process them here with the returnOnFirstMatch optimization. We do a
        // depth-first grab at any nodes that pass the predicate tests. There is no
        // way to optimize when predicates contain positional selectors, including
        // indexes or uses of the last() or position() functions, because they
        // typically require the entire nodelist for context. Process without
        // optimization if we encounter such selectors.
        const nLength = nodelist.length;
        const pLength = s.predicate.length;
        nodelistLoop:
            for (let i = 0; i < nLength; ++i) {
                const n = nodelist[i];
                for (let j = 0; j < pLength; ++j) {
                    if (!s.predicate[j].evaluate(ctx.clone(n, i, nodelist)).booleanValue()) {
                        continue nodelistLoop;
                    }
                }
                // n survived the predicate tests!
                if (step == steps.length - 1) {
                    nodes.push(n);
                } else {
                    xPathStep(nodes, steps, step + 1, n, ctx);
                }
                if (nodes.length > 0) {
                    break;
                }
            }
    } else {
        // set returnOnFirstMatch to false for the cloned ExprContext, because
        // behavior in StepExpr.prototype.evaluate is driven off its value. Note
        // that the original context may still have true for this value.
        ctx2.returnOnFirstMatch = false;
        let nodelist = s.evaluate(ctx2).nodeSetValue();
        for (let i = 0; i < nodelist.length; ++i) {
            if (step == steps.length - 1) {
                nodes.push(nodelist[i]);
            } else {
                xPathStep(nodes, steps, step + 1, nodelist[i], ctx);
            }
        }
    }
}

export class StepExpr {
    constructor(axis, nodetest, opt_predicate) {
        this.axis = axis;
        this.nodetest = nodetest;
        this.predicate = opt_predicate || [];
        this.hasPositionalPredicate = false;
        for (let i = 0; i < this.predicate.length; ++i) {
            if (predicateExprHasPositionalSelector(this.predicate[i].expr)) {
                this.hasPositionalPredicate = true;
                break;
            }
        }
    }

    appendPredicate(p) {
        this.predicate.push(p);
        if (!this.hasPositionalPredicate) {
            this.hasPositionalPredicate = predicateExprHasPositionalSelector(p.expr);
        }
    }

    evaluate(ctx) {
        const input = ctx.node;
        let nodelist = [];
        let skipNodeTest = false;

        if (this.nodetest instanceof NodeTestAny) {
            skipNodeTest = true;
        }

        if (this.axis == xpathAxis.ANCESTOR_OR_SELF) {
            nodelist.push(input);
            for (let n = input.parentNode; n; n = n.parentNode) {
                nodelist.push(n);
            }

        } else if (this.axis == xpathAxis.ANCESTOR) {
            for (let n = input.parentNode; n; n = n.parentNode) {
                nodelist.push(n);
            }

        } else if (this.axis == xpathAxis.ATTRIBUTE) {
            if (this.nodetest.name != undefined) {
                // single-attribute step
                if (input.attributes) {
                    if (input.attributes instanceof Array) {
                        // probably evaluating on document created by xmlParse()
                        copyArray(nodelist, input.attributes);
                    } else {
                        if (this.nodetest.name == 'style') {
                            const value = input.getAttribute('style');
                            if (value && typeof(value) != 'string') {
                                // this is the case where indexing into the attributes array
                                // doesn't give us the attribute node in IE - we create our own
                                // node instead
                                nodelist.push(XNode.create(DOM_ATTRIBUTE_NODE, 'style',
                                    value.cssText, document));
                            } else {
                                nodelist.push(input.attributes[this.nodetest.name]);
                            }
                        } else {
                            nodelist.push(input.attributes[this.nodetest.name]);
                        }
                    }
                }
            } else {
                // all-attributes step
                if (ctx.ignoreAttributesWithoutValue) {
                    copyArrayIgnoringAttributesWithoutValue(nodelist, input.attributes);
                } else {
                    copyArray(nodelist, input.attributes);
                }
            }

        } else if (this.axis == xpathAxis.CHILD) {
            copyArray(nodelist, input.childNodes);

        } else if (this.axis == xpathAxis.DESCENDANT_OR_SELF) {
            if (this.nodetest.evaluate(ctx).booleanValue()) {
                nodelist.push(input);
            }
            let tagName = xpathExtractTagNameFromNodeTest(this.nodetest, ctx.ignoreNonElementNodesForNTA);
            xpathCollectDescendants(nodelist, input, tagName);
            if (tagName) skipNodeTest = true;

        } else if (this.axis == xpathAxis.DESCENDANT) {
            let tagName = xpathExtractTagNameFromNodeTest(this.nodetest, ctx.ignoreNonElementNodesForNTA);
            xpathCollectDescendants(nodelist, input, tagName);
            if (tagName) skipNodeTest = true;

        } else if (this.axis == xpathAxis.FOLLOWING) {
            for (let n = input; n; n = n.parentNode) {
                for (let nn = n.nextSibling; nn; nn = nn.nextSibling) {
                    nodelist.push(nn);
                    xpathCollectDescendants(nodelist, nn);
                }
            }

        } else if (this.axis == xpathAxis.FOLLOWING_SIBLING) {
            for (let n = input.nextSibling; n; n = n.nextSibling) {
                nodelist.push(n);
            }

        } else if (this.axis == xpathAxis.NAMESPACE) {
            throw('not implemented: axis namespace');

        } else if (this.axis == xpathAxis.PARENT) {
            if (input.parentNode) {
                nodelist.push(input.parentNode);
            }

        } else if (this.axis == xpathAxis.PRECEDING) {
            for (let n = input; n; n = n.parentNode) {
                for (let nn = n.previousSibling; nn; nn = nn.previousSibling) {
                    nodelist.push(nn);
                    xpathCollectDescendantsReverse(nodelist, nn);
                }
            }

        } else if (this.axis == xpathAxis.PRECEDING_SIBLING) {
            for (let n = input.previousSibling; n; n = n.previousSibling) {
                nodelist.push(n);
            }

        } else if (this.axis == xpathAxis.SELF) {
            nodelist.push(input);

        } else {
            throw `ERROR -- NO SUCH AXIS: ${this.axis}`;
        }

        if (!skipNodeTest) {
            // process node test
            let nodelist0 = nodelist;
            nodelist = [];
            for (let i = 0; i < nodelist0.length; ++i) {
                let n = nodelist0[i];
                if (this.nodetest.evaluate(ctx.clone(n, i, nodelist0)).booleanValue()) {
                    nodelist.push(n);
                }
            }
        }

        // process predicates
        if (!ctx.returnOnFirstMatch) {
            for (let i = 0; i < this.predicate.length; ++i) {
                let nodelist0 = nodelist;
                nodelist = [];
                for (let ii = 0; ii < nodelist0.length; ++ii) {
                    let n = nodelist0[ii];
                    if (this.predicate[i].evaluate(ctx.clone(n, ii, nodelist0)).booleanValue()) {
                        nodelist.push(n);
                    }
                }
            }
        }

        return new NodeSetValue(nodelist);
    }
}

export class NodeTestAny {
    constructor() {
        this.value = new BooleanValue(true);
    }

    evaluate() {
        return this.value;
    }
}

export class NodeTestElementOrAttribute {
    evaluate(ctx) {
        return new BooleanValue(
            ctx.node.nodeType == DOM_ELEMENT_NODE ||
            ctx.node.nodeType == DOM_ATTRIBUTE_NODE);
    }
}

export class NodeTestText {
    evaluate(ctx) {
        return new BooleanValue(ctx.node.nodeType == DOM_TEXT_NODE);
    }
}

export class NodeTestComment {
    evaluate(ctx) {
        return new BooleanValue(ctx.node.nodeType == DOM_COMMENT_NODE);
    }
}

export class NodeTestPI {
    constructor(target) {
        this.target = target;
    }

    evaluate(ctx) {
        return new
        BooleanValue(ctx.node.nodeType == DOM_PROCESSING_INSTRUCTION_NODE &&
            (!this.target || ctx.node.nodeName == this.target));
    }
}

export class NodeTestNC {
    constructor(nsprefix) {
        this.regex = new RegExp(`^${nsprefix}:`);
        this.nsprefix = nsprefix;
    }

    evaluate(ctx) {
        const n = ctx.node;
        return new BooleanValue(this.regex.match(n.nodeName));
    }
}

export class NodeTestName {
    constructor(name) {
        this.name = name;
        this.re = new RegExp(`^${name}$`, "i");
    }

    evaluate(ctx) {
        const n = ctx.node;
        if (ctx.caseInsensitive) {
            if (n.nodeName.length != this.name.length) return new BooleanValue(false);
            return new BooleanValue(this.re.test(n.nodeName));
        } else {
            return new BooleanValue(n.nodeName == this.name);
        }
    }
}

export class PredicateExpr {
    constructor(expr) {
        this.expr = expr;
    }

    evaluate(ctx) {
        const v = this.expr.evaluate(ctx);
        if (v.type == 'number') {
            // NOTE(mesch): Internally, position is represented starting with
            // 0, however in XPath position starts with 1. See functions
            // position() and last().
            return new BooleanValue(ctx.position == v.numberValue() - 1);
        } else {
            return new BooleanValue(v.booleanValue());
        }
    }
}

let xpathfunctions = {
    'last' (ctx) {
        assert(this.args.length == 0);
        // NOTE(mesch): XPath position starts at 1.
        return new NumberValue(ctx.contextSize());
    },

    'position' (ctx) {
        assert(this.args.length == 0);
        // NOTE(mesch): XPath position starts at 1.
        return new NumberValue(ctx.position + 1);
    },

    'count' (ctx) {
        assert(this.args.length == 1);
        const v = this.args[0].evaluate(ctx);
        return new NumberValue(v.nodeSetValue().length);
    },

    'generate-id' (_ctx) {
        throw('not implmented yet: XPath function generate-id()');
    },

    'id' (ctx) {
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
        return new StringValue(
            JSON.stringify( (!this.args.length)? 'null': xmlValue(ctx.node)
            )
        );
    },
    'local-name' (ctx) {
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
            return new StringValue(n[0].nodeName.replace(/^[^:]+:/, ''));
        }
    },

    'namespace-uri' () {
        throw('not implemented yet: XPath function namespace-uri()');
    },

    'name' (ctx) {
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

    'string' (ctx) {
        assert(this.args.length == 1 || this.args.length == 0);
        if (this.args.length == 0) {
            return new StringValue(new NodeSetValue([ctx.node]).stringValue());
        } else {
            return new StringValue(this.args[0].evaluate(ctx).stringValue());
        }
    },

    'concat' (ctx) {
        let ret = '';
        for (let i = 0; i < this.args.length; ++i) {
            ret += this.args[i].evaluate(ctx).stringValue();
        }
        return new StringValue(ret);
    },

    'starts-with' (ctx) {
        assert(this.args.length == 2);
        const s0 = this.args[0].evaluate(ctx).stringValue();
        const s1 = this.args[1].evaluate(ctx).stringValue();
        return new BooleanValue(s0.indexOf(s1) == 0);
    },

    'ends-with' (ctx) {
        assert(this.args.length == 2);
        const s0 = this.args[0].evaluate(ctx).stringValue();
        const s1 = this.args[1].evaluate(ctx).stringValue();
        const re = new RegExp(`${regExpEscape(s1)}$`);
        return new BooleanValue(re.test(s0));
    },

    'contains' (ctx) {
        assert(this.args.length == 2);
        const s0 = this.args[0].evaluate(ctx).stringValue();
        const s1 = this.args[1].evaluate(ctx).stringValue();
        return new BooleanValue(s0.includes(s1));
    },

    'substring-before' (ctx) {
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

    'substring-after' (ctx) {
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

    'substring' (ctx) {
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

    'string-length' (ctx) {
        let s;
        if (this.args.length > 0) {
            s = this.args[0].evaluate(ctx).stringValue();
        } else {
            s = new NodeSetValue([ctx.node]).stringValue();
        }
        return new NumberValue(s.length);
    },

    'normalize-space' (ctx) {
        let s;
        if (this.args.length > 0) {
            s = this.args[0].evaluate(ctx).stringValue();
        } else {
            s = new NodeSetValue([ctx.node]).stringValue();
        }
        s = s.replace(/^\s*/, '').replace(/\s*$/, '').replace(/\s+/g, ' ');
        return new StringValue(s);
    },

    'translate' (ctx) {
        assert(this.args.length == 3);
        let s0 = this.args[0].evaluate(ctx).stringValue();
        const s1 = this.args[1].evaluate(ctx).stringValue();
        const s2 = this.args[2].evaluate(ctx).stringValue();

        for (let i = 0; i < s1.length; ++i) {
            s0 = s0.replace(new RegExp(s1.charAt(i), 'g'), s2.charAt(i));
        }
        return new StringValue(s0);
    },

    'matches' (ctx) {
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

    'boolean' (ctx) {
        assert(this.args.length == 1);
        return new BooleanValue(this.args[0].evaluate(ctx).booleanValue());
    },

    'not' (ctx) {
        assert(this.args.length == 1);
        const ret = !this.args[0].evaluate(ctx).booleanValue();
        return new BooleanValue(ret);
    },

    'true' () {
        assert(this.args.length == 0);
        return new BooleanValue(true);
    },

    'false' () {
        assert(this.args.length == 0);
        return new BooleanValue(false);
    },

    'lang' (ctx) {
        assert(this.args.length == 1);
        const lang = this.args[0].evaluate(ctx).stringValue();
        let xmllang;
        let n = ctx.node;
        while (n && n != n.parentNode /* just in case ... */ ) {
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
            return new BooleanValue(xmllang.match(re) ||
                xmllang.replace(/_.*$/, '').match(re));
        }
    },

    'number' (ctx) {
        assert(this.args.length == 1 || this.args.length == 0);

        if (this.args.length == 1) {
            return new NumberValue(this.args[0].evaluate(ctx).numberValue());
        } else {
            return new NumberValue(new NodeSetValue([ctx.node]).numberValue());
        }
    },

    'sum' (ctx) {
        assert(this.args.length == 1);
        const n = this.args[0].evaluate(ctx).nodeSetValue();
        let sum = 0;
        for (let i = 0; i < n.length; ++i) {
            sum += xmlValue(n[i]) - 0;
        }
        return new NumberValue(sum);
    },

    'floor' (ctx) {
        assert(this.args.length == 1);
        const num = this.args[0].evaluate(ctx).numberValue();
        return new NumberValue(Math.floor(num));
    },

    'ceiling' (ctx) {
        assert(this.args.length == 1);
        const num = this.args[0].evaluate(ctx).numberValue();
        return new NumberValue(Math.ceil(num));
    },

    'round' (ctx) {
        assert(this.args.length == 1);
        const num = this.args[0].evaluate(ctx).numberValue();
        return new NumberValue(Math.round(num));
    },

    // TODO(mesch): The following functions are custom. There is a
    // standard that defines how to add functions, which should be
    // applied here.

    'ext-join' (ctx) {
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

    'ext-if' (ctx) {
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

    'ext-cardinal' (ctx) {
        assert(this.args.length >= 1);
        const c = this.args[0].evaluate(ctx).numberValue();
        const ret = [];
        for (let i = 0; i < c; ++i) {
            ret.push(ctx.node);
        }
        return new NodeSetValue(ret);
    }
};

export class FunctionCallExpr {
    constructor(name) {
        this.name = name;
        this.args = [];
    }

    appendArg(arg) {
        this.args.push(arg);
    }

    evaluate(ctx) {
        const fn = `${this.name.value}`;
        const f = xpathfunctions[fn];
        if (f) {
            return f.call(this, ctx);
        } else {
            return new BooleanValue(false);
        }
    }
}

export class UnionExpr {
    constructor(expr1, expr2) {
        this.expr1 = expr1;
        this.expr2 = expr2;
    }

    evaluate(ctx) {
        const nodes1 = this.expr1.evaluate(ctx).nodeSetValue();
        const nodes2 = this.expr2.evaluate(ctx).nodeSetValue();
        const I1 = nodes1.length;

        for (const n of nodes2) {
            let inBoth = false;
            for (let i1 = 0; i1 < I1; ++i1) {
                if (nodes1[i1] == n) {
                    inBoth = true;
                    i1 = I1; // break inner loop
                }
            }
            if (!inBoth) {
                nodes1.push(n);
            }
        }

        return new NodeSetValue(nodes1);
    }
}

export class PathExpr {
    constructor(filter, rel) {
        this.filter = filter;
        this.rel = rel;
    }

    evaluate(ctx) {
        const nodes = this.filter.evaluate(ctx).nodeSetValue();
        let nodes1 = [];
        if (ctx.returnOnFirstMatch) {
            for (let i = 0; i < nodes.length; ++i) {
                nodes1 = this.rel.evaluate(ctx.clone(nodes[i], i, nodes)).nodeSetValue();
                if (nodes1.length > 0) {
                    break;
                }
            }
            return new NodeSetValue(nodes1);
        } else {
            for (let i = 0; i < nodes.length; ++i) {
                const nodes0 = this.rel.evaluate(ctx.clone(nodes[i], i, nodes)).nodeSetValue();
                for (let ii = 0; ii < nodes0.length; ++ii) {
                    nodes1.push(nodes0[ii]);
                }
            }
            return new NodeSetValue(nodes1);
        }
    }
}

export class FilterExpr {
    constructor(expr, predicate) {
        this.expr = expr;
        this.predicate = predicate;
    }

    evaluate(ctx) {
        // the filter expression should be evaluated in its entirety with no
        // optimization, as we can't backtrack to it after having moved on to
        // evaluating the relative location path. See the testReturnOnFirstMatch
        // unit test.
        const flag = ctx.returnOnFirstMatch;
        ctx.setReturnOnFirstMatch(false);
        let nodes = this.expr.evaluate(ctx).nodeSetValue();
        ctx.setReturnOnFirstMatch(flag);

        for (let i = 0; i < this.predicate.length; ++i) {
            const nodes0 = nodes;
            nodes = [];
            for (let j = 0; j < nodes0.length; ++j) {
                const n = nodes0[j];
                if (this.predicate[i].evaluate(ctx.clone(n, j, nodes0)).booleanValue()) {
                    nodes.push(n);
                }
            }
        }

        return new NodeSetValue(nodes);
    }
}

export class UnaryMinusExpr {
    constructor(expr) {
        this.expr = expr;
    }

    evaluate(ctx) {
        return new NumberValue(-this.expr.evaluate(ctx).numberValue());
    }
}

export class BinaryExpr {
    constructor(expr1, op, expr2) {
        this.expr1 = expr1;
        this.expr2 = expr2;
        this.op = op;
    }

    evaluate(ctx) {
        let ret;
        switch (this.op.value) {
            case 'or':
                ret = new BooleanValue(this.expr1.evaluate(ctx).booleanValue() ||
                    this.expr2.evaluate(ctx).booleanValue());
                break;

            case 'and':
                ret = new BooleanValue(this.expr1.evaluate(ctx).booleanValue() &&
                    this.expr2.evaluate(ctx).booleanValue());
                break;

            case '+':
                ret = new NumberValue(this.expr1.evaluate(ctx).numberValue() +
                    this.expr2.evaluate(ctx).numberValue());
                break;

            case '-':
                ret = new NumberValue(this.expr1.evaluate(ctx).numberValue() -
                    this.expr2.evaluate(ctx).numberValue());
                break;

            case '*':
                ret = new NumberValue(this.expr1.evaluate(ctx).numberValue() *
                    this.expr2.evaluate(ctx).numberValue());
                break;

            case 'mod':
                ret = new NumberValue(this.expr1.evaluate(ctx).numberValue() %
                    this.expr2.evaluate(ctx).numberValue());
                break;

            case 'div':
                ret = new NumberValue(this.expr1.evaluate(ctx).numberValue() /
                    this.expr2.evaluate(ctx).numberValue());
                break;

            case '=':
                ret = this.compare(ctx, (x1, x2) => x1 == x2);
                break;

            case '!=':
                ret = this.compare(ctx, (x1, x2) => x1 != x2);
                break;

            case '<':
                ret = this.compare(ctx, (x1, x2) => x1 < x2);
                break;

            case '<=':
                ret = this.compare(ctx, (x1, x2) => x1 <= x2);
                break;

            case '>':
                ret = this.compare(ctx, (x1, x2) => x1 > x2);
                break;

            case '>=':
                ret = this.compare(ctx, (x1, x2) => x1 >= x2);
                break;

            default:
                throw(`BinaryExpr.evaluate: ${this.op.value}`);
        }
        return ret;
    }

    compare(ctx, cmp) {
        const v1 = this.expr1.evaluate(ctx);
        const v2 = this.expr2.evaluate(ctx);

        let ret;
        if (v1.type == 'node-set' && v2.type == 'node-set') {
            const n1 = v1.nodeSetValue();
            const n2 = v2.nodeSetValue();
            ret = false;
            for (let i1 = 0; i1 < n1.length; ++i1) {
                for (let i2 = 0; i2 < n2.length; ++i2) {
                    if (cmp(xmlValue(n1[i1]), xmlValue(n2[i2]))) {
                        ret = true;
                        // Break outer loop. Labels confuse the jscompiler and we
                        // don't use them.
                        i2 = n2.length;
                        i1 = n1.length;
                    }
                }
            }

        } else if (v1.type == 'node-set' || v2.type == 'node-set') {

            if (v1.type == 'number') {
                let s = v1.numberValue();
                let n = v2.nodeSetValue();

                ret = false;
                for (let i = 0; i < n.length; ++i) {
                    let nn = xmlValue(n[i]) - 0;
                    if (cmp(s, nn)) {
                        ret = true;
                        break;
                    }
                }

            } else if (v2.type == 'number') {
                let n = v1.nodeSetValue();
                let s = v2.numberValue();

                ret = false;
                for (let i = 0; i < n.length; ++i) {
                    let nn = xmlValue(n[i]) - 0;
                    if (cmp(nn, s)) {
                        ret = true;
                        break;
                    }
                }

            } else if (v1.type == 'string') {
                let s = v1.stringValue();
                let n = v2.nodeSetValue();

                ret = false;
                for (let i = 0; i < n.length; ++i) {
                    let nn = xmlValue(n[i]);
                    if (cmp(s, nn)) {
                        ret = true;
                        break;
                    }
                }

            } else if (v2.type == 'string') {
                let n = v1.nodeSetValue();
                let s = v2.stringValue();

                ret = false;
                for (let i = 0; i < n.length; ++i) {
                    let nn = xmlValue(n[i]);
                    if (cmp(nn, s)) {
                        ret = true;
                        break;
                    }
                }

            } else {
                ret = cmp(v1.booleanValue(), v2.booleanValue());
            }

        } else if (v1.type == 'boolean' || v2.type == 'boolean') {
            ret = cmp(v1.booleanValue(), v2.booleanValue());

        } else if (v1.type == 'number' || v2.type == 'number') {
            ret = cmp(v1.numberValue(), v2.numberValue());

        } else {
            ret = cmp(v1.stringValue(), v2.stringValue());
        }

        return new BooleanValue(ret);
    }
}

export class LiteralExpr {
    constructor(value) {
        this.value = value;
    }

    evaluate() {
        return new StringValue(this.value);
    }
}

export class NumberExpr {
    constructor(value) {
        this.value = value;
    }

    evaluate() {
        return new NumberValue(this.value);
    }
}

export class VariableExpr {
    constructor(name) {
        this.name = name;
    }

    evaluate(ctx) {
        return ctx.getVariable(this.name);
    }
}

// Factory functions for semantic values (i.e. Expressions) of the
// productions in the grammar. When a production is matched to reduce
// the current parse state stack, the function is called with the
// semantic values of the matched elements as arguments, and returns
// another semantic value. The semantic value is a node of the parse
// tree, an expression object with an evaluate() method that evaluates the
// expression in an actual context. These factory functions are used
// in the specification of the grammar rules, below.

function makeTokenExpr(m) {
    return new TokenExpr(m);
}

function passExpr(e) {
    return e;
}

function makeLocationExpr1(slash, rel) {
    rel.absolute = true;
    return rel;
}

function makeLocationExpr2(dslash, rel) {
    rel.absolute = true;
    rel.prependStep(makeAbbrevStep(dslash.value));
    return rel;
}

function makeLocationExpr3() {
    const ret = new LocationExpr();
    ret.appendStep(makeAbbrevStep('.'));
    ret.absolute = true;
    return ret;
}

function makeLocationExpr4(dslash) {
    const ret = new LocationExpr();
    ret.absolute = true;
    ret.appendStep(makeAbbrevStep(dslash.value));
    return ret;
}

function makeLocationExpr5(step) {
    const ret = new LocationExpr();
    ret.appendStep(step);
    return ret;
}

function makeLocationExpr6(rel, slash, step) {
    rel.appendStep(step);
    return rel;
}

function makeLocationExpr7(rel, dslash, step) {
    rel.appendStep(makeAbbrevStep(dslash.value));
    rel.appendStep(step);
    return rel;
}

function makeStepExpr1(dot) {
    return makeAbbrevStep(dot.value);
}

function makeStepExpr2(ddot) {
    return makeAbbrevStep(ddot.value);
}

function makeStepExpr3(axisname, axis, nodetest) {
    return new StepExpr(axisname.value, nodetest);
}

function makeStepExpr4(at, nodetest) {
    return new StepExpr('attribute', nodetest);
}

function makeStepExpr5(nodetest) {
    return new StepExpr('child', nodetest);
}

function makeStepExpr6(step, predicate) {
    step.appendPredicate(predicate);
    return step;
}

function makeAbbrevStep(abbrev) {
    switch (abbrev) {
        case '//':
            return new StepExpr('descendant-or-self', new NodeTestAny);

        case '.':
            return new StepExpr('self', new NodeTestAny);

        case '..':
            return new StepExpr('parent', new NodeTestAny);
    }
}

function makeNodeTestExpr1() {
    return new NodeTestElementOrAttribute;
}

function makeNodeTestExpr2(ncname) {
    return new NodeTestNC(ncname.value);
}

function makeNodeTestExpr3(qname) {
    return new NodeTestName(qname.value);
}

function makeNodeTestExpr4(typeo) {
    const type = typeo.value.replace(/\s*\($/, '');
    switch (type) {
        case 'node':
            return new NodeTestAny;

        case 'text':
            return new NodeTestText;

        case 'comment':
            return new NodeTestComment;

        case 'processing-instruction':
            return new NodeTestPI('');
    }
}

function makeNodeTestExpr5(typeo, target) {
    const type = typeo.replace(/\s*\($/, '');
    if (type != 'processing-instruction') {
        throw type;
    }
    return new NodeTestPI(target.value);
}

function makePredicateExpr(pareno, expr) {
    return new PredicateExpr(expr);
}

function makePrimaryExpr(pareno, expr) {
    return expr;
}

function makeFunctionCallExpr1(name) {
    return new FunctionCallExpr(name);
}

function makeFunctionCallExpr2(name, pareno, arg1, args) {
    const ret = new FunctionCallExpr(name);
    ret.appendArg(arg1);
    for (let i = 0; i < args.length; ++i) {
        ret.appendArg(args[i]);
    }
    return ret;
}

function makeArgumentExpr(comma, expr) {
    return expr;
}

function makeUnionExpr(expr1, pipe, expr2) {
    return new UnionExpr(expr1, expr2);
}

function makePathExpr1(filter, slash, rel) {
    return new PathExpr(filter, rel);
}

function makePathExpr2(filter, dslash, rel) {
    rel.prependStep(makeAbbrevStep(dslash.value));
    return new PathExpr(filter, rel);
}

function makeFilterExpr(expr, predicates) {
    if (predicates.length > 0) {
        return new FilterExpr(expr, predicates);
    } else {
        return expr;
    }
}

function makeUnaryMinusExpr(minus, expr) {
    return new UnaryMinusExpr(expr);
}

function makeBinaryExpr(expr1, op, expr2) {
    return new BinaryExpr(expr1, op, expr2);
}

function makeLiteralExpr(token) {
    // remove quotes from the parsed value:
    const value = token.value.substring(1, token.value.length - 1);
    return new LiteralExpr(value);
}

function makeNumberExpr(token) {
    return new NumberExpr(token.value);
}

function makeVariableReference(dollar, name) {
    return new VariableExpr(name.value);
}

// Used before parsing for optimization of common simple cases. See
// the begin of xpathParse() for which they are.
function makeSimpleExpr(expr) {
    if (expr.charAt(0) == '$') {
        return new VariableExpr(expr.substr(1));
    } else if (expr.charAt(0) == '@') {
        let a = new NodeTestName(expr.substr(1));
        let b = new StepExpr('attribute', a);
        let c = new LocationExpr();
        c.appendStep(b);
        return c;
    } else if (expr.match(/^[0-9]+$/)) {
        return new NumberExpr(expr);
    } else {
        let a = new NodeTestName(expr);
        let b = new StepExpr('child', a);
        let c = new LocationExpr();
        c.appendStep(b);
        return c;
    }
}

function makeSimpleExpr2(expr) {
    const steps = expr.split('/');
    const c = new LocationExpr();
    for (let i = 0; i < steps.length; ++i) {
        const a = new NodeTestName(steps[i]);
        const b = new StepExpr('child', a);
        c.appendStep(b);
    }
    return c;
}

// The axes of XPath expressions.

const xpathAxis = {
    ANCESTOR_OR_SELF: 'ancestor-or-self',
    ANCESTOR: 'ancestor',
    ATTRIBUTE: 'attribute',
    CHILD: 'child',
    DESCENDANT_OR_SELF: 'descendant-or-self',
    DESCENDANT: 'descendant',
    FOLLOWING_SIBLING: 'following-sibling',
    FOLLOWING: 'following',
    NAMESPACE: 'namespace',
    PARENT: 'parent',
    PRECEDING_SIBLING: 'preceding-sibling',
    PRECEDING: 'preceding',
    SELF: 'self'
};

const xpathAxesRe = [
    xpathAxis.ANCESTOR_OR_SELF,
    xpathAxis.ANCESTOR,
    xpathAxis.ATTRIBUTE,
    xpathAxis.CHILD,
    xpathAxis.DESCENDANT_OR_SELF,
    xpathAxis.DESCENDANT,
    xpathAxis.FOLLOWING_SIBLING,
    xpathAxis.FOLLOWING,
    xpathAxis.NAMESPACE,
    xpathAxis.PARENT,
    xpathAxis.PRECEDING_SIBLING,
    xpathAxis.PRECEDING,
    xpathAxis.SELF
].join('|');


// The tokens of the language. The label property is just used for
// generating debug output. The prec property is the precedence used
// for shift/reduce resolution. Default precedence is 0 as a lookahead
// token and 2 on the stack. TODO(mesch): this is certainly not
// necessary and too complicated. Simplify this!

// NOTE: tabular formatting is the big exception, but here it should
// be OK.

let TOK_PIPE = {
    label: "|",
    prec: 17,
    re: new RegExp("^\\|")
};
let TOK_DSLASH = {
    label: "//",
    prec: 19,
    re: new RegExp("^//")
};
let TOK_SLASH = {
    label: "/",
    prec: 30,
    re: new RegExp("^/")
};
let TOK_AXIS = {
    label: "::",
    prec: 20,
    re: new RegExp("^::")
};
let TOK_COLON = {
    label: ":",
    prec: 1000,
    re: new RegExp("^:")
};
let TOK_AXISNAME = {
    label: "[axis]",
    re: new RegExp(`^(${xpathAxesRe})`)
};
let TOK_PARENO = {
    label: "(",
    prec: 34,
    re: new RegExp("^\\(")
};
let TOK_PARENC = {
    label: ")",
    re: new RegExp("^\\)")
};
let TOK_DDOT = {
    label: "..",
    prec: 34,
    re: new RegExp("^\\.\\.")
};
let TOK_DOT = {
    label: ".",
    prec: 34,
    re: new RegExp("^\\.")
};
let TOK_AT = {
    label: "@",
    prec: 34,
    re: new RegExp("^@")
};

let TOK_COMMA = {
    label: ",",
    re: new RegExp("^,")
};

let TOK_OR = {
    label: "or",
    prec: 10,
    re: new RegExp("^or\\b")
};
let TOK_AND = {
    label: "and",
    prec: 11,
    re: new RegExp("^and\\b")
};
let TOK_EQ = {
    label: "=",
    prec: 12,
    re: new RegExp("^=")
};
let TOK_NEQ = {
    label: "!=",
    prec: 12,
    re: new RegExp("^!=")
};
let TOK_GE = {
    label: ">=",
    prec: 13,
    re: new RegExp("^>=")
};
let TOK_GT = {
    label: ">",
    prec: 13,
    re: new RegExp("^>")
};
let TOK_LE = {
    label: "<=",
    prec: 13,
    re: new RegExp("^<=")
};
let TOK_LT = {
    label: "<",
    prec: 13,
    re: new RegExp("^<")
};
let TOK_PLUS = {
    label: "+",
    prec: 14,
    re: new RegExp("^\\+"),
    left: true
};
let TOK_MINUS = {
    label: "-",
    prec: 14,
    re: new RegExp("^\\-"),
    left: true
};
let TOK_DIV = {
    label: "div",
    prec: 15,
    re: new RegExp("^div\\b"),
    left: true
};
let TOK_MOD = {
    label: "mod",
    prec: 15,
    re: new RegExp("^mod\\b"),
    left: true
};

let TOK_BRACKO = {
    label: "[",
    prec: 32,
    re: new RegExp("^\\[")
};
let TOK_BRACKC = {
    label: "]",
    re: new RegExp("^\\]")
};
let TOK_DOLLAR = {
    label: "$",
    re: new RegExp("^\\$")
};

let TOK_NCNAME = {
    label: "[ncname]",
    re: new RegExp(`^${XML_NC_NAME}`)
};

let TOK_ASTERISK = {
    label: "*",
    prec: 15,
    re: new RegExp("^\\*"),
    left: true
};
let TOK_LITERALQ = {
    label: "[litq]",
    prec: 20,
    re: new RegExp("^'[^\\']*'")
};
let TOK_LITERALQQ = {
    label: "[litqq]",
    prec: 20,
    re: new RegExp('^"[^\\"]*"')
};

let TOK_NUMBER = {
    label: "[number]",
    prec: 35,
    re: new RegExp('^\\d+(\\.\\d*)?')
};

let TOK_QNAME = {
    label: "[qname]",
    re: new RegExp(`^(${XML_NC_NAME}:)?${XML_NC_NAME}`)
};

let TOK_NODEO = {
    label: "[nodetest-start]",
    re: new RegExp('^(processing-instruction|comment|text|node)\\(')
};

// The table of the tokens of our grammar, used by the lexer: first
// column the tag, second column a regexp to recognize it in the
// input, third column the precedence of the token, fourth column a
// factory function for the semantic value of the token.
//
// NOTE: order of this list is important, because the first match
// counts. Cf. DDOT and DOT, and AXIS and COLON.

const xpathTokenRules = [
    TOK_DSLASH,
    TOK_SLASH,
    TOK_DDOT,
    TOK_DOT,
    TOK_AXIS,
    TOK_COLON,
    TOK_AXISNAME,
    TOK_NODEO,
    TOK_PARENO,
    TOK_PARENC,
    TOK_BRACKO,
    TOK_BRACKC,
    TOK_AT,
    TOK_COMMA,
    TOK_OR,
    TOK_AND,
    TOK_NEQ,
    TOK_EQ,
    TOK_GE,
    TOK_GT,
    TOK_LE,
    TOK_LT,
    TOK_PLUS,
    TOK_MINUS,
    TOK_ASTERISK,
    TOK_PIPE,
    TOK_MOD,
    TOK_DIV,
    TOK_LITERALQ,
    TOK_LITERALQQ,
    TOK_NUMBER,
    TOK_QNAME,
    TOK_NCNAME,
    TOK_DOLLAR
];

// All the nonterminals of the grammar. The nonterminal objects are
// identified by object identity; the labels are used in the debug
// output only.
const XPathLocationPath = {
    label: "LocationPath"
};
const XPathRelativeLocationPath = {
    label: "RelativeLocationPath"
};
const XPathAbsoluteLocationPath = {
    label: "AbsoluteLocationPath"
};
const XPathStep = {
    label: "Step"
};
const XPathNodeTest = {
    label: "NodeTest"
};
const XPathPredicate = {
    label: "Predicate"
};
const XPathLiteral = {
    label: "Literal"
};
const XPathExpr = {
    label: "Expr"
};
const XPathPrimaryExpr = {
    label: "PrimaryExpr"
};
const XPathVariableReference = {
    label: "Variablereference"
};
const XPathNumber = {
    label: "Number"
};
const XPathFunctionCall = {
    label: "FunctionCall"
};
const XPathArgumentRemainder = {
    label: "ArgumentRemainder"
};
const XPathPathExpr = {
    label: "PathExpr"
};
const XPathUnionExpr = {
    label: "UnionExpr"
};
const XPathFilterExpr = {
    label: "FilterExpr"
};
const XPathDigits = {
    label: "Digits"
};

const xpathNonTerminals = [
    XPathLocationPath,
    XPathRelativeLocationPath,
    XPathAbsoluteLocationPath,
    XPathStep,
    XPathNodeTest,
    XPathPredicate,
    XPathLiteral,
    XPathExpr,
    XPathPrimaryExpr,
    XPathVariableReference,
    XPathNumber,
    XPathFunctionCall,
    XPathArgumentRemainder,
    XPathPathExpr,
    XPathUnionExpr,
    XPathFilterExpr,
    XPathDigits
];

// Quantifiers that are used in the productions of the grammar.
const Q_01 = {
    label: "?"
};
const Q_MM = {
    label: "*"
};
const Q_1M = {
    label: "+"
};

// Tag for left associativity (right assoc is implied by undefined).
const ASSOC_LEFT = true;

// The productions of the grammar. Columns of the table:
//
// - target nonterminal,
// - pattern,
// - precedence,
// - semantic value factory
//
// The semantic value factory is a function that receives parse tree
// nodes from the stack frames of the matched symbols as arguments and
// returns an a node of the parse tree. The node is stored in the top
// stack frame along with the target object of the rule. The node in
// the parse tree is an expression object that has an evaluate() method
// and thus evaluates XPath expressions.
//
// The precedence is used to decide between reducing and shifting by
// comparing the precendence of the rule that is candidate for
// reducing with the precedence of the look ahead token. Precedence of
// -1 means that the precedence of the tokens in the pattern is used
// instead. TODO: It shouldn't be necessary to explicitly assign
// precedences to rules.


// DGF As it stands, these precedences are purely empirical; we're
// not sure they can be made to be consistent at all.

const xpathGrammarRules = [
    [XPathLocationPath, [XPathRelativeLocationPath], 18,
        passExpr
    ],
    [XPathLocationPath, [XPathAbsoluteLocationPath], 18,
        passExpr
    ],

    [XPathAbsoluteLocationPath, [TOK_SLASH, XPathRelativeLocationPath], 18,
        makeLocationExpr1
    ],
    [XPathAbsoluteLocationPath, [TOK_DSLASH, XPathRelativeLocationPath], 18,
        makeLocationExpr2
    ],

    [XPathAbsoluteLocationPath, [TOK_SLASH], 0,
        makeLocationExpr3
    ],
    [XPathAbsoluteLocationPath, [TOK_DSLASH], 0,
        makeLocationExpr4
    ],

    [XPathRelativeLocationPath, [XPathStep], 31,
        makeLocationExpr5
    ],
    [XPathRelativeLocationPath, [XPathRelativeLocationPath, TOK_SLASH, XPathStep], 31,
        makeLocationExpr6
    ],
    [XPathRelativeLocationPath, [XPathRelativeLocationPath, TOK_DSLASH, XPathStep], 31,
        makeLocationExpr7
    ],

    [XPathStep, [TOK_DOT], 33,
        makeStepExpr1
    ],
    [XPathStep, [TOK_DDOT], 33,
        makeStepExpr2
    ],
    [XPathStep, [TOK_AXISNAME, TOK_AXIS, XPathNodeTest], 33,
        makeStepExpr3
    ],
    [XPathStep, [TOK_AT, XPathNodeTest], 33,
        makeStepExpr4
    ],
    [XPathStep, [XPathNodeTest], 33,
        makeStepExpr5
    ],
    [XPathStep, [XPathStep, XPathPredicate], 33,
        makeStepExpr6
    ],

    [XPathNodeTest, [TOK_ASTERISK], 33,
        makeNodeTestExpr1
    ],
    [XPathNodeTest, [TOK_NCNAME, TOK_COLON, TOK_ASTERISK], 33,
        makeNodeTestExpr2
    ],
    [XPathNodeTest, [TOK_QNAME], 33,
        makeNodeTestExpr3
    ],
    [XPathNodeTest, [TOK_NODEO, TOK_PARENC], 33,
        makeNodeTestExpr4
    ],
    [XPathNodeTest, [TOK_NODEO, XPathLiteral, TOK_PARENC], 33,
        makeNodeTestExpr5
    ],

    [XPathPredicate, [TOK_BRACKO, XPathExpr, TOK_BRACKC], 33,
        makePredicateExpr
    ],

    [XPathPrimaryExpr, [XPathVariableReference], 33,
        passExpr
    ],
    [XPathPrimaryExpr, [TOK_PARENO, XPathExpr, TOK_PARENC], 33,
        makePrimaryExpr
    ],
    [XPathPrimaryExpr, [XPathLiteral], 30,
        passExpr
    ],
    [XPathPrimaryExpr, [XPathNumber], 30,
        passExpr
    ],
    [XPathPrimaryExpr, [XPathFunctionCall], 31,
        passExpr
    ],

    [XPathFunctionCall, [TOK_QNAME, TOK_PARENO, TOK_PARENC], -1,
        makeFunctionCallExpr1
    ],
    [XPathFunctionCall, [TOK_QNAME, TOK_PARENO, XPathExpr, XPathArgumentRemainder, Q_MM,
            TOK_PARENC
        ], -1,
        makeFunctionCallExpr2
    ],
    [XPathArgumentRemainder, [TOK_COMMA, XPathExpr], -1,
        makeArgumentExpr
    ],

    [XPathUnionExpr, [XPathPathExpr], 20,
        passExpr
    ],
    [XPathUnionExpr, [XPathUnionExpr, TOK_PIPE, XPathPathExpr], 20,
        makeUnionExpr
    ],

    [XPathPathExpr, [XPathLocationPath], 20,
        passExpr
    ],
    [XPathPathExpr, [XPathFilterExpr], 19,
        passExpr
    ],
    [XPathPathExpr, [XPathFilterExpr, TOK_SLASH, XPathRelativeLocationPath], 19,
        makePathExpr1
    ],
    [XPathPathExpr, [XPathFilterExpr, TOK_DSLASH, XPathRelativeLocationPath], 19,
        makePathExpr2
    ],

    [XPathFilterExpr, [XPathPrimaryExpr, XPathPredicate, Q_MM], 31,
        makeFilterExpr
    ],

    [XPathExpr, [XPathPrimaryExpr], 16,
        passExpr
    ],
    [XPathExpr, [XPathUnionExpr], 16,
        passExpr
    ],

    [XPathExpr, [TOK_MINUS, XPathExpr], -1,
        makeUnaryMinusExpr
    ],

    [XPathExpr, [XPathExpr, TOK_OR, XPathExpr], -1,
        makeBinaryExpr
    ],
    [XPathExpr, [XPathExpr, TOK_AND, XPathExpr], -1,
        makeBinaryExpr
    ],

    [XPathExpr, [XPathExpr, TOK_EQ, XPathExpr], -1,
        makeBinaryExpr
    ],
    [XPathExpr, [XPathExpr, TOK_NEQ, XPathExpr], -1,
        makeBinaryExpr
    ],

    [XPathExpr, [XPathExpr, TOK_LT, XPathExpr], -1,
        makeBinaryExpr
    ],
    [XPathExpr, [XPathExpr, TOK_LE, XPathExpr], -1,
        makeBinaryExpr
    ],
    [XPathExpr, [XPathExpr, TOK_GT, XPathExpr], -1,
        makeBinaryExpr
    ],
    [XPathExpr, [XPathExpr, TOK_GE, XPathExpr], -1,
        makeBinaryExpr
    ],

    [XPathExpr, [XPathExpr, TOK_PLUS, XPathExpr], -1,
        makeBinaryExpr, ASSOC_LEFT
    ],
    [XPathExpr, [XPathExpr, TOK_MINUS, XPathExpr], -1,
        makeBinaryExpr, ASSOC_LEFT
    ],

    [XPathExpr, [XPathExpr, TOK_ASTERISK, XPathExpr], -1,
        makeBinaryExpr, ASSOC_LEFT
    ],
    [XPathExpr, [XPathExpr, TOK_DIV, XPathExpr], -1,
        makeBinaryExpr, ASSOC_LEFT
    ],
    [XPathExpr, [XPathExpr, TOK_MOD, XPathExpr], -1,
        makeBinaryExpr, ASSOC_LEFT
    ],

    [XPathLiteral, [TOK_LITERALQ], -1,
        makeLiteralExpr
    ],
    [XPathLiteral, [TOK_LITERALQQ], -1,
        makeLiteralExpr
    ],

    [XPathNumber, [TOK_NUMBER], -1,
        makeNumberExpr
    ],

    [XPathVariableReference, [TOK_DOLLAR, TOK_QNAME], 200,
        makeVariableReference
    ]
];

// That function computes some optimizations of the above data
// structures and will be called right here. It merely takes the
// counter variables out of the global scope.

let xpathRules = [];

function xpathParseInit(xpathLog) {
    if (xpathRules.length) {
        return;
    }

    // Some simple optimizations for the xpath expression parser: sort
    // grammar rules descending by length, so that the longest match is
    // first found.

    xpathGrammarRules.sort((a, b) => {
        const la = a[1].length;
        const lb = b[1].length;
        if (la < lb) {
            return 1;
        } else if (la > lb) {
            return -1;
        } else {
            return 0;
        }
    });

    let k = 1;
    for (let i = 0; i < xpathNonTerminals.length; ++i) {
        xpathNonTerminals[i].key = k++;
    }

    for (let i = 0; i < xpathTokenRules.length; ++i) {
        xpathTokenRules[i].key = k++;
    }

    xpathLog(`XPath parse INIT: ${k} rules`);

    // Another slight optimization: sort the rules into bins according
    // to the last element (observing quantifiers), so we can restrict
    // the match against the stack to the subest of rules that match the
    // top of the stack.
    //
    // TODO(mesch): What we actually want is to compute states as in
    // bison, so that we don't have to do any explicit and iterated
    // match against the stack.

    function push_(array, position, element) {
        if (!array[position]) {
            array[position] = [];
        }
        array[position].push(element);
    }

    for (let i = 0; i < xpathGrammarRules.length; ++i) {
        const rule = xpathGrammarRules[i];
        const pattern = rule[1];

        for (let j = pattern.length - 1; j >= 0; --j) {
            if (pattern[j] == Q_1M) {
                push_(xpathRules, pattern[j - 1].key, rule);
                break;

            } else if (pattern[j] == Q_MM || pattern[j] == Q_01) {
                push_(xpathRules, pattern[j - 1].key, rule);
                --j;

            } else {
                push_(xpathRules, pattern[j].key, rule);
                break;
            }
        }
    }

    xpathLog(`XPath parse INIT: ${xpathRules.length} rule bins`);

    let sum = 0;
    mapExec(xpathRules, i => {
        if (i) {
            sum += i.length;
        }
    });

    xpathLog(`XPath parse INIT: ${sum / xpathRules.length} average bin size`);
}

// Local utility functions that are used by the lexer or parser.

function xpathCollectDescendants(nodelist, node, opt_tagName) {
    if (opt_tagName && node.getElementsByTagName) {
        copyArray(nodelist, node.getElementsByTagName(opt_tagName));
        return;
    }
    for (let n = node.firstChild; n; n = n.nextSibling) {
        nodelist.push(n);
        xpathCollectDescendants(nodelist, n);
    }
}

/**
 * DGF - extract a tag name suitable for getElementsByTagName
 *
 * @param nodetest                     the node test
 * @param ignoreNonElementNodesForNTA  if true, the node list returned when
 *                                     evaluating "node()" will not contain
 *                                     non-element nodes. This can boost
 *                                     performance. This is false by default.
 */
function xpathExtractTagNameFromNodeTest(nodetest, ignoreNonElementNodesForNTA) {
    if (nodetest instanceof NodeTestName) {
        return nodetest.name;
    }
    if ((ignoreNonElementNodesForNTA && nodetest instanceof NodeTestAny) ||
        nodetest instanceof NodeTestElementOrAttribute) {
        return "*";
    }
}

function xpathCollectDescendantsReverse(nodelist, node) {
    for (let n = node.lastChild; n; n = n.previousSibling) {
        nodelist.push(n);
        xpathCollectDescendantsReverse(nodelist, n);
    }
}

// Utility function to sort a list of nodes. Used by xsltSort() and
// nxslSelect().
export function xpathSort(input, sort) {
    if (sort.length == 0) {
        return;
    }

    const sortlist = [];

    for (let i = 0; i < input.contextSize(); ++i) {
        const node = input.nodelist[i];
        const sortitem = {
            node,
            key: []
        };
        const context = input.clone(node, 0, [node]);

        for (const s of sort) {
            const value = s.expr.evaluate(context);

            let evalue;
            if (s.type == 'text') {
                evalue = value.stringValue();
            } else if (s.type == 'number') {
                evalue = value.numberValue();
            }
            sortitem.key.push({
                value: evalue,
                order: s.order
            });
        }

        // Make the sort stable by adding a lowest priority sort by
        // id. This is very convenient and furthermore required by the
        // spec ([XSLT] - Section 10 Sorting).
        sortitem.key.push({
            value: i,
            order: 'ascending'
        });

        sortlist.push(sortitem);
    }

    sortlist.sort(xpathSortByKey);

    const nodes = [];
    for (let i = 0; i < sortlist.length; ++i) {
        nodes.push(sortlist[i].node);
    }
    input.nodelist = nodes;
    input.setNode(0);
}


// Sorts by all order criteria defined. According to the JavaScript
// spec ([ECMA] Section 11.8.5), the compare operators compare strings
// as strings and numbers as numbers.
//
// NOTE: In browsers which do not follow the spec, this breaks only in
// the case that numbers should be sorted as strings, which is very
// uncommon.
function xpathSortByKey(v1, v2) {
    // NOTE: Sort key vectors of different length never occur in
    // xsltSort.

    for (let i = 0; i < v1.key.length; ++i) {
        const o = v1.key[i].order == 'descending' ? -1 : 1;
        if (v1.key[i].value > v2.key[i].value) {
            return +1 * o;
        } else if (v1.key[i].value < v2.key[i].value) {
            return -1 * o;
        }
    }

    return 0;
}


// Parses and then evaluates the given XPath expression in the given
// input context. Notice that parsed xpath expressions are cached.
export function xpathEval(select, context) {
    const expr = xpathParse(select);
    const ret = expr.evaluate(context);
    return ret;
}
