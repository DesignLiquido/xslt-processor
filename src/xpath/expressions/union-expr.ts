import { XPathExpression, XPathUnionExpression } from "../lib/src/expressions";
import { Expression } from "./expression";
import { NodeConverter } from "./node-converter";

/**
 * Union expression wrapper.
 */
export class UnionExpr extends Expression {
    expr1: Expression;
    expr2: Expression;

    constructor(
        xpathExpression: XPathUnionExpression,
        nodeConverter: NodeConverter,
        expr1: Expression,
        expr2: Expression
    ) {
        super(xpathExpression, nodeConverter);
        this.expr1 = expr1;
        this.expr2 = expr2;
    }
}
