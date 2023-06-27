import { BooleanValue } from "./values/boolean-value";

export class NodeTestAny {
    value: any;

    constructor() {
        this.value = new BooleanValue(true);
    }

    evaluate() {
        return this.value;
    }
}
