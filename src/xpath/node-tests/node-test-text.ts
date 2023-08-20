import { DOM_TEXT_NODE } from "../../constants";
import { ExprContext } from "../../xslt/expr-context";
import { BooleanValue } from "../values/boolean-value";
import { NodeTest } from "./node-test";

export class NodeTestText implements NodeTest {
    evaluate(ctx: ExprContext) {
        return new BooleanValue(ctx.nodeList[ctx.position].nodeType == DOM_TEXT_NODE);
    }
}
