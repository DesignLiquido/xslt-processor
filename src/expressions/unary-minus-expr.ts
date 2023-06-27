import { ExprContext } from "../xpath";
import { NumberValue } from "../xpath/number-value";
import { Expression } from "./expression";

export class UnaryMinusExpr extends Expression {
    expr: any;

    constructor(expr: any) {
        super();
        this.expr = expr;
    }

    evaluate(ctx: ExprContext) {
        return new NumberValue(-this.expr.evaluate(ctx).numberValue());
    }
}
