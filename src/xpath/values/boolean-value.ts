import { NodeValue } from "./node-value";

export class BooleanValue implements NodeValue {
    value: any;
    type: string;

    constructor(value: any) {
        this.value = value;
        this.type = 'boolean';
    }

    stringValue(): string {
        return `${this.value}`;
    }

    booleanValue() {
        return this.value;
    }

    numberValue() {
        return this.value ? 1 : 0;
    }

    nodeSetValue() {
        throw this;
    }
}
