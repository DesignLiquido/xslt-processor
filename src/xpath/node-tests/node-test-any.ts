import { BooleanValue } from "../values/boolean-value";
import { NodeTest } from "./node-test";

export class NodeTestAny implements NodeTest {
    value: any;

    constructor() {
        this.value = new BooleanValue(true);
    }

    evaluate() {
        return this.value;
    }
}
