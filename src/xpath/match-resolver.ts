// Copyright 2023-2026 Design Liquido
// Match resolver that works with the new XPath implementation.

import { XNode } from '../dom';
import { ExprContext } from './expr-context';
import { Expression } from './expressions/expression';
import { LocationExpr } from './expressions/location-expr';
import { UnionExpr } from './expressions/union-expr';

/**
 * Class that resolves XPath expressions, returning nodes.
 * This is used for XSLT pattern matching.
 */
export class MatchResolver {

    /**
     * Entry point for expression matching.
     * @param expression The expression to be resolved.
     * @param context The Expression Context.
     * @returns An array of nodes.
     */
    expressionMatch(expression: Expression, context: ExprContext): XNode[] {
        if (expression instanceof LocationExpr) {
            return this.locationExpressionMatch(expression, context);
        }

        if (expression instanceof UnionExpr) {
            return this.unionExpressionMatch(expression, context);
        }

        // For other expression types, evaluate and return node set
        try {
            const result = expression.evaluate(context);
            return result.nodeSetValue();
        } catch {
            return [];
        }
    }

    /**
     * Resolves a LocationExpr.
     * @param expression The Location Expression.
     * @param context The Expression Context.
     * @returns Either the results of a relative resolution, or the results of an
     *          absolute resolution.
     */
    private locationExpressionMatch(expression: LocationExpr, context: ExprContext): XNode[] {
        if (!expression.steps || expression.steps.length <= 0) {
            // Handle "/" alone - matches the document root
            if (expression.absolute) {
                // Check if context node is the document node
                const contextNode = context.nodeList[context.position];
                if (contextNode.nodeName === '#document') {
                    return [contextNode];
                }
                // Otherwise, no match
                return [];
            }
            // For relative expressions without steps, return current context node
            return [context.nodeList[context.position]];
        }

        if (expression.absolute) {
            // If expression is absolute and the axis of first step is self,
            // the match starts by the #document node.
            const firstStep = expression.steps[0];
            if (firstStep.axis === 'self') {
                return this.absoluteXsltMatchByDocumentNode(expression, context);
            }

            return this.absoluteXsltMatch(expression, context);
        }

        return this.relativeXsltMatch(expression, context);
    }

    /**
     * Resolves a UnionExpr.
     * @param expression The Union Expression.
     * @param context The Expression Context.
     * @returns The concatenated result of evaluating both sides of the expression.
     */
    private unionExpressionMatch(expression: UnionExpr, context: ExprContext): XNode[] {
        const expr1Nodes = this.expressionMatch(expression.expr1, context);
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
        const finalList: XNode[] = [];

        for (const element of matchedNodes) {
            if (element.id === context.nodeList[context.position].id) {
                finalList.push(element);
            }
        }

        return finalList;
    }

    /**
     * Finds all the nodes through absolute XPath search, starting with the
     * first child of the #document node.
     * @param expression The Expression.
     * @param context The Expression Context.
     * @returns The list of found nodes.
     */
    private absoluteXsltMatch(expression: LocationExpr, context: ExprContext): XNode[] {
        const firstChildOfRoot = context.root.childNodes.find((c: XNode) => c.nodeName !== '#dtd-section');
        if (!firstChildOfRoot) return [];

        const clonedContext = context.clone([firstChildOfRoot], 0);
        const matchedNodes = expression.evaluate(clonedContext).nodeSetValue();
        const finalList: XNode[] = [];

        // If the context is pointing to #document node, its child node is considered.
        let nodeList: XNode[];
        if (context.nodeList.length === 1 && context.nodeList[0].nodeName === '#document') {
            nodeList = [context.nodeList[0].childNodes.find((c: XNode) => c.nodeName !== '#dtd-section')];
        } else {
            nodeList = context.nodeList;
        }

        for (const element of matchedNodes) {
            if (element.id === nodeList[context.position]?.id) {
                finalList.push(element);
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
        const clonedContext = context.clone();
        const nodes = expression.evaluate(clonedContext).nodeSetValue();

        if (nodes.length === 1 && nodes[0].nodeName === '#document') {
            // As we don't work with the #document node directly, this part
            // returns its first sibling.
            return [nodes[0].childNodes[0]];
        }

        return nodes;
    }
}
