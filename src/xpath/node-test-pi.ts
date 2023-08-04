import { DOM_PROCESSING_INSTRUCTION_NODE } from "../constants";
import { ExprContext } from "../xslt/expr-context";
import { BooleanValue } from "./values/boolean-value";

export class NodeTestPI {
    target: any;

    constructor(target: any) {
        this.target = target;
    }

    evaluate(ctx: ExprContext) {
        const node = ctx.nodeList[ctx.position];
        return new BooleanValue(
            node.nodeType == DOM_PROCESSING_INSTRUCTION_NODE && (!this.target || node.nodeName == this.target)
        );
    }
}
