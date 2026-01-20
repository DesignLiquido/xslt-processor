// The tokens of the language. The label property is just used for
// generating debug output. The prec property is the precedence used
// for shift/reduce resolution. Default precedence is 0 as a lookahead
// token and 2 on the stack. TODO(mesch): this is certainly not
// necessary and too complicated. Simplify this!

import { XML_NC_NAME } from "../dom/xmltoken";
import { XPathTokenRule } from "./xpath-token-rule";

// NOTE: tabular formatting is the big exception, but here it should
// be OK.

// The axes of XPath expressions.

export const xPathAxis = {
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
    SELF: 'self',
    SELF_AND_SIBLINGS: 'self-and-siblings' // Doesn't exist officially.
                                           // It is here for a special case of `<xsl:apply-templates>`.
};

const xpathAxesRe =
    [
        xPathAxis.ANCESTOR_OR_SELF,
        xPathAxis.ANCESTOR,
        xPathAxis.ATTRIBUTE,
        xPathAxis.CHILD,
        xPathAxis.DESCENDANT_OR_SELF,
        xPathAxis.DESCENDANT,
        xPathAxis.FOLLOWING_SIBLING,
        xPathAxis.FOLLOWING,
        xPathAxis.NAMESPACE,
        xPathAxis.PARENT,
        xPathAxis.PRECEDING_SIBLING,
        xPathAxis.PRECEDING,
        xPathAxis.SELF
    ].join('(?=::)|') + '(?=::)'; //(viat) bodgy fix because namespace-uri() was getting detected as the namespace axis. maybe less bodgy fix later.


export const TOK_PIPE: XPathTokenRule = {
    label: '|',
    prec: 17,
    re: new RegExp('^\\|'),
    key: undefined
};

export const TOK_DSLASH: XPathTokenRule = {
    label: '//',
    prec: 19,
    re: new RegExp('^//'),
    key: undefined
};

export const TOK_SLASH: XPathTokenRule = {
    label: '/',
    prec: 30,
    re: new RegExp('^/'),
    key: undefined
};

export const TOK_AXIS: XPathTokenRule = {
    label: '::',
    prec: 20,
    re: new RegExp('^::'),
    key: undefined
};

export const TOK_COLON: XPathTokenRule = {
    label: ':',
    prec: 1000,
    re: new RegExp('^:'),
    key: undefined
};

export const TOK_AXISNAME: XPathTokenRule = {
    label: '[axis]',
    re: new RegExp(`^(${xpathAxesRe})`),
    key: undefined
};

export const TOK_PARENO: XPathTokenRule = {
    label: '(',
    prec: 34,
    re: new RegExp('^\\('),
    key: undefined
};

export const TOK_PARENC: XPathTokenRule = {
    label: ')',
    re: new RegExp('^\\)'),
    key: undefined
};
export const TOK_DDOT: XPathTokenRule = {
    label: '..',
    prec: 34,
    re: new RegExp('^\\.\\.'),
    key: undefined
};

export const TOK_DOT: XPathTokenRule = {
    label: '.',
    prec: 34,
    re: new RegExp('^\\.'),
    key: undefined
};

export const TOK_AT: XPathTokenRule = {
    label: '@',
    prec: 34,
    re: new RegExp('^@'),
    key: undefined
};

export const TOK_COMMA: XPathTokenRule = {
    label: ',',
    re: new RegExp('^,'),
    key: undefined
};

export const TOK_OR: XPathTokenRule = {
    label: 'or',
    prec: 10,
    re: new RegExp('^or\\b'),
    key: undefined
};

export const TOK_AND: XPathTokenRule = {
    label: 'and',
    prec: 11,
    re: new RegExp('^and\\b'),
    key: undefined
};

export const TOK_EQ: XPathTokenRule = {
    label: '=',
    prec: 12,
    re: new RegExp('^='),
    key: undefined
};

