import { DOM_COMMENT_NODE } from "../constants";
import { ExprContext } from "./expr-context";
import { BooleanValue } from "./values/boolean-value";

export class NodeTestComment {
    evaluate(ctx: ExprContext) {
        return new BooleanValue(ctx.nodeList[ctx.position].nodeType == DOM_COMMENT_NODE);
    }
}
