import { NumberValue } from "../xpath/number-value";
import { Expression } from "./expression";

export class NumberExpr extends Expression {
    value: any;

    constructor(value: any) {
        super();
        this.value = value;
    }

    evaluate() {
        return new NumberValue(this.value);
    }
}
