import { StringValue } from "../values/string-value";
import { Expression } from "./expression";

export class LiteralExpr extends Expression {
    value: any;

    constructor(value: any) {
        super();
        this.value = value;
    }

    evaluate() {
        return new StringValue(this.value);
    }
}
