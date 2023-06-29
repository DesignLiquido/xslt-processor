import { xmlValue } from "../../dom";

export class NodeSetValue {
    value: any;
    type: string;

    constructor(value: any) {
        this.value = value;
        this.type = 'node-set';
    }

    stringValue() {
        if (this.value.length === 0) {
            return '';
        }

        return xmlValue(this.value[0]);
    }

    booleanValue() {
        return this.value.length > 0;
    }

    numberValue() {
        return this.stringValue() - 0;
    }

    nodeSetValue() {
        return this.value;
    }
}
