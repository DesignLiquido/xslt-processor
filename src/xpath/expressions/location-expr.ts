import { XPathExpression, XPathLocationPath } from "../lib/src/expressions";
import { Expression } from "./expression";
import { NodeConverter } from "./node-converter";

/**
 * Location expression wrapper for XSLT pattern matching.
 */
export class LocationExpr extends Expression {
    declare absolute: boolean;
    declare steps: any[];

    constructor(xpathExpression: XPathLocationPath, nodeConverter: NodeConverter) {
        super(xpathExpression, nodeConverter);
        this.absolute = xpathExpression.absolute;
        this.steps = xpathExpression.steps.map(step => ({
            axis: step.axis,
            nodeTest: step.nodeTest,
            predicates: step.predicates || [],
            predicate: step.predicates || [],
            hasPositionalPredicate: this.hasPositionalPredicate(step.predicates || []),
        }));
    }

    private hasPositionalPredicate(predicates: XPathExpression[]): boolean {
        // TODO: Implement proper detection of positional predicates
        // For now, assume no positional predicates
        return false;
    }

    appendStep(step: any) {
        this.steps.push(step);
    }

    prependStep(step: any) {
        this.steps.unshift(step);
    }
}
