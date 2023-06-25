export class NumberValue {
    value: any;
    type: string;
    
    constructor(value) {
        this.value = value;
        this.type = 'number';
    }

    stringValue() {
        return `${this.value}`;
    }

    booleanValue() {
        return !!this.value;
    }

    numberValue() {
        return this.value - 0;
    }

    nodeSetValue() {
        throw this;
    }
}
