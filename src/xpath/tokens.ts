// The tokens of the language. The label property is just used for
// generating debug output. The prec property is the precedence used
// for shift/reduce resolution. Default precedence is 0 as a lookahead
// token and 2 on the stack. TODO(mesch): this is certainly not
// necessary and too complicated. Simplify this!

import { XML_NC_NAME } from "../dom/xmltoken";

// NOTE: tabular formatting is the big exception, but here it should
// be OK.

// The axes of XPath expressions.

export const xpathAxis = {
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

const xpathAxesRe =
    [
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
    ].join('(?=::)|') + '(?=::)'; //(viat) bodgy fix because namespace-uri() was getting detected as the namespace axis. maybe less bodgy fix later.


export const TOK_PIPE = {
    label: '|',
    prec: 17,
    re: new RegExp('^\\|'),
    key: undefined
};
export const TOK_DSLASH = {
    label: '//',
    prec: 19,
    re: new RegExp('^//'),
    key: undefined
};
export const TOK_SLASH = {
    label: '/',
    prec: 30,
    re: new RegExp('^/'),
    key: undefined
};
export const TOK_AXIS = {
    label: '::',
    prec: 20,
    re: new RegExp('^::'),
    key: undefined
};
export const TOK_COLON = {
    label: ':',
    prec: 1000,
    re: new RegExp('^:'),
    key: undefined
};
export const TOK_AXISNAME = {
    label: '[axis]',
    re: new RegExp(`^(${xpathAxesRe})`),
    key: undefined
};
export const TOK_PARENO = {
    label: '(',
    prec: 34,
    re: new RegExp('^\\('),
    key: undefined
};
export const TOK_PARENC = {
    label: ')',
    re: new RegExp('^\\)'),
    key: undefined
};
export const TOK_DDOT = {
    label: '..',
    prec: 34,
    re: new RegExp('^\\.\\.'),
    key: undefined
};
export const TOK_DOT = {
    label: '.',
    prec: 34,
    re: new RegExp('^\\.'),
    key: undefined
};
export const TOK_AT = {
    label: '@',
    prec: 34,
    re: new RegExp('^@'),
    key: undefined
};

export const TOK_COMMA = {
    label: ',',
    re: new RegExp('^,'),
    key: undefined
};

export const TOK_OR = {
    label: 'or',
    prec: 10,
    re: new RegExp('^or\\b'),
    key: undefined
};
export const TOK_AND = {
    label: 'and',
    prec: 11,
    re: new RegExp('^and\\b'),
    key: undefined
};
export const TOK_EQ = {
    label: '=',
    prec: 12,
    re: new RegExp('^='),
    key: undefined
};
export const TOK_NEQ = {
    label: '!=',
    prec: 12,
    re: new RegExp('^!='),
    key: undefined
};
export const TOK_GE = {
    label: '>=',
    prec: 13,
    re: new RegExp('^>='),
    key: undefined
};
export const TOK_GT = {
    label: '>',
    prec: 13,
    re: new RegExp('^>'),
    key: undefined
};
export const TOK_LE = {
    label: '<=',
    prec: 13,
    re: new RegExp('^<='),
    key: undefined
};
export const TOK_LT = {
    label: '<',
    prec: 13,
    re: new RegExp('^<'),
    key: undefined
};
export const TOK_PLUS = {
    label: '+',
    prec: 14,
    re: new RegExp('^\\+'),
    left: true,
    key: undefined
};
export const TOK_MINUS = {
    label: '-',
    prec: 14,
    re: new RegExp('^\\-'),
    left: true,
    key: undefined
};
export const TOK_DIV = {
    label: 'div',
    prec: 15,
    re: new RegExp('^div\\b'),
    left: true,
    key: undefined
};
export const TOK_MOD = {
    label: 'mod',
    prec: 15,
    re: new RegExp('^mod\\b'),
    left: true,
    key: undefined
};

export const TOK_BRACKO = {
    label: '[',
    prec: 32,
    re: new RegExp('^\\['),
    key: undefined
};
export const TOK_BRACKC = {
    label: ']',
    re: new RegExp('^\\]'),
    key: undefined
};
export const TOK_DOLLAR = {
    label: '$',
    re: new RegExp('^\\$'),
    key: undefined
};

export const TOK_NCNAME = {
    label: '[ncname]',
    re: new RegExp(`^${XML_NC_NAME}`),
    key: undefined
};

export const TOK_ASTERISK = {
    label: '*',
    prec: 15,
    re: new RegExp('^\\*'),
    left: true,
    key: undefined
};
export const TOK_LITERALQ = {
    label: '[litq]',
    prec: 20,
    re: new RegExp("^'[^\\']*'"),
    key: undefined
};
export const TOK_LITERALQQ = {
    label: '[litqq]',
    prec: 20,
    re: new RegExp('^"[^\\"]*"'),
    key: undefined
};

export const TOK_NUMBER = {
    label: '[number]',
    prec: 35,
    re: new RegExp('^\\d+(\\.\\d*)?'),
    key: undefined
};

export const TOK_QNAME = {
    label: '[qname]',
    re: new RegExp(`^(${XML_NC_NAME}:)?${XML_NC_NAME}`),
    key: undefined
};

export const TOK_NODEO = {
    label: '[nodetest-start]',
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

export const xpathTokenRules = [
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
export const Q_01 = {
    label: '?'
};
export const Q_MM = {
    label: '*'
};
export const Q_1M = {
    label: '+'
};

// Tag for left associativity (right assoc is implied by undefined).
export const ASSOC_LEFT = true;
