import { DOM_ATTRIBUTE_NODE, DOM_ELEMENT_NODE } from "../constants";
import { ExprContext } from "./expr-context";
import { BooleanValue } from "./values/boolean-value";

export class NodeTestElementOrAttribute {
    evaluate(context: ExprContext) {
        const node = context.nodelist[context.position];
        return new BooleanValue(node.nodeType == DOM_ELEMENT_NODE || node.nodeType == DOM_ATTRIBUTE_NODE);
    }
}
