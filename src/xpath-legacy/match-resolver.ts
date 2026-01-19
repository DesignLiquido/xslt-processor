import { XNode } from "../dom";
import { ExprContext } from "./expr-context";
import {
    LocationExpr,
    UnionExpr,
    FilterExpr,
    PathExpr,
    FunctionCallExpr,
    VariableExpr
} from "./expressions";
import { Expression } from "./expressions/expression";

/**
 * Class that resolves XPath expressions, returning nodes.
 */
export class MatchResolver {

    /**
     * This class entry point.
     * @param expression The expression to be resolved.
     * @param context The Expression Context
     * @returns An array of nodes.
     */
    expressionMatch(expression: Expression, context: ExprContext): XNode[] {
        if (expression instanceof LocationExpr) {
            return this.locationExpressionMatch(expression, context);
        }

        if (expression instanceof UnionExpr) {
            return this.unionExpressionMatch(expression, context);
        }

        if (expression instanceof FilterExpr) {
            return this.filterExpressionMatch(expression, context);
        }

        if (expression instanceof PathExpr) {
            return this.pathExpressionMatch(expression, context);
        }

        if (expression instanceof FunctionCallExpr) {
            return this.functionCallExpressionMatch(expression, context);
        }

        if (expression instanceof VariableExpr) {
            return this.variableExpressionMatch(expression, context);
        }

        // For any other expression type, try to evaluate it and extract nodes
        return this.genericExpressionMatch(expression, context);
    }

    /**
     * Resolves a `LocationExpr`.
     * @param expression The Location Expression.
     * @param context The Expression Context.
     * @returns Either the results of a relative resolution, or the results of an
     *          absolute resolution.
     */
    private locationExpressionMatch(expression: LocationExpr, context: ExprContext) {
        if (expression === undefined || expression.steps === undefined || expression.steps.length <= 0) {
            throw new Error('Error resolving XSLT match: Location Expression should have steps.');
        }

        if (expression.absolute) {
            // If expression is absolute and the axis of first step is self,
            // the match starts by the #document node (for instance, `<xsl:template match="/">`).
            // Otherwise (axis === 'child'), the match starts on the first
            // child of #document node.
            const firstStep = expression.steps[0];
            if (firstStep.axis === 'self') {
                return this.absoluteXsltMatchByDocumentNode(expression, context);
            }

            return this.absoluteXsltMatch(expression, context);
        }

        return this.relativeXsltMatch(expression, context);
    }

    /**
     * Resolves a `UnionExpr`.
     * @param expression The Union Expression.
     * @param context The Expression Context.
     * @returns The concatenated result of evaluating the both sides of the expression.
     */
    private unionExpressionMatch(expression: UnionExpr, context: ExprContext) {
        let expr1Nodes = this.expressionMatch(expression.expr1, context);
        return expr1Nodes.concat(this.expressionMatch(expression.expr2, context));
    }

    /**
     * Finds all the nodes through absolute XPath search, starting on
     * the #document parent node.
     * @param expression The Expression.
     * @param context The Expression Context.
     * @returns The list of found nodes.
     */
    private absoluteXsltMatchByDocumentNode(expression: LocationExpr, context: ExprContext): XNode[] {
        const clonedContext = context.clone([context.root], 0);
        const matchedNodes = expression.evaluate(clonedContext).nodeSetValue();
        const finalList = [];

        for (let element of matchedNodes) {
            if (element.id === context.nodeList[context.position].id) {
                finalList.push(element);
                continue;
            }
        }

        return finalList;
    }

    /**
     * Finds all the nodes through absolute xPath search, starting with the
     * first child of the #document node.
     * @param expression The Expression.
     * @param context The Expression Context.
     * @returns The list of found nodes.
     */
    private absoluteXsltMatch(expression: LocationExpr, context: ExprContext): XNode[] {
        const firstChildOfRoot = context.root.childNodes.find(c => c.nodeName !== '#dtd-section');
        const clonedContext = context.clone([firstChildOfRoot], 0);
        const matchedNodes = expression.evaluate(clonedContext).nodeSetValue();
        const finalList = [];

        // If the context is pointing to #document node, it's child node is
        // considered.
        let nodeList: XNode[];
        if (context.nodeList.length === 1 && context.nodeList[0].nodeName === '#document') {
            nodeList = [context.nodeList[0].childNodes.find(c => c.nodeName !== '#dtd-section')];
        } else {
            nodeList = context.nodeList;
        }

        for (let element of matchedNodes) {
            if (element.id === nodeList[context.position].id) {
                finalList.push(element);
                continue;
            }
        }

        return finalList;
    }

