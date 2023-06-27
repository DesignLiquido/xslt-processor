import { ExprContext } from "..";
import { BooleanValue } from "../values/boolean-value";
import { Expression } from "./expression";

export class PredicateExpr extends Expression {
    expr: any;

    constructor(expr: any) {
        super();
        this.expr = expr;
    }

    evaluate(ctx: ExprContext) {
        const v = this.expr.evaluate(ctx);
        if (v.type == 'number') {
            // NOTE(mesch): Internally, position is represented starting with
            // 0, however in XPath position starts with 1. See functions
            // position() and last().
            return new BooleanValue(ctx.position == v.numberValue() - 1);
        } else {
            return new BooleanValue(v.booleanValue());
        }
    }
}
