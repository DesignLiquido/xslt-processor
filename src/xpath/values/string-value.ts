import { XNode } from "../../dom";
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
        const text = String(this.value).trim();
        if (text.length === 0) {
            return NaN;
        }
        return Number(text);
    }

    nodeSetValue(): XNode[] {
        throw this;
    }
}