    /**
     * Tries to find relative nodes from the actual context position.
     * If found nodes are already in the context, or if they are children of
     * nodes in the context, they are returned.
     * @param expression The expression used.
     * @param context The Expression Context.
     * @returns The list of found nodes.
     */
    private relativeXsltMatch(expression: LocationExpr, context: ExprContext): XNode[] {
        // For some reason, XPath understands a default as 'child axis'.
        // There's no "self + siblings" axis, so what is expected at this point
        // is to have in the expression context the parent that should
        // have the nodes we are interested in.

        const clonedContext = context.clone();
        let nodes = expression.evaluate(clonedContext).nodeSetValue();
        if (nodes.length === 1 && nodes[0].nodeName === '#document') {
            // As we don't work with the #document node directly, this part
            // returns its first sibling.
            // By the way, it should be *always* one sibling here.
            return [nodes[0].childNodes[0]];
        }

        return nodes;
    }

    /**
     * Resolves a `FilterExpr`.
     * Filter expressions apply predicates to an expression result.
     * For template matching, we evaluate the filter and check if the
     * context node is in the result set.
     * @param expression The Filter Expression.
     * @param context The Expression Context.
     * @returns Matching nodes from the context.
     */
    private filterExpressionMatch(expression: FilterExpr, context: ExprContext): XNode[] {
        const clonedContext = context.clone();
        const evaluatedNodes = expression.evaluate(clonedContext).nodeSetValue();
        const finalList: XNode[] = [];

        // Check if any of the context nodes are in the evaluated result
        const contextNode = context.nodeList[context.position];
        for (const node of evaluatedNodes) {
            if (node.id === contextNode.id) {
                finalList.push(node);
                break;
            }
        }

        return finalList;
    }

    /**
     * Resolves a `PathExpr`.
     * Path expressions combine a filter with a relative location path.
     * Used for patterns like `key('items', @ref)/foo`.
     * @param expression The Path Expression.
     * @param context The Expression Context.
     * @returns Matching nodes from the context.
     */
    private pathExpressionMatch(expression: PathExpr, context: ExprContext): XNode[] {
        const clonedContext = context.clone();
        const evaluatedNodes = expression.evaluate(clonedContext).nodeSetValue();
        const finalList: XNode[] = [];

        // Check if the context node is in the evaluated result
        const contextNode = context.nodeList[context.position];
        for (const node of evaluatedNodes) {
            if (node.id === contextNode.id) {
                finalList.push(node);
                break;
            }
        }

        return finalList;
    }

    /**
     * Resolves a `FunctionCallExpr`.
     * Function calls like `key()` or `id()` can return node-sets
     * that are used for template matching.
     * @param expression The Function Call Expression.
     * @param context The Expression Context.
     * @returns Matching nodes from the context.
     */
    private functionCallExpressionMatch(expression: FunctionCallExpr, context: ExprContext): XNode[] {
        const clonedContext = context.clone();
        const result = expression.evaluate(clonedContext);

        // Only process if the result is a node-set
        if (result.type !== 'node-set') {
            return [];
        }

        const evaluatedNodes = result.nodeSetValue();
        const finalList: XNode[] = [];

        // Check if the context node is in the evaluated result
        const contextNode = context.nodeList[context.position];
        for (const node of evaluatedNodes) {
            if (node.id === contextNode.id) {
                finalList.push(node);
                break;
            }
        }

        return finalList;
    }

    /**
     * Resolves a `VariableExpr`.
     * Variable references that resolve to node-sets can be used
     * for template matching.
     * @param expression The Variable Expression.
     * @param context The Expression Context.
     * @returns Matching nodes from the context.
     */
    private variableExpressionMatch(expression: VariableExpr, context: ExprContext): XNode[] {
        const result = expression.evaluate(context) as any;

        // Only process if the result is a node-set
        if (result.type !== 'node-set') {
            return [];
        }

        const evaluatedNodes = result.nodeSetValue();
        const finalList: XNode[] = [];

        // Check if the context node is in the evaluated result
        const contextNode = context.nodeList[context.position];
        for (const node of evaluatedNodes) {
            if (node.id === contextNode.id) {
                finalList.push(node);
                break;
            }
        }

        return finalList;
    }

    /**
     * Generic handler for any other expression type.
     * Attempts to evaluate and extract nodes if the result is a node-set.
     * @param expression The Expression.
     * @param context The Expression Context.
     * @returns Matching nodes from the context.
     */
    private genericExpressionMatch(expression: Expression, context: ExprContext): XNode[] {
        try {
            const clonedContext = context.clone();
            const result = expression.evaluate(clonedContext);

            // Only process if the result is a node-set
            if (result && result.type === 'node-set') {
                const evaluatedNodes = result.nodeSetValue();
                const finalList: XNode[] = [];

                const contextNode = context.nodeList[context.position];
                for (const node of evaluatedNodes) {
                    if (node.id === contextNode.id) {
                        finalList.push(node);
                        break;
                    }
                }

                return finalList;
            }
        } catch (e) {
            // If evaluation fails, return empty array
            console.warn('MatchResolver: Failed to evaluate expression', e);
        }

        return [];
    }
}
