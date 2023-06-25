import { NumberValue } from "./number-value";

export class NumberExpr {
    value: any;

    constructor(value) {
        this.value = value;
    }

    evaluate() {
        return new NumberValue(this.value);
    }
}
