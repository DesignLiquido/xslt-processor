import { ExprContext } from "../../xslt/expr-context";
import { NodeValue } from "../values";

export interface NodeTest {
    evaluate(_ctx: ExprContext): NodeValue;
}
