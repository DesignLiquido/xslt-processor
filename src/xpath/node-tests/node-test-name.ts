import { ExprContext } from "../expr-context";
import { NodeValue } from "../values";
import { BooleanValue } from "../values/boolean-value";
import { NodeTest } from "./node-test";

export class NodeTestName implements NodeTest {
    name: string;
    namespacePrefix: string;
    re: RegExp;

    constructor(name: string) {
        this.name = name;
        if (name.indexOf(':') > 0) {
            const nameAndNamespacePrefix = name.split(':');
            this.namespacePrefix = nameAndNamespacePrefix[0];
            this.name = nameAndNamespacePrefix[1];
        }

        this.re = new RegExp(`^${name}$`, 'i');
    }

    evaluate(context: ExprContext): NodeValue {
        const node = context.nodeList[context.position];
        if (this.namespacePrefix !== undefined) {
            const namespaceValue = context.knownNamespaces[this.namespacePrefix];
            if (namespaceValue !== node.namespaceUri) {
                return new BooleanValue(false);
            }

            if (context.caseInsensitive) {
                if (node.localName.length !== this.name.length) return new BooleanValue(false);
                return new BooleanValue(this.re.test(node.localName));
            }

            return new BooleanValue(node.localName === this.name);
        }

        if (context.caseInsensitive) {
            if (node.nodeName.length !== this.name.length) return new BooleanValue(false);
            return new BooleanValue(this.re.test(node.nodeName));
        }

        return new BooleanValue(node.nodeName === this.name);
    }
}
