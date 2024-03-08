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

export function _replace(context: ExprContext) {
    assert(['2.0', '3.0'].includes(context.xsltVersion));
    const str: string = this.args[0].evaluate(context).stringValue();
    const s1 = this.args[1].evaluate(context).stringValue();
    const s2 = this.args[2].evaluate(context).stringValue();

    const searchPattern = new RegExp(s1, 'g');
    return new StringValue(str.replace(searchPattern, s2));
}
