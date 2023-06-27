import { ExprContext } from "../xpath";
import { Expression } from "./expression";

export class VariableExpr extends Expression {
    name: string;

    constructor(name: string) {
        super();
        this.name = name;
    }

    evaluate(ctx: ExprContext) {
        return ctx.getVariable(this.name);
    }
}
