// Copyright 2023-2024 Design Liquido
// XPath tokens and axis constants

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

// Token rule for number matching (used by expr-context.ts)
export const TOK_NUMBER = {
    label: '[number]',
    prec: 35,
    re: new RegExp('^\\d+(\\.\\d*)?'),
    key: undefined
};
