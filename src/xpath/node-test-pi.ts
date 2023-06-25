import { DOM_PROCESSING_INSTRUCTION_NODE } from "../constants";
import { BooleanValue } from "./boolean-value";

export class NodeTestPI {
    target: any;

    constructor(target) {
        this.target = target;
    }

    evaluate(ctx) {
        return new BooleanValue(
            ctx.node.nodeType == DOM_PROCESSING_INSTRUCTION_NODE && (!this.target || ctx.node.nodeName == this.target)
        );
    }
}
