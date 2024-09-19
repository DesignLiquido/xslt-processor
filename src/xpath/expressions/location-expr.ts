import { ExprContext } from "../expr-context";
import { NodeSetValue } from "../values/node-set-value";
import { NodeTestAny } from "../node-tests/node-test-any";
import { xPathAxis } from "../tokens";
import { Expression } from "./expression";
import { XPath } from "../xpath";
import { XNode } from "../../dom";
import { StepExpr } from "./step-expr";

export class LocationExpr extends Expression {
    absolute: boolean;
    steps: StepExpr[];
    xPath: XPath;

    constructor(xPath: XPath) {
        super();
        this.absolute = false;
        this.steps = [];
        this.xPath = xPath;
    }

    appendStep(s: StepExpr) {
        const combinedStep = this._combineSteps(this.steps[this.steps.length - 1], s);
        if (combinedStep) {
            this.steps[this.steps.length - 1] = combinedStep;
        } else {
            this.steps.push(s);
        }
    }

    prependStep(s: StepExpr) {
        const combinedStep = this._combineSteps(s, this.steps[0]);
        if (combinedStep) {
            this.steps[0] = combinedStep;
        } else {
            this.steps.unshift(s);
        }
    }

    // DGF try to combine two steps into one step (perf enhancement)
    private _combineSteps(prevStep: any, nextStep: any) {
        if (!prevStep) return null;
        if (!nextStep) return null;
        const hasPredicates = prevStep.predicates && prevStep.predicates.length > 0;
        if (prevStep.nodeTest instanceof NodeTestAny && !hasPredicates) {
            // maybe suitable to be combined
            if (prevStep.axis == xPathAxis.DESCENDANT_OR_SELF) {
                if (nextStep.axis == xPathAxis.CHILD) {
                    // HBC - commenting out, because this is not a valid reduction
                    //nextStep.axis = xpathAxis.DESCENDANT;
                    //return nextStep;
                } else if (nextStep.axis == xPathAxis.SELF) {
                    nextStep.axis = xPathAxis.DESCENDANT_OR_SELF;
                    return nextStep;
                }
            } else if (prevStep.axis == xPathAxis.DESCENDANT) {
                if (nextStep.axis == xPathAxis.SELF) {
                    nextStep.axis = xPathAxis.DESCENDANT;
                    return nextStep;
                }
            }
        }
        return null;
    }

    evaluate(context: ExprContext) {
        let start: XNode;
        if (this.absolute) {
            start = context.root;
        } else {
            start = context.nodeList[context.position];
            // TODO: `<xsl:template>` with relative path, starting on root node,
            // conflicts with `<xsl:template match="/">`, for some reason considered as relative.
            /* if (start.nodeName === '#document' && this.steps[0].axis === 'self-and-siblings') {
                start = start.childNodes[0];
            } */
        }

        const nodes = [];
        this.xPath.xPathStep(nodes, this.steps, 0, start, context);
        return new NodeSetValue(nodes);
    }
}
