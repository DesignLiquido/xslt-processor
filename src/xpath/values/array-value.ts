import { XNode } from "../../dom";
import { NodeValue } from "./node-value";

export class ArrayValue implements NodeValue {
    value: any;
    type: string;

    constructor(value: any) {
        this.value = value;
        this.type = 'array';
    }

    stringValue(): string {
        // For arrays, string-value is not well-defined in XPath 3.1
        // but for XSLT output we can use JSON representation
        return JSON.stringify(this.value.members || []);
    }

    booleanValue(): boolean {
        return true;
    }

    numberValue(): number {
        return NaN;
    }

    nodeSetValue(): XNode[] {
        return [];
    }
}
