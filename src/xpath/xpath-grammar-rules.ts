// All the nonterminals of the grammar. The nonterminal objects are
// identified by object identity; the labels are used in the debug

import { makeArgumentExpr, makeBinaryExpr, makeFilterExpr, makeFunctionCallExpr1, makeFunctionCallExpr2, makeLiteralExpr, makeLocationExpr1, makeLocationExpr2, makeLocationExpr3, makeLocationExpr4, makeLocationExpr5, makeLocationExpr6, makeLocationExpr7, makeNodeTestExpr1, makeNodeTestExpr2, makeNodeTestExpr3, makeNodeTestExpr4, makeNodeTestExpr5, makeNumberExpr, makePathExpr1, makePathExpr2, makePredicateExpr, makePrimaryExpr, makeStepExpr1, makeStepExpr2, makeStepExpr3, makeStepExpr4, makeStepExpr5, makeStepExpr6, makeUnaryMinusExpr, makeUnionExpr, makeVariableReference, passExpr } from "./factory-functions";
import { ASSOC_LEFT, Q_MM, TOK_AND, TOK_ASTERISK, TOK_AT, TOK_AXIS, TOK_AXISNAME, TOK_BRACKC, TOK_BRACKO, TOK_COLON, TOK_COMMA, TOK_DDOT, TOK_DIV, TOK_DOLLAR, TOK_DOT, TOK_DSLASH, TOK_EQ, TOK_GE, TOK_GT, TOK_LE, TOK_LITERALQ, TOK_LITERALQQ, TOK_LT, TOK_MINUS, TOK_MOD, TOK_NCNAME, TOK_NEQ, TOK_NODEO, TOK_NUMBER, TOK_OR, TOK_PARENC, TOK_PARENO, TOK_PIPE, TOK_PLUS, TOK_QNAME, TOK_SLASH } from "./tokens";

// output only.
export const XPathLocationPath = {
    label: 'LocationPath',
    key: undefined
};
export const XPathRelativeLocationPath = {
    label: 'RelativeLocationPath',
    key: undefined
};
export const XPathAbsoluteLocationPath = {
    label: 'AbsoluteLocationPath',
    key: undefined
};
export const XPathStep = {
    label: 'Step',
    key: undefined
};
export const XPathNodeTest = {
    label: 'NodeTest',
    key: undefined
};
export const XPathPredicate = {
    label: 'Predicate',
    key: undefined
};
export const XPathLiteral = {
    label: 'Literal',
    key: undefined
};
export const XPathExpr = {
    label: 'Expr',
    key: undefined
};
export const XPathPrimaryExpr = {
    label: 'PrimaryExpr',
    key: undefined
};
export const XPathVariableReference = {
    label: 'Variablereference',
    key: undefined
};
export const XPathNumber = {
    label: 'Number',
    key: undefined
};
export const XPathFunctionCall = {
    label: 'FunctionCall',
    key: undefined
};
export const XPathArgumentRemainder = {
    label: 'ArgumentRemainder',
    key: undefined
};
export const XPathPathExpr = {
    label: 'PathExpr',
    key: undefined
};
export const XPathUnionExpr = {
    label: 'UnionExpr',
    key: undefined
};
export const XPathFilterExpr = {
    label: 'FilterExpr',
    key: undefined
};
export const XPathDigits = {
    label: 'Digits',
    key: undefined
};

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

