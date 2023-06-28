import { ExprContext } from "./expr-context";
import { BooleanValue } from "./values/boolean-value";

export class NodeTestName {
    name: string;
    re: RegExp;

    constructor(name: string) {
        this.name = name;
        this.re = new RegExp(`^${name}$`, 'i');
    }

    evaluate(ctx: ExprContext) {
        const n = ctx.node;
        if (ctx.caseInsensitive) {
            if (n.nodeName.length != this.name.length) return new BooleanValue(false);
            return new BooleanValue(this.re.test(n.nodeName));
        } else {
            return new BooleanValue(n.nodeName == this.name);
        }
    }
}
