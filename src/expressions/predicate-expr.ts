import { BooleanValue } from "../xpath/boolean-value";

export class PredicateExpr {
    expr: any;

    constructor(expr) {
        this.expr = expr;
    }

    evaluate(ctx) {
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
