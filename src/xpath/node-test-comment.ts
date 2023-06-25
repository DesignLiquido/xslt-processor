import { DOM_COMMENT_NODE } from "../constants";
import { BooleanValue } from "./boolean-value";

export class NodeTestComment {
    evaluate(ctx) {
        return new BooleanValue(ctx.node.nodeType == DOM_COMMENT_NODE);
    }
}
