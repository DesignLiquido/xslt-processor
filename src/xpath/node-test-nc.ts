import { BooleanValue } from "./boolean-value";

export class NodeTestNC {
    regex: RegExp;

    nsprefix: any;

    constructor(nsprefix) {
        this.regex = new RegExp(`^${nsprefix}:`);
        this.nsprefix = nsprefix;
    }

    evaluate(ctx) {
        const n = ctx.node;
        return new BooleanValue(n.nodeName.match(this.regex));
    }
}
