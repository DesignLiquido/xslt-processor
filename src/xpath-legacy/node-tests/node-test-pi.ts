import { DOM_PROCESSING_INSTRUCTION_NODE } from "../../constants";
import { ExprContext } from "../expr-context";
import { BooleanValue } from "../values/boolean-value";
import { NodeTest } from "./node-test";

export class NodeTestPI implements NodeTest {
    target: any;

    constructor(target: any) {
        this.target = target;
    }

    evaluate(context: ExprContext) {
        const node = context.nodeList[context.position];
        return new BooleanValue(
            node.nodeType == DOM_PROCESSING_INSTRUCTION_NODE && (!this.target || node.nodeName == this.target)
        );
    }
}
