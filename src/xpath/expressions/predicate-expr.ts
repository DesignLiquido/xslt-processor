import { ExprContext } from "..";
import { BooleanValue } from "../values/boolean-value";
import { Expression } from "./expression";

export class PredicateExpr extends Expression {
    expr: Expression;

    constructor(expr: Expression) {
        super();
        this.expr = expr;
    }

    evaluate(context: ExprContext) {
        const v = this.expr.evaluate(context);
        if (v.type == 'number') {
            // NOTE(mesch): Internally, position is represented starting with
            // 0, however in XPath position starts with 1. See functions
            // position() and last().
            return new BooleanValue(context.position == v.numberValue() - 1);
        }

        return new BooleanValue(v.booleanValue());
    }
}
