export class BooleanValue {
    value: any;

    type: string;

    constructor(value) {
        this.value = value;
        this.type = 'boolean';
    }

    stringValue() {
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
