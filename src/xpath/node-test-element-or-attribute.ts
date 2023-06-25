import { DOM_ATTRIBUTE_NODE, DOM_ELEMENT_NODE } from "../constants";
import { BooleanValue } from "./boolean-value";

export class NodeTestElementOrAttribute {
    evaluate(ctx) {
        return new BooleanValue(ctx.node.nodeType == DOM_ELEMENT_NODE || ctx.node.nodeType == DOM_ATTRIBUTE_NODE);
    }
}
