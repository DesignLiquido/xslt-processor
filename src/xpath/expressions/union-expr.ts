import { ExprContext } from "..";
import { NodeSetValue } from "../values/node-set-value";
import { Expression } from "./expression";

export class UnionExpr extends Expression {
    expr1: Expression;
    expr2: Expression;

    constructor(expr1: Expression, expr2: Expression) {
        super();
        this.expr1 = expr1;
        this.expr2 = expr2;
    }

    evaluate(context: ExprContext) {
        const nodes1 = this.expr1.evaluate(context).nodeSetValue();
        const nodes2 = this.expr2.evaluate(context).nodeSetValue();
        const I1 = nodes1.length;

        for (const n of nodes2) {
            let inBoth = false;
            for (let i1 = 0; i1 < I1; ++i1) {
                if (nodes1[i1] == n) {
                    inBoth = true;
                    i1 = I1; // break inner loop
                }
            }
            if (!inBoth) {
                nodes1.push(n);
            }
        }

        return new NodeSetValue(nodes1);
    }
}
