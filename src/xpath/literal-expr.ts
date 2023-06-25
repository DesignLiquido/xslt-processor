import { StringValue } from "./string-value";

export class LiteralExpr {
    value: any;
    
    constructor(value) {
        this.value = value;
    }

    evaluate() {
        return new StringValue(this.value);
    }
}
