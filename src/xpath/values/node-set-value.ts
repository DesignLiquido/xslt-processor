import { XNode, xmlValue } from "../../dom";
import { NodeValue } from "./node-value";

export class NodeSetValue implements NodeValue {
    value: XNode[];
    type: string;

    constructor(value: any) {
        this.value = value;
        this.type = 'node-set';
    }

    stringValue(): string {
        if (this.value.length === 0) {
            return '';
        }

        return xmlValue(this.value[0]);
    }

    booleanValue() {
        return this.value.length > 0;
    }

    numberValue() {
        return parseInt(this.stringValue()) - 0;
    }

    nodeSetValue() {
        return this.value;
    }
}
