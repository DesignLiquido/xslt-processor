// Copyright 2018 Johannes Wilm
// Copyright 2005 Google Inc.
// All Rights Reserved
//
// Debug stuff for the XPath parser. Also used by XSLT.
import {
    XNode
} from "../src/dom.js"
import {
    ExprContext,
    StringValue,
    BooleanValue,
    NumberValue,
    NodeSetValue,
    TokenExpr,
    LocationExpr,
    StepExpr,
    NodeTestName,
    NodeTestNC,
    NodeTestComment,
    NodeTestPI,
    NodeTestText,
    NodeTestElementOrAttribute,
    NodeTestAny,
    PredicateExpr,
    FunctionCallExpr,
    UnionExpr,
    PathExpr,
    FilterExpr,
    UnaryMinusExpr,
    BinaryExpr,
    LiteralExpr,
    NumberExpr,
    VariableExpr
} from "../src/xpath.js"

export let parseTree = function(expr, indent) {
    let ret
    switch(expr.constructor) {
        case TokenExpr:
            ret = `${indent}[token] ${expr.value}\n`;
            break;
        case LocationExpr:
            ret = `${indent}[location] ${expr.absolute ? 'absolute' : 'relative'}\n`;
            for (let i = 0; i < expr.steps.length; ++i) {
                ret += parseTree(expr.steps[i], `${indent} `);
            }
            break;
        case StepExpr:
            ret = `${indent}[step]\n${indent} [axis] ${expr.axis}\n${parseTree(expr.nodetest, `${indent} `)}`;
            for (let i = 0; i < expr.predicate.length; ++i) {
                ret += parseTree(expr.predicate[i], `${indent} `);
            }
            break;
        case NodeTestAny:
        case NodeTestElementOrAttribute:
        case NodeTestText:
        case NodeTestComment:
        case NodeTestPI:
        case NodeTestName:
        case NodeTestNC:
            ret = `${indent}[nodetest] ${toString(expr)}\n`;
            break;
        case PredicateExpr:
            ret = `${indent}[predicate]\n${parseTree(expr.expr, `${indent} `)}`;
            break;
        case FunctionCallExpr:
            ret = `${indent}[function call] ${expr.name.value}\n`;
            for (let i = 0; i < expr.args.length; ++i) {
                ret += parseTree(expr.args[i], `${indent} `);
            }
            break;
        case UnionExpr:
            ret = `${indent}[union]\n${parseTree(expr.expr1, indent + ' ')}${parseTree(expr.expr2, `${indent} `)}`;
            break;
        case PathExpr:
            ret = `${indent}[path]\n${indent}- filter:\n${parseTree(expr.filter, `${indent} `)}${indent}- location path:\n${parseTree(expr.rel, `${indent} `)}`;
            break;
        case FilterExpr:
            ret = `${indent}[filter]\n${indent}- expr:\n${parseTree(expr.expr, `${indent} `)}`;
            `${indent}- predicates:\n`;
            for (let i = 0; i < expr.predicate.length; ++i) {
                ret += parseTree(expr.predicate[i], `${indent} `);
            }
            break;
        case UnaryMinusExpr:
            ret = `${indent}[unary] -\n${parseTree(expr.expr, `${indent} `)}`;
            break;
        case BinaryExpr:
            ret = `${indent}[binary] ${expr.op.value}\n${parseTree(expr.expr1, `${indent} `)}${parseTree(expr.expr2, `${indent} `)}`;
            break;
        case LiteralExpr:
            ret = `${indent}[literal] ${toString(expr)}\n`;
            break;
        case NumberExpr:
            ret = `${indent}[number] ${toString(expr)}\n`;
            break;
        case VariableExpr:
            ret = `${indent}[variable] ${toString(expr)}\n`;
            break;
        case StringValue:
        case NumberValue:
        case BooleanValue:
        case NodeSetValue:
            ret = `${expr.type}: ${expr.value}`;
            break

        default:
            break;
    }
    return ret;
}

export let toString = function(expr) {
    let ret
    switch(expr.constructor) {
        case FunctionCallExpr:
            ret = `${expr.name.value}(`;
            for (let i = 0; i < expr.args.length; ++i) {
                if (i > 0) {
                    ret += ', ';
                }
                ret += toString(expr.args[i]);
            }
            ret += ')';
            break;
        case UnionExpr:
            ret = `${toString(expr.expr1)} | ${toString(expr.expr2)}`;
            break;
        case PathExpr:
            ret = `{path: {${toString(expr.filter)}} {${toString(expr.rel)}}}`;
            break;
        case FilterExpr:
            ret = toString(expr.expr);
            for (let i = 0; i < expr.predicate.length; ++i) {
                ret += toString(expr.predicate[i]);
            }
            break;
        case UnaryMinusExpr:
            ret = `-${toString(expr.expr)}`;
            break;
        case BinaryExpr:
            ret = `${toString(expr.expr1)} ${expr.op.value} ${toString(expr.expr2)}`;
            break;
        case LiteralExpr:
            ret = `"${expr.value}"`;
            break;
        case NumberExpr:
            ret = `${expr.value}`;
            break;
        case VariableExpr:
            ret = `$${expr.name}`;
            break;
        case XNode:
            ret = expr.nodeName;
            break;
        case ExprContext:
            ret = `[${expr.position}/${expr.nodelist.length}] ${expr.node.nodeName}`;
            break;
        case TokenExpr:
            ret = expr.value;
            break;
        case LocationExpr:
            ret = '';
            if (expr.absolute) {
                ret += '/';
            }
            for (let i = 0; i < expr.steps.length; ++i) {
                if (i > 0) {
                    ret += '/';
                }
                ret += toString(expr.steps[i]);
            }
            break;
        case StepExpr:
            ret = `${expr.axis}::${toString(expr.nodetest)}`;
            for (let i = 0; i < expr.predicate.length; ++i) {
                ret += toString(expr.predicate[i]);
            }
            break;
        case NodeTestAny:
            ret = 'node()';
            break;
        case NodeTestElementOrAttribute:
            ret = '*';
            break;
        case NodeTestText:
            ret = 'text()';
            break;
        case NodeTestComment:
            ret = 'comment()';
            break;
        case NodeTestPI:
            ret = 'processing-instruction()';
            break;
        case NodeTestNC:
            ret = `${expr.nsprefix}:*`;
            break;
        case NodeTestName:
            ret = expr.name;
            break;
        case PredicateExpr:
            ret = `[${toString(expr.expr)}]`;
            break;
        default:
            break;
    }
    return ret;
}
