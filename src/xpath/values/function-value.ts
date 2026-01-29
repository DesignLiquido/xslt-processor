import { XNode } from "../../dom";
import { NodeValue } from "./node-value";

export class FunctionValue implements NodeValue {
    value: any;
    type: string;

    constructor(value: any) {
        this.value = value;
        this.type = 'function';
    }

    stringValue(): string {
        // Functions don't have a string value in XPath 3.1
        // Usually, serialization results in something like "function(...)"
        const name = this.value.name ? `${this.value.name}#${this.value.arity}` : `(anonymous)#${this.value.arity}`;
        return `function ${name}`;
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
