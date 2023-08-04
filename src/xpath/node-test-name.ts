import { ExprContext } from "../xslt/expr-context";
import { BooleanValue } from "./values/boolean-value";

export class NodeTestName {
    name: string;
    re: RegExp;

    constructor(name: string) {
        this.name = name;
        this.re = new RegExp(`^${name}$`, 'i');
    }

    evaluate(context: ExprContext) {
        const n = context.nodeList[context.position];
        if (context.caseInsensitive) {
            if (n.nodeName.length != this.name.length) return new BooleanValue(false);
            return new BooleanValue(this.re.test(n.nodeName));
        }

        return new BooleanValue(n.nodeName == this.name);
    }
}
