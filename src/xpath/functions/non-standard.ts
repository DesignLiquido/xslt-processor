import { xmlValue } from "../../dom";
import { ExprContext } from "../expr-context";
import { NodeSetValue, StringValue } from "../values";
import { assert } from "./internal-functions";

export function extCardinal(context: ExprContext) {
    assert(this.args.length >= 1);
    const c = this.args[0].evaluate(context).numberValue();
    const ret = [];
    for (let i = 0; i < c; ++i) {
        ret.push(context.nodeList[context.position]);
    }
    return new NodeSetValue(ret);
}

/**
 * evaluates and returns its second argument, if the
 * boolean value of its first argument is true, otherwise it
 * evaluates and returns its third argument.
 * @param context The Expression Context
 * @returns A `BooleanValue`.
 */
export function extIf(context: ExprContext) {
    assert(this.args.length === 3);
    if (this.args[0].evaluate(context).booleanValue()) {
        return this.args[1].evaluate(context);
    }

    return this.args[2].evaluate(context);
}

export function extJoin(context: ExprContext) {
    assert(this.args.length === 2);
    const nodes = this.args[0].evaluate(context).nodeSetValue();
    const delim = this.args[1].evaluate(context).stringValue();
    let ret = '';
    for (let i = 0; i < nodes.length; ++i) {
        if (ret) {
            ret += delim;
        }
        ret += xmlValue(nodes[i]);
    }
    return new StringValue(ret);
}
