import { NodeValue } from "./node-value";

export class StringValue implements NodeValue {
    value: any;
    type: string;

    constructor(value: any) {
        this.value = value;
        this.type = 'string';
    }

    stringValue(): string {
        return String(this.value);
    }

    booleanValue() {
        return this.value.length > 0;
    }

    numberValue() {
        return this.value - 0;
    }

    nodeSetValue() {
        throw this;
    }
}
