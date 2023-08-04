export class StringValue {
    value: any;
    type: string;

    constructor(value) {
        this.value = value;
        this.type = 'string';
    }

    stringValue() {
        return this.value;
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
