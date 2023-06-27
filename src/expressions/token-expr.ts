import { StringValue } from "../xpath/string-value";
import { Expression } from "./expression";

export class TokenExpr extends Expression {
    value: any;

    constructor(m: any) {
        super();
        this.value = m;
    }

    evaluate() {
        return new StringValue(this.value);
    }
}
