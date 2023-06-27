import { DOM_TEXT_NODE } from "../constants";
import { BooleanValue } from "./values/boolean-value";

export class NodeTestText {
    evaluate(ctx) {
        return new BooleanValue(ctx.node.nodeType == DOM_TEXT_NODE);
    }
}
