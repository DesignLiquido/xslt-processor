import { TokenExpr } from "./expressions"
import { XPathTokenRule } from "./xpath-token-rule"

export type XPathMatchRule = {
    tag: XPathTokenRule,
    match: string,
    prec: number,
    expr: TokenExpr
}
