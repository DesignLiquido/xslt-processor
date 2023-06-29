import { ExprContext } from "../expr-context";
import { NodeSetValue } from "../values/node-set-value";
import { NodeTestAny } from "../node-test-any";
import { xpathAxis } from "../tokens";
import { Expression } from "./expression";
import { XPath } from "../xpath";

export class LocationExpr extends Expression {
    absolute: boolean;
    steps: any[];
    xPath: XPath;

    constructor(xPath: XPath) {
        super();
        this.absolute = false;
        this.steps = [];
        this.xPath = xPath;
    }

    appendStep(s) {
        const combinedStep = this._combineSteps(this.steps[this.steps.length - 1], s);
        if (combinedStep) {
            this.steps[this.steps.length - 1] = combinedStep;
        } else {
            this.steps.push(s);
        }
    }

    prependStep(s) {
        const combinedStep = this._combineSteps(s, this.steps[0]);
        if (combinedStep) {
            this.steps[0] = combinedStep;
        } else {
            this.steps.unshift(s);
        }
    }

    // DGF try to combine two steps into one step (perf enhancement)
    _combineSteps(prevStep, nextStep) {
        if (!prevStep) return null;
        if (!nextStep) return null;
        const hasPredicates = prevStep.predicates && prevStep.predicates.length > 0;
        if (prevStep.nodetest instanceof NodeTestAny && !hasPredicates) {
            // maybe suitable to be combined
            if (prevStep.axis == xpathAxis.DESCENDANT_OR_SELF) {
                if (nextStep.axis == xpathAxis.CHILD) {
                    // HBC - commenting out, because this is not a valid reduction
                    //nextStep.axis = xpathAxis.DESCENDANT;
                    //return nextStep;
                } else if (nextStep.axis == xpathAxis.SELF) {
                    nextStep.axis = xpathAxis.DESCENDANT_OR_SELF;
                    return nextStep;
                }
            } else if (prevStep.axis == xpathAxis.DESCENDANT) {
                if (nextStep.axis == xpathAxis.SELF) {
                    nextStep.axis = xpathAxis.DESCENDANT;
                    return nextStep;
                }
            }
        }
        return null;
    }

    evaluate(ctx: ExprContext) {
        let start;
        if (this.absolute) {
            start = ctx.root;
        } else {
            start = ctx.node;
        }

        const nodes = [];
        this.xPath.xPathStep(nodes, this.steps, 0, start, ctx);
        return new NodeSetValue(nodes);
    }
}