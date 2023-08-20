import { DOM_COMMENT_NODE } from "../../constants";
import { ExprContext } from "../../xslt/expr-context";
import { NodeTest } from "./node-test";
import { BooleanValue } from "../values/boolean-value";

export class NodeTestComment implements NodeTest {
    evaluate(ctx: ExprContext) {
        return new BooleanValue(ctx.nodeList[ctx.position].nodeType == DOM_COMMENT_NODE);
    }
}
