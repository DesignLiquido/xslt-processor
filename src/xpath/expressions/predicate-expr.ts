import { ExprContext } from "..";
import { BooleanValue } from "../values/boolean-value";
import { Expression } from "./expression";

export class PredicateExpr extends Expression {
    expression: Expression;

    constructor(expression: Expression) {
        super();
        this.expression = expression;
    }

    evaluate(context: ExprContext) {
        const value = this.expression.evaluate(context);
        if (value.type == 'number') {
            // NOTE(mesch): Internally, position is represented starting with
            // 0, however in XPath position starts with 1. See functions
            // position() and last().
            return new BooleanValue(context.position == value.numberValue() - 1);
        }

        return new BooleanValue(value.booleanValue());
    }
}
