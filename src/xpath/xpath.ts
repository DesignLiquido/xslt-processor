// Copyright 2023-2026 Design Liquido
// XPath adapter that uses the new lexer/parser implementation
// while maintaining backward compatibility with the existing XSLT API.

import { XNode } from '../dom';
import { XPathLexer } from './lib/src/lexer';
import { createXPathParser } from './lib/src/parser';
import { XPathExpression, XPathLocationPath, XPathUnionExpression } from './lib/src/expressions';
import { ExprContext } from './expr-context';
import { NodeValue } from './values/node-value';
import { XPathVersion } from './lib/src/xpath-version';
import { NodeConverter } from './expressions/node-converter';
import { Expression } from './expressions/expression';
import { LocationExpr } from './expressions/location-expr';
import { UnionExpr } from './expressions/union-expr';

/**
 * XPath class that uses the new lexer/parser implementation
 * while maintaining API compatibility with the old implementation.
 */
export class XPath {
    private lexers: Map<string, XPathLexer> = new Map();
    private parsers: Map<string, any> = new Map();
    private nodeConverter: NodeConverter;
    private parseCache: Map<string, Expression> = new Map();

    constructor() {
        this.nodeConverter = new NodeConverter();
    }

    private getLexer(version: XPathVersion): XPathLexer {
        const v = version || '1.0';
        if (!this.lexers.has(v)) {
            this.lexers.set(v, new XPathLexer({ version: v as any }));
        }
        return this.lexers.get(v)!;
    }

    private getParser(version: XPathVersion): any {
        const v = version || '1.0';
        if (!this.parsers.has(v)) {
            this.parsers.set(v, createXPathParser(v as any));
        }
        return this.parsers.get(v)!;
    }

    /**
     * Parse an XPath expression and return an Expression object.
     * @param expression The XPath expression string.
     * @param axis Optional axis override for relative paths.
     * @param version Optional XPath version (defaults to 1.0).
     */
    xPathParse(expression: string, axis?: string, version: XPathVersion = '1.0'): Expression {
        const cacheKey = `${expression}:${axis || ''}:${version}`;

        if (this.parseCache.has(cacheKey)) {
            return this.parseCache.get(cacheKey)!;
        }

        const lexer = this.getLexer(version);
        const parser = this.getParser(version);

        const tokens = lexer.scan(expression);
        const xpathExpr = parser.parse(tokens);

        const wrappedExpr = this.wrapExpression(xpathExpr, axis);
        this.parseCache.set(cacheKey, wrappedExpr);

        return wrappedExpr;
    }

    /**
     * Parse and evaluate an XPath expression.
     * @param select The XPath expression string.
     * @param context The expression context.
     */
    xPathEval(select: string, context: ExprContext): NodeValue {
        const version = (context.xsltVersion as XPathVersion) || '1.0';
        // For XSLT 3.0, use XPath 3.1 to get Maps and Arrays support which are often expected
        const effectiveVersion = version === '3.0' ? '3.1' : version;
        
        const expression = this.xPathParse(select, undefined, effectiveVersion);
        return expression.evaluate(context);
    }

    /**
     * Sort nodes in context according to sort specifications.
     * @param context The expression context with nodes to sort.
     * @param sort Array of sort specifications.
     */
    xPathSort(context: ExprContext, sort: any[]) {
        if (sort.length === 0) {
            return;
        }

        const sortList: { node: XNode; key: { value: any; order: string }[] }[] = [];

        for (let i = 0; i < context.contextSize(); ++i) {
            const node = context.nodeList[i];
            const sortItem = {
                node,
                key: [] as { value: any; order: string }[]
            };
            const clonedContext = context.clone([node], 0);

            for (const s of sort) {
                const value = s.expr.evaluate(clonedContext);

                let evalue: any;
                if (s.type === 'text') {
                    evalue = value.stringValue();
                } else if (s.type === 'number') {
                    evalue = value.numberValue();
                }
                sortItem.key.push({
                    value: evalue,
                    order: s.order
                });
            }

            // Make sort stable by adding index as lowest priority
            sortItem.key.push({
                value: i,
                order: 'ascending'
            });

            sortList.push(sortItem);
        }

        sortList.sort(this.xPathSortByKey);

        const nodes: XNode[] = [];
        for (let i = 0; i < sortList.length; ++i) {
            const node = sortList[i].node;
            node.siblingPosition = i;
            nodes.push(node);
        }

        context.nodeList = nodes;
        context.setNode(0);
    }

    /**
     * Comparison function for sorting.
     */
    private xPathSortByKey(v1: any, v2: any): number {
        for (let i = 0; i < v1.key.length; ++i) {
            const o = v1.key[i].order === 'descending' ? -1 : 1;
            if (v1.key[i].value > v2.key[i].value) {
                return +1 * o;
            }
            if (v1.key[i].value < v2.key[i].value) {
                return -1 * o;
            }
        }
        return 0;
    }

    /**
     * Wrap a new XPath expression in the backward-compatible Expression class.
     */
    private wrapExpression(xpathExpr: XPathExpression, axis?: string): Expression {
        if (xpathExpr instanceof XPathLocationPath) {
            // Apply axis override if specified
            if (axis && xpathExpr.steps.length > 0 && !xpathExpr.absolute) {
                xpathExpr.steps[0].axis = axis as any;
            }
            return new LocationExpr(xpathExpr, this.nodeConverter);
        }

        if (xpathExpr instanceof XPathUnionExpression) {
            const expr1 = this.wrapExpression(xpathExpr.left, axis);
            const expr2 = this.wrapExpression(xpathExpr.right, axis);
            return new UnionExpr(xpathExpr, this.nodeConverter, expr1, expr2);
        }

        return new Expression(xpathExpr, this.nodeConverter);
    }

    /**
     * Clear parse cache (useful for testing or memory management).
     */
    clearCache() {
        this.parseCache.clear();
        this.nodeConverter.clearCache();
    }
}

// Re-export expression classes for backward compatibility
export { Expression, LocationExpr, UnionExpr };
