import { ExprContext } from "../xpath";

export abstract class Expression {
    abstract evaluate(ctx: ExprContext);
}
