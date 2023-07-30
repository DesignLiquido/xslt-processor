import { ExprContext } from "./expr-context";
import { BooleanValue } from "./values/boolean-value";

export class NodeTestNC {
    regex: RegExp;

    nsprefix: any;

    constructor(nsprefix: string) {
        this.regex = new RegExp(`^${nsprefix}:`);
        this.nsprefix = nsprefix;
    }

    evaluate(ctx: ExprContext) {
        const n = ctx.nodeList[ctx.position];
        return new BooleanValue(n.nodeName.match(this.regex));
    }
}
