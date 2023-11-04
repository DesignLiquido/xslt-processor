import { NodeValue } from "./node-value";

export class NumberValue implements NodeValue {
    value: any;
    type: string;

    constructor(value: any) {
        this.value = value;
        this.type = 'number';
    }

    stringValue(): string {
        return `${this.value}`;
    }

    booleanValue() {
        return !!this.value;
    }

    numberValue() {
        return this.value - 0;
    }

    nodeSetValue() {
        throw this;
    }
}
