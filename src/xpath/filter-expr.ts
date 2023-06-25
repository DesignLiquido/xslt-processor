import { NodeSetValue } from "./node-set-value";

export class FilterExpr {
    expr: any;
    predicate: any;

    constructor(expr, predicate) {
        this.expr = expr;
        this.predicate = predicate;
    }

    evaluate(ctx) {
        // the filter expression should be evaluated in its entirety with no
        // optimization, as we can't backtrack to it after having moved on to
        // evaluating the relative location path. See the testReturnOnFirstMatch
        // unit test.
        const flag = ctx.returnOnFirstMatch;
        ctx.setReturnOnFirstMatch(false);
        let nodes = this.expr.evaluate(ctx).nodeSetValue();
        ctx.setReturnOnFirstMatch(flag);

        for (let i = 0; i < this.predicate.length; ++i) {
            const nodes0 = nodes;
            nodes = [];
            for (let j = 0; j < nodes0.length; ++j) {
                const n = nodes0[j];
                if (this.predicate[i].evaluate(ctx.clone(n, j, nodes0)).booleanValue()) {
                    nodes.push(n);
                }
            }
        }

        return new NodeSetValue(nodes);
    }
}
