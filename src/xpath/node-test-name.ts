import { BooleanValue } from "./boolean-value";

export class NodeTestName {
    name: string;
    re: RegExp;
    
    constructor(name) {
        this.name = name;
        this.re = new RegExp(`^${name}$`, 'i');
    }

    evaluate(ctx) {
        const n = ctx.node;
        if (ctx.caseInsensitive) {
            if (n.nodeName.length != this.name.length) return new BooleanValue(false);
            return new BooleanValue(this.re.test(n.nodeName));
        } else {
            return new BooleanValue(n.nodeName == this.name);
        }
    }
}
