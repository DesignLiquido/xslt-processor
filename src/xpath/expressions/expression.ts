import { ExprContext } from "..";

export abstract class Expression {
    abstract evaluate(ctx: ExprContext);
}
