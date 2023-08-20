import { XNode } from "../../dom";

export interface NodeValue {
    stringValue(): string;
    booleanValue(): boolean;
    numberValue(): number;
    nodeSetValue(): XNode[] | void;
}