export default [
    [XPathLocationPath, [XPathRelativeLocationPath], 18, passExpr],
    [XPathLocationPath, [XPathAbsoluteLocationPath], 18, passExpr],

    [XPathAbsoluteLocationPath, [TOK_SLASH, XPathRelativeLocationPath], 18, makeLocationExpr1],
    [XPathAbsoluteLocationPath, [TOK_DSLASH, XPathRelativeLocationPath], 18, makeLocationExpr2],

    [XPathAbsoluteLocationPath, [TOK_SLASH], 0, makeLocationExpr3],
    [XPathAbsoluteLocationPath, [TOK_DSLASH], 0, makeLocationExpr4],

    [XPathRelativeLocationPath, [XPathStep], 31, makeLocationExpr5],
    [XPathRelativeLocationPath, [XPathRelativeLocationPath, TOK_SLASH, XPathStep], 31, makeLocationExpr6],
    [XPathRelativeLocationPath, [XPathRelativeLocationPath, TOK_DSLASH, XPathStep], 31, makeLocationExpr7],

    [XPathStep, [TOK_DOT], 33, makeStepExpr1],
    [XPathStep, [TOK_DDOT], 33, makeStepExpr2],
    [XPathStep, [TOK_AXISNAME, TOK_AXIS, XPathNodeTest], 33, makeStepExpr3],
    [XPathStep, [TOK_AT, XPathNodeTest], 33, makeStepExpr4],
    [XPathStep, [XPathNodeTest], 33, makeStepExpr5],
    [XPathStep, [XPathStep, XPathPredicate], 33, makeStepExpr6],

    [XPathNodeTest, [TOK_ASTERISK], 33, makeNodeTestExpr1],
    [XPathNodeTest, [TOK_NCNAME, TOK_COLON, TOK_ASTERISK], 33, makeNodeTestExpr2],
    [XPathNodeTest, [TOK_QNAME], 33, makeNodeTestExpr3],
    [XPathNodeTest, [TOK_NODEO, TOK_PARENC], 33, makeNodeTestExpr4],
    [XPathNodeTest, [TOK_NODEO, XPathLiteral, TOK_PARENC], 33, makeNodeTestExpr5],

    [XPathPredicate, [TOK_BRACKO, XPathExpr, TOK_BRACKC], 33, makePredicateExpr],

    [XPathPrimaryExpr, [XPathVariableReference], 33, passExpr],
    [XPathPrimaryExpr, [TOK_PARENO, XPathExpr, TOK_PARENC], 33, makePrimaryExpr],
    [XPathPrimaryExpr, [XPathLiteral], 30, passExpr],
    [XPathPrimaryExpr, [XPathNumber], 30, passExpr],
    [XPathPrimaryExpr, [XPathFunctionCall], 31, passExpr],

    [XPathFunctionCall, [TOK_QNAME, TOK_PARENO, TOK_PARENC], -1, makeFunctionCallExpr1],
    [
        XPathFunctionCall,
        [TOK_QNAME, TOK_PARENO, XPathExpr, XPathArgumentRemainder, Q_MM, TOK_PARENC],
        -1,
        makeFunctionCallExpr2
    ],
    [XPathArgumentRemainder, [TOK_COMMA, XPathExpr], -1, makeArgumentExpr],

    [XPathUnionExpr, [XPathPathExpr], 20, passExpr],
    [XPathUnionExpr, [XPathUnionExpr, TOK_PIPE, XPathPathExpr], 20, makeUnionExpr],

    [XPathPathExpr, [XPathLocationPath], 20, passExpr],
    [XPathPathExpr, [XPathFilterExpr], 19, passExpr],
    [XPathPathExpr, [XPathFilterExpr, TOK_SLASH, XPathRelativeLocationPath], 19, makePathExpr1],
    [XPathPathExpr, [XPathFilterExpr, TOK_DSLASH, XPathRelativeLocationPath], 19, makePathExpr2],

    [XPathFilterExpr, [XPathPrimaryExpr, XPathPredicate, Q_MM], 31, makeFilterExpr],

    [XPathExpr, [XPathPrimaryExpr], 16, passExpr],
    [XPathExpr, [XPathUnionExpr], 16, passExpr],

    [XPathExpr, [TOK_MINUS, XPathExpr], -1, makeUnaryMinusExpr],

    [XPathExpr, [XPathExpr, TOK_OR, XPathExpr], -1, makeBinaryExpr],
    [XPathExpr, [XPathExpr, TOK_AND, XPathExpr], -1, makeBinaryExpr],

    [XPathExpr, [XPathExpr, TOK_EQ, XPathExpr], -1, makeBinaryExpr],
    [XPathExpr, [XPathExpr, TOK_NEQ, XPathExpr], -1, makeBinaryExpr],

    [XPathExpr, [XPathExpr, TOK_LT, XPathExpr], -1, makeBinaryExpr],
    [XPathExpr, [XPathExpr, TOK_LE, XPathExpr], -1, makeBinaryExpr],
    [XPathExpr, [XPathExpr, TOK_GT, XPathExpr], -1, makeBinaryExpr],
    [XPathExpr, [XPathExpr, TOK_GE, XPathExpr], -1, makeBinaryExpr],

    [XPathExpr, [XPathExpr, TOK_PLUS, XPathExpr], -1, makeBinaryExpr, ASSOC_LEFT],
    [XPathExpr, [XPathExpr, TOK_MINUS, XPathExpr], -1, makeBinaryExpr, ASSOC_LEFT],

    [XPathExpr, [XPathExpr, TOK_ASTERISK, XPathExpr], -1, makeBinaryExpr, ASSOC_LEFT],
    [XPathExpr, [XPathExpr, TOK_DIV, XPathExpr], -1, makeBinaryExpr, ASSOC_LEFT],
    [XPathExpr, [XPathExpr, TOK_MOD, XPathExpr], -1, makeBinaryExpr, ASSOC_LEFT],

    [XPathLiteral, [TOK_LITERALQ], -1, makeLiteralExpr],
    [XPathLiteral, [TOK_LITERALQQ], -1, makeLiteralExpr],

    [XPathNumber, [TOK_NUMBER], -1, makeNumberExpr],

    [XPathVariableReference, [TOK_DOLLAR, TOK_QNAME], 200, makeVariableReference]
];
