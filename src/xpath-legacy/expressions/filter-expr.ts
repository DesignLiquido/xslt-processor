import { ExprContext } from "..";
import { NodeSetValue } from "../values/node-set-value";
import { Expression } from "./expression";

export class FilterExpr extends Expression {
    expr: any;
    predicate: any;

    constructor(expr: any, predicate: any) {
        super();
        this.expr = expr;
        this.predicate = predicate;
    }

    evaluate(context: ExprContext) {
        // the filter expression should be evaluated in its entirety with no
        // optimization, as we can't backtrack to it after having moved on to
        // evaluating the relative location path. See the testReturnOnFirstMatch
        // unit test.
        const flag = context.returnOnFirstMatch;
        context.setReturnOnFirstMatch(false);
        let nodes = this.expr.evaluate(context).nodeSetValue();
        context.setReturnOnFirstMatch(flag);

        for (let i = 0; i < this.predicate.length; ++i) {
            const nodes0 = nodes;
            nodes = [];
            for (let j = 0; j < nodes0.length; ++j) {
                const n = nodes0[j];
                if (this.predicate[i].evaluate(context.clone(nodes0, undefined, j)).booleanValue()) {
                    nodes.push(n);
                }
            }
        }

        return new NodeSetValue(nodes);
    }
}
