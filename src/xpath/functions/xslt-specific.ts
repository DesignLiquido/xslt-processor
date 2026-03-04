import { ExprContext } from "../expr-context";
import { Expression } from "../expressions/expression";
import { NodeSetValue, NodeValue } from "../values";
import { assert } from "./internal-functions";

export function key(context: ExprContext): NodeValue {
    assert(this.args.length === 2);
    const keyName = (this.args[0] as Expression).evaluate(context).stringValue();
    const keyValue = (this.args[1] as Expression).evaluate(context).stringValue();
    const keyTable = context.keys[keyName];
    if (!keyTable) return new NodeSetValue([]);
    return keyTable[keyValue] || new NodeSetValue([]);
}
