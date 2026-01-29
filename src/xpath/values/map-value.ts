import { XNode } from "../../dom";
import { NodeValue } from "./node-value";

export class MapValue implements NodeValue {
    value: any;
    type: string;

    constructor(value: any) {
        this.value = value;
        this.type = 'map';
    }

    stringValue(): string {
        // For maps, string-value is not well-defined in XPath 3.1
        // but for XSLT output we can use JSON representation
        const clean: Record<string, any> = {};
        for (const key in this.value) {
            if (key !== '__isMap') {
                clean[key] = this.value[key];
            }
        }
        return JSON.stringify(clean);
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
