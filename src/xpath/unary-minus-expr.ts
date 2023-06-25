import { NumberValue } from "./number-value";

export class UnaryMinusExpr {
    expr: any;

    constructor(expr) {
        this.expr = expr;
    }

    evaluate(ctx) {
        return new NumberValue(-this.expr.evaluate(ctx).numberValue());
    }
}
