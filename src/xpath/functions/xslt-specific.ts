import { ExprContext } from "../expr-context";
import { Expression } from "../expressions/expression";
import { NodeValue, StringValue } from "../values";
import { assert } from "./internal-functions";

export function key(context: ExprContext): NodeValue {
    assert(this.args.length === 2);
    const keyNameStringValue: StringValue = (this.args[0] as Expression).evaluate(context);
    const keyValueStringValue: StringValue = (this.args[1] as Expression).evaluate(context);
    const keyName = keyNameStringValue.stringValue();
    const keyValue = keyValueStringValue.stringValue();
    const nodeSet = context.keys[keyName][keyValue];
    return nodeSet;
}
