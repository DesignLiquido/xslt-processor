import { ExprContext } from "../expr-context";
import { StringValue } from "../values";
import { assert } from "./internal-functions";

export function upperCase(context: ExprContext) {
    assert(['2.0', '3.0'].includes(context.xsltVersion));
    const str: string = this.args[0].evaluate(context).stringValue();
    return new StringValue(str.toUpperCase());
}

export function lowerCase(context: ExprContext) {
    assert(['2.0', '3.0'].includes(context.xsltVersion));
    const str: string = this.args[0].evaluate(context).stringValue();
    return new StringValue(str.toLowerCase());
}
