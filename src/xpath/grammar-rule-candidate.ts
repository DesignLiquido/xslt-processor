import { XPathTokenRule } from "./xpath-token-rule";

export type GrammarRuleCandidate = {
    tag: XPathTokenRule,
    rule?: any,
    match: any,
    prec?: number,
    expr?: any
};
