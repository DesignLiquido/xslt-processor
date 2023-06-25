import { NodeSetValue } from "./node-set-value";

export class PathExpr {
    filter: any;

    rel: any;

    constructor(filter, rel) {
        this.filter = filter;
        this.rel = rel;
    }

    evaluate(ctx) {
        const nodes = this.filter.evaluate(ctx).nodeSetValue();
        let nodes1 = [];
        if (ctx.returnOnFirstMatch) {
            for (let i = 0; i < nodes.length; ++i) {
                nodes1 = this.rel.evaluate(ctx.clone(nodes[i], i, nodes)).nodeSetValue();
                if (nodes1.length > 0) {
                    break;
                }
            }
            return new NodeSetValue(nodes1);
        } else {
            for (let i = 0; i < nodes.length; ++i) {
                const nodes0 = this.rel.evaluate(ctx.clone(nodes[i], i, nodes)).nodeSetValue();
                for (let ii = 0; ii < nodes0.length; ++ii) {
                    nodes1.push(nodes0[ii]);
                }
            }
            return new NodeSetValue(nodes1);
        }
    }
}
