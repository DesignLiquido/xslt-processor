import { xmlValue } from "../dom/util";

export class NodeSetValue {
    value: any;

    type: string;

    constructor(value) {
        this.value = value;
        this.type = 'node-set';
    }

    stringValue() {
        if (this.value.length == 0) {
            return '';
        } else {
            return xmlValue(this.value[0]);
        }
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
