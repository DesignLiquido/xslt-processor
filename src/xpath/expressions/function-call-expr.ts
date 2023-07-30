import { ExprContext } from '../expr-context';
import {
    count,
    generateId,
    id,
    last,
    localName,
    _name,
    namespaceUri,
    position,
    xmlToJson,
    _string,
    concat,
    startsWith,
    endsWith,
    contains,
    substringBefore,
    substringAfter,
    substring,
    stringLength,
    normalizeSpace,
    translate,
    matches,
    boolean,
    not,
    _true,
    _false,
    lang,
    number,
    sum,
    floor,
    ceiling,
    round,
    current
} from '../functions';
import { extCardinal, extIf, extJoin } from '../functions/non-standard';
import { BooleanValue } from '../values/boolean-value';
import { Expression } from './expression';

export class FunctionCallExpr extends Expression {
    name: any;
    args: any[];

    xPathFunctions: { [key: string]: Function } = {
        boolean,
        ceiling,
        concat,
        contains,
        count,
        current,
        'ends-with': endsWith,
        false: _false,
        floor,
        'generate-id': generateId,
        id,
        lang,
        last,
        'local-name': localName,
        matches,
        name: _name,
        'namespace-uri': namespaceUri,
        'normalize-space': normalizeSpace,
        not,
        number,
        position,
        round,
        'starts-with': startsWith,
        string: _string,
        'xml-to-json': xmlToJson,
        substring,
        'substring-before': substringBefore,
        'substring-after': substringAfter,
        sum,
        'string-length': stringLength,
        translate,
        true: _true,

        // TODO(mesch): The following functions are custom. There is a
        // standard that defines how to add functions, which should be
        // applied here.

        'ext-join': extJoin,

        // ext-if() evaluates and returns its second argument, if the
        // boolean value of its first argument is true, otherwise it
        // evaluates and returns its third argument.

        'ext-if': extIf,

        // ext-cardinal() evaluates its single argument as a number, and
        // returns the current node that many times. It can be used in the
        // select attribute to iterate over an integer range.

        'ext-cardinal': extCardinal
    };

    constructor(name: any) {
        super();
        this.name = name;
        this.args = [];
    }

    appendArg(arg: any) {
        this.args.push(arg);
    }

    evaluate(context: ExprContext) {
        const functionName = `${this.name.value}`;
        const resolvedFunction = this.xPathFunctions[functionName];
        if (resolvedFunction) {
            return resolvedFunction.call(this, context);
        }

        return new BooleanValue(false);
    }
}
