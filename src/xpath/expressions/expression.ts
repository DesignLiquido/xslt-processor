import { ExprContext, NodeValue } from "..";
import { XPathExpression, XPathLocationPath } from "../lib/src/expressions";
import { NodeConverter } from "./node-converter";

/**
 * Expression wrapper that provides backward-compatible interface.
 * Wraps new XPath expressions to work with old ExprContext.
 */
export class Expression {
    protected xpathExpression: XPathExpression;
    protected nodeConverter: NodeConverter;

    // Properties for LocationPath compatibility
    absolute?: boolean;
    steps?: any[];

    constructor(xpathExpression: XPathExpression, nodeConverter: NodeConverter) {
        this.xpathExpression = xpathExpression;
        this.nodeConverter = nodeConverter;

        // Extract properties if this is a location path
        if (xpathExpression instanceof XPathLocationPath) {
            this.absolute = xpathExpression.absolute;
            this.steps = xpathExpression.steps.map((step, index) => ({
                axis: step.axis,
                nodeTest: step.nodeTest,
                predicates: step.predicates,
                // Add methods needed by old code
                hasPositionalPredicate: false, // TODO: implement proper detection
                predicate: step.predicates || [],
                evaluate: (ctx: ExprContext) => {
                    // Evaluate just this step
                    const xpathCtx = this.nodeConverter.exprContextToXPathContext(ctx);
                    const result = step.evaluate(xpathCtx);
                    return this.nodeConverter.wrapResult(result, ctx);
                }
            }));
        }
    }

    /**
     * Evaluate the expression in the given context.
     */
    evaluate(context: ExprContext): NodeValue {
        const xpathContext = this.nodeConverter.exprContextToXPathContext(context);
        const result = this.xpathExpression.evaluate(xpathContext);
        return this.nodeConverter.wrapResult(result, context);
    }
}