// Factory functions for semantic values (i.e. Expressions) of the
// productions in the grammar. When a production is matched to reduce
// the current parse state stack, the export function is called with the
// semantic values of the matched elements as arguments, and returns
// another semantic value. The semantic value is a node of the parse
// tree, an expression object with an evaluate() method that evaluates the
// expression in an actual context. These factory functions are used
// in the specification of the grammar rules, below.

import { BinaryExpr } from "../expressions/binary-expr";
import { FilterExpr } from "../expressions/filter-expr";
import { FunctionCallExpr } from "../expressions/function-call-expr";
import { LiteralExpr } from "../expressions/literal-expr";
import { LocationExpr } from "../expressions/location-expr";
import { NodeTestAny } from "./node-test-any";
import { NodeTestComment } from "./node-test-comment";
import { NodeTestElementOrAttribute } from "./node-test-element-or-attribute";
import { NodeTestName } from "./node-test-name";
import { NodeTestNC } from "./node-test-nc";
import { NodeTestPI } from "./node-test-pi";
import { NodeTestText } from "./node-test-text";
import { NumberExpr } from "../expressions/number-expr";
import { PathExpr } from "../expressions/path-expr";
import { PredicateExpr } from "../expressions/predicate-expr";
import { StepExpr } from "../expressions/step-expr";
import { TokenExpr } from "../expressions/token-expr";
import { UnaryMinusExpr } from "../expressions/unary-minus-expr";
import { UnionExpr } from "../expressions/union-expr";
import { VariableExpr } from "../expressions/variable-expr";

export function makeTokenExpr(m) {
    return new TokenExpr(m);
}

export function passExpr(e) {
    return e;
}

export function makeLocationExpr1(slash, rel) {
    rel.absolute = true;
    return rel;
}

export function makeLocationExpr2(dslash, rel) {
    rel.absolute = true;
    rel.prependStep(makeAbbrevStep(dslash.value));
    return rel;
}

export function makeLocationExpr3() {
    const ret = new LocationExpr();
    ret.appendStep(makeAbbrevStep('.'));
    ret.absolute = true;
    return ret;
}

export function makeLocationExpr4(dslash) {
    const ret = new LocationExpr();
    ret.absolute = true;
    ret.appendStep(makeAbbrevStep(dslash.value));
    return ret;
}

export function makeLocationExpr5(step) {
    const ret = new LocationExpr();
    ret.appendStep(step);
    return ret;
}

export function makeLocationExpr6(rel, slash, step) {
    rel.appendStep(step);
    return rel;
}

export function makeLocationExpr7(rel, dslash, step) {
    rel.appendStep(makeAbbrevStep(dslash.value));
    rel.appendStep(step);
    return rel;
}

export function makeStepExpr1(dot) {
    return makeAbbrevStep(dot.value);
}

export function makeStepExpr2(ddot) {
    return makeAbbrevStep(ddot.value);
}

export function makeStepExpr3(axisname, axis, nodetest) {
    return new StepExpr(axisname.value, nodetest);
}

export function makeStepExpr4(at, nodetest) {
    return new StepExpr('attribute', nodetest);
}

export function makeStepExpr5(nodetest) {
    return new StepExpr('child', nodetest);
}

export function makeStepExpr6(step, predicate) {
    step.appendPredicate(predicate);
    return step;
}

export function makeAbbrevStep(abbrev) {
    switch (abbrev) {
        case '//':
            return new StepExpr('descendant-or-self', new NodeTestAny());

        case '.':
            return new StepExpr('self', new NodeTestAny());

        case '..':
            return new StepExpr('parent', new NodeTestAny());
    }
}

export function makeNodeTestExpr1() {
    return new NodeTestElementOrAttribute();
}

export function makeNodeTestExpr2(ncname) {
    return new NodeTestNC(ncname.value);
}

export function makeNodeTestExpr3(qname) {
    return new NodeTestName(qname.value);
}

export function makeNodeTestExpr4(typeo) {
    const type = typeo.value.replace(/\s*\($/, '');
    switch (type) {
        case 'node':
            return new NodeTestAny();

        case 'text':
            return new NodeTestText();

        case 'comment':
            return new NodeTestComment();

        case 'processing-instruction':
            return new NodeTestPI('');
    }
}

export function makeNodeTestExpr5(typeo, target) {
    const type = typeo.replace(/\s*\($/, '');
    if (type != 'processing-instruction') {
        throw type;
    }
    return new NodeTestPI(target.value);
}

export function makePredicateExpr(pareno, expr) {
    return new PredicateExpr(expr);
}

export function makePrimaryExpr(pareno, expr) {
    return expr;
}

export function makeFunctionCallExpr1(name) {
    return new FunctionCallExpr(name);
}

export function makeFunctionCallExpr2(name, pareno, arg1, args) {
    const ret = new FunctionCallExpr(name);
    ret.appendArg(arg1);
    for (let i = 0; i < args.length; ++i) {
        ret.appendArg(args[i]);
    }
    return ret;
}

export function makeArgumentExpr(comma, expr) {
    return expr;
}

export function makeUnionExpr(expr1, pipe, expr2) {
    return new UnionExpr(expr1, expr2);
}

export function makePathExpr1(filter, slash, rel) {
    return new PathExpr(filter, rel);
}

export function makePathExpr2(filter, dslash, rel) {
    rel.prependStep(makeAbbrevStep(dslash.value));
    return new PathExpr(filter, rel);
}

export function makeFilterExpr(expr, predicates) {
    if (predicates.length > 0) {
        return new FilterExpr(expr, predicates);
    } else {
        return expr;
    }
}

export function makeUnaryMinusExpr(minus, expr) {
    return new UnaryMinusExpr(expr);
}

export function makeBinaryExpr(expr1, op, expr2) {
    return new BinaryExpr(expr1, op, expr2);
}

export function makeLiteralExpr(token) {
    // remove quotes from the parsed value:
    const value = token.value.substring(1, token.value.length - 1);
    return new LiteralExpr(value);
}

export function makeNumberExpr(token) {
    return new NumberExpr(token.value);
}

export function makeVariableReference(dollar, name) {
    return new VariableExpr(name.value);
}

// Used before parsing for optimization of common simple cases. See
// the begin of xpathParse() for which they are.
export function makeSimpleExpr(expr) {
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

export function makeSimpleExpr2(expr) {
    const steps = expr.split('/');
    const c = new LocationExpr();
    for (let i = 0; i < steps.length; ++i) {
        const a = new NodeTestName(steps[i]);
        const b = new StepExpr('child', a);
        c.appendStep(b);
    }
    return c;
}
