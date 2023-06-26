// Copyright 2023 Design Liquido
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
import { copyArray, mapExec, mapExpr, reverseInplace } from '../dom/util';
import { ExprContext } from './expr-context';
import { makeSimpleExpr, makeSimpleExpr2, makeTokenExpr } from './factory-functions';
import { NodeTestAny } from './node-test-any';
import { NodeTestElementOrAttribute } from './node-test-element-or-attribute';
import { NodeTestName } from './node-test-name';
import {
    Q_01,
    Q_1M,
    Q_MM,
    TOK_AND,
    TOK_AT,
    TOK_AXIS,
    TOK_DIV,
    TOK_DOLLAR,
    TOK_DSLASH,
    TOK_MOD,
    TOK_OR,
    TOK_QNAME,
    TOK_SLASH,
    xpathTokenRules
} from './tokens';

import xpathGrammarRules, {
    XPathAbsoluteLocationPath,
    XPathArgumentRemainder,
    XPathDigits,
    XPathExpr,
    XPathFilterExpr,
    XPathFunctionCall,
    XPathLiteral,
    XPathLocationPath,
    XPathNodeTest,
    XPathNumber,
    XPathPathExpr,
    XPathPredicate,
    XPathPrimaryExpr,
    XPathRelativeLocationPath,
    XPathStep,
    XPathUnionExpr,
    XPathVariableReference
} from './xpath-grammar-rules';

// That function computes some optimizations of the above data
// structures and will be called right here. It merely takes the
// counter variables out of the global scope.

let xpathRules = [];

// Local utility functions that are used by the lexer or parser.

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

let xpathParseCache = {};

function xpathCacheLookup(expr) {
    return xpathParseCache[expr];
}

export function xpathCollectDescendants(nodelist: any, node: any, opt_tagName?: any) {
    if (opt_tagName && node.getElementsByTagName) {
        copyArray(nodelist, node.getElementsByTagName(opt_tagName));
        return;
    }
    for (let n = node.firstChild; n; n = n.nextSibling) {
        nodelist.push(n);
        xpathCollectDescendants(nodelist, n);
    }
}

export function xpathCollectDescendantsReverse(nodelist, node) {
    for (let n = node.lastChild; n; n = n.previousSibling) {
        nodelist.push(n);
        xpathCollectDescendantsReverse(nodelist, n);
    }
}

// Parses and then evaluates the given XPath expression in the given
// input context. Notice that parsed xpath expressions are cached.
export function xpathEval(select: string, context: ExprContext) {
    const expr = xPathParse(select);
    const ret = expr.evaluate(context);
    return ret;
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
export function xpathExtractTagNameFromNodeTest(nodetest, ignoreNonElementNodesForNTA) {
    if (nodetest instanceof NodeTestName) {
        return nodetest.name;
    }
    if (
        (ignoreNonElementNodesForNTA && nodetest instanceof NodeTestAny) ||
        nodetest instanceof NodeTestElementOrAttribute
    ) {
        return '*';
    }
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
    const match: any = [];
    match.matchlength = 0;
    let ds = 0;
    for (p = P - 1, s = S - 1; p >= 0 && s >= 0; --p, s -= ds) {
        ds = 0;
        const qmatch: any = [];
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
        qmatch.expr = mapExpr(qmatch, (m) => m.expr);
    }

    reverseInplace(match);

    if (p == -1) {
        return match;
    } else {
        return [];
    }
}

export function xPathParse(
    expr,
    xpathLog = (message: string) => {
        // console.log(message);
    }
) {
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

        if (
            rule &&
            (rule == TOK_DIV || rule == TOK_MOD || rule == TOK_AND || rule == TOK_OR) &&
            (!previous ||
                previous.tag == TOK_AT ||
                previous.tag == TOK_DSLASH ||
                previous.tag == TOK_SLASH ||
                previous.tag == TOK_AXIS ||
                previous.tag == TOK_DOLLAR)
        ) {
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

function xpathParseInit(xpathLog) {
    if (xpathRules.length) {
        return;
    }

    let xpathNonTerminals = [
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

    // Some simple optimizations for the xpath expression parser: sort
    // grammar rules descending by length, so that the longest match is
    // first found.

    xpathGrammarRules.sort((a: any, b: any) => {
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
        const pattern: any = rule[1];

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
    mapExec(xpathRules, (i) => {
        if (i) {
            sum += i.length;
        }
    });

    xpathLog(`XPath parse INIT: ${sum / xpathRules.length} average bin size`);
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
function xpathReduce(
    stack: any,
    ahead: any,
    xpathLog = (message: string) => {
        // console.log(message);
    }
) {
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
                    cand.prec = xPathGrammarPrecedence(cand);
                    break;
                }
            }
        }
    }

    let ret;
    if (cand && (!ahead || cand.prec > ahead.prec || (ahead.tag.left && cand.prec >= ahead.prec))) {
        for (let i = 0; i < cand.match.matchlength; ++i) {
            stack.pop();
        }

        xpathLog(
            `reduce ${cand.tag.label} ${cand.prec} ahead ${
                ahead ? ahead.tag.label + ' ' + ahead.prec + (ahead.tag.left ? ' left' : '') : ' none '
            }`
        );

        const matchexpr = mapExpr(cand.match, (m) => m.expr);
        xpathLog(`going to apply ${cand.rule[3]}`);
        cand.expr = cand.rule[3].apply(null, matchexpr);

        stack.push(cand);
        ret = true;
    } else {
        if (ahead) {
            xpathLog(
                `shift ${ahead.tag.label} ${ahead.prec}${ahead.tag.left ? ' left' : ''} over ${
                    cand ? cand.tag.label + ' ' + cand.prec : ' none'
                }`
            );
            stack.push(ahead);
        }
        ret = false;
    }
    return ret;
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

export function xPathStep(nodes: any[], steps: any[], step, input, ctx) {
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
        nodelistLoop: for (let i = 0; i < nLength; ++i) {
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

function xPathGrammarPrecedence(frame) {
    let ret = 0;

    if (frame.rule) {

        /* normal reduce */
        if (frame.rule.length >= 3 && frame.rule[2] >= 0) {
            ret = frame.rule[2];
        } else {
            for (let i = 0; i < frame.rule[1].length; ++i) {
                let p = xPathTokenPrecedence(frame.rule[1][i]);
                ret = Math.max(ret, p);
            }
        }
    } else if (frame.tag) {

        /* TOKEN match */
        ret = xPathTokenPrecedence(frame.tag);
    } else if (frame.length) {

        /* Q_ match */
        for (let j = 0; j < frame.length; ++j) {
            let p = xPathGrammarPrecedence(frame[j]);
            ret = Math.max(ret, p);
        }
    }

    return ret;
}

function xPathTokenPrecedence(tag) {
    return tag.prec || 2;
}