export const TOK_NEQ: XPathTokenRule = {
    label: '!=',
    prec: 12,
    re: new RegExp('^!='),
    key: undefined
};

export const TOK_GE: XPathTokenRule = {
    label: '>=',
    prec: 13,
    re: new RegExp('^>='),
    key: undefined
};

export const TOK_GT: XPathTokenRule = {
    label: '>',
    prec: 13,
    re: new RegExp('^>'),
    key: undefined
};

export const TOK_LE: XPathTokenRule = {
    label: '<=',
    prec: 13,
    re: new RegExp('^<='),
    key: undefined
};

export const TOK_LT: XPathTokenRule = {
    label: '<',
    prec: 13,
    re: new RegExp('^<'),
    key: undefined
};

export const TOK_PLUS: XPathTokenRule = {
    label: '+',
    prec: 14,
    re: new RegExp('^\\+'),
    left: true,
    key: undefined
};

export const TOK_MINUS: XPathTokenRule = {
    label: '-',
    prec: 14,
    re: new RegExp('^\\-'),
    left: true,
    key: undefined
};

export const TOK_DIV: XPathTokenRule = {
    label: 'div',
    prec: 15,
    re: new RegExp('^div\\b'),
    left: true,
    key: undefined
};

export const TOK_MOD: XPathTokenRule = {
    label: 'mod',
    prec: 15,
    re: new RegExp('^mod\\b'),
    left: true,
    key: undefined
};

export const TOK_BRACKO: XPathTokenRule = {
    label: '[',
    prec: 32,
    re: new RegExp('^\\['),
    key: undefined
};

export const TOK_BRACKC: XPathTokenRule = {
    label: ']',
    re: new RegExp('^\\]'),
    key: undefined
};

export const TOK_DOLLAR: XPathTokenRule = {
    label: '$',
    re: new RegExp('^\\$'),
    key: undefined
};

export const TOK_NCNAME: XPathTokenRule = {
    label: '[ncname]',
    re: new RegExp(`^${XML_NC_NAME}`),
    key: undefined
};

export const TOK_ASTERISK: XPathTokenRule = {
    label: '*',
    prec: 15,
    re: new RegExp('^\\*'),
    left: true,
    key: undefined
};

export const TOK_LITERALQ: XPathTokenRule = {
    label: '[litq]',
    prec: 20,
    re: new RegExp("^'[^\\']*'"),
    key: undefined
};

export const TOK_LITERALQQ: XPathTokenRule = {
    label: '[litqq]',
    prec: 20,
    re: new RegExp('^"[^\\"]*"'),
    key: undefined
};

export const TOK_NUMBER: XPathTokenRule = {
    label: '[number]',
    prec: 35,
    re: new RegExp('^\\d+(\\.\\d*)?'),
    key: undefined
};

export const TOK_QNAME: XPathTokenRule = {
    label: '[qname]',
    re: new RegExp(`^(${XML_NC_NAME}:)?${XML_NC_NAME}`),
    key: undefined
};

export const TOK_NODEO: XPathTokenRule = {
    label: '[nodeTest-start]',
    re: new RegExp('^(processing-instruction|comment|text|node)\\('),
    key: undefined
};

// The table of the tokens of our grammar, used by the lexer: first
// column the tag, second column a regexp to recognize it in the
// input, third column the precedence of the token, fourth column a
// factory function for the semantic value of the token.
//
// NOTE: order of this list is important, because the first match
// counts. Cf. DDOT and DOT, and AXIS and COLON.

export const xPathTokenRules: XPathTokenRule[] = [
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

// Quantifiers that are used in the productions of the grammar.
export const Q_ZERO_OR_ONE = {
    label: '?'
};
export const Q_ZERO_OR_MULTIPLE = {
    label: '*'
};
export const Q_ONE_OR_MULTIPLE = {
    label: '+'
};

// Tag for left associativity (right assoc is implied by undefined).
export const ASSOC_LEFT = true;
