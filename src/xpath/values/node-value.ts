import { XNode } from "../../dom";

export interface NodeValue {
    type: string;
    stringValue(): string;
    booleanValue(): boolean;
    numberValue(): number;
    nodeSetValue(): XNode[];
}
