// Copyright 2023-2026 Design Liquido
// XPath adapter that uses the new lexer/parser implementation
// while maintaining backward compatibility with the existing XSLT API.

import { XNode, xmlValue } from '../dom';
import { XPathLexer } from './lib/src/lexer';
import { XPath10Parser } from './lib/src/parser';
import { XPathExpression, XPathLocationPath, XPathUnionExpression } from './lib/src/expressions';
import { XPathContext, XPathResult, createContext } from './lib/src/context';
import { XPathNode } from './lib/src/node';
import { JsonToXmlConverter } from './lib/src/expressions/json-to-xml-converter';
import { ExprContext } from './expr-context';
import { NodeValue, StringValue, NumberValue, BooleanValue, NodeSetValue } from './values';

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

/**
 * Union expression wrapper.
 */
export class UnionExpr extends Expression {
    expr1: Expression;
    expr2: Expression;

    constructor(
        xpathExpression: XPathUnionExpression,
        nodeConverter: NodeConverter,
        expr1: Expression,
        expr2: Expression
    ) {
        super(xpathExpression, nodeConverter);
        this.expr1 = expr1;
        this.expr2 = expr2;
    }
}

/**
 * Handles conversion between ExprContext and XPathContext.
 * Uses XNode directly as XPathNode-compatible objects to preserve node identity.
 */
class NodeConverter {
    /**
     * Convert ExprContext to XPathContext for the new XPath implementation.
     * XNodes are used directly since they implement enough of the XPathNode interface.
     */
    exprContextToXPathContext(exprContext: ExprContext): XPathContext {
        const currentNode = exprContext.nodeList[exprContext.position];
        // Use XNode directly - it's compatible enough with XPathNode
        const xpathNode = this.adaptXNode(currentNode);

        // Convert all nodes in the node list (needed for 'self-and-siblings' axis)
        const nodeList = exprContext.nodeList.map(node => this.adaptXNode(node));

        // Build extensions object to pass through XSLT-specific context data
        const extensions: Record<string, any> = {};

        // Search up the parent chain for XSLT-specific context data
        // (since xsltChildNodes clones context, we need to look up the chain)
        let ctx: ExprContext | undefined = exprContext;
        while (ctx) {
            // Pass through regex groups for xsl:analyze-string / regex-group() function
            if (!extensions.regexGroups && ctx.regexGroups) {
                extensions.regexGroups = ctx.regexGroups;
            }
            // Pass through current group for xsl:for-each-group / current-group() function
            if (!extensions.currentGroup && ctx.currentGroup) {
                extensions.currentGroup = ctx.currentGroup;
            }
            // Pass through current grouping key for xsl:for-each-group / current-grouping-key() function
            if (!extensions.currentGroupingKey && ctx.currentGroupingKey !== undefined) {
                extensions.currentGroupingKey = ctx.currentGroupingKey;
            }
            ctx = ctx.parent;
        }

        return createContext(xpathNode, {
            position: exprContext.position + 1, // XPath is 1-based
            size: exprContext.nodeList.length,
            nodeList: nodeList,
            variables: this.convertVariables(exprContext),
            functions: this.createCustomFunctions(exprContext),
            namespaces: exprContext.knownNamespaces,
            xsltVersion: exprContext.xsltVersion,
            extensions: Object.keys(extensions).length > 0 ? extensions : undefined,
        });
    }

    /**
     * Adapt XNode to be compatible with XPathNode interface.
     * We add missing properties but keep the original XNode reference.
     */
    adaptXNode(node: XNode): XPathNode {
        if (!node) return null;

        // XNode already has most properties, we just need to handle some differences
        // We add adapter properties without modifying the original object
        const adapted = node as any;

        // Add XPathNode-compatible properties if not present
        // namespaceUri is now the standard property in XPathNode interface

        if (!('textContent' in adapted)) {
            Object.defineProperty(adapted, 'textContent', {
                get() { return this._getTextContent(); },
                enumerable: true,
                configurable: true
            });
        }

        if (!('_getTextContent' in adapted)) {
            adapted._getTextContent = function() {
                if (this.nodeType === 3 || this.nodeType === 2) { // TEXT_NODE or ATTRIBUTE_NODE
                    return this.nodeValue || '';
                }
                if (!this.childNodes) return '';
                let text = '';
                for (const child of this.childNodes) {
                    if (child.nodeType === 3) {
                        text += child.nodeValue || '';
                    } else if (child.nodeType === 1) {
                        text += this._getTextContent.call(child);
                    }
                }
                return text;
            };
        }

        if (!('attributes' in adapted)) {
            Object.defineProperty(adapted, 'attributes', {
                get() {
                    return this.childNodes ? this.childNodes.filter((n: any) => n.nodeType === 2) : [];
                },
                enumerable: true,
                configurable: true
            });
        }

        if (!('getAttribute' in adapted)) {
            adapted.getAttribute = function(name: string) {
                return this.getAttributeValue ? this.getAttributeValue(name) : null;
            };
        }

        return adapted as XPathNode;
    }

    /**
     * Convert XPathNode result back to XNode.
     * Since we're now using XNodes directly, this is mostly a type cast.
     */
    xPathNodeToXNode(xpathNode: XPathNode): XNode | null {
        if (!xpathNode) return null;
        
        // Check if this is already an XNode (from native parsing)
        if (xpathNode instanceof XNode) {
            return xpathNode as unknown as XNode;
        }
        
        // Otherwise, convert XPathNode interface (from json-to-xml or xpath/lib) to XNode
        return this.convertXPathNodeToXNode(xpathNode);
    }

    /**
     * Get text content from an XNode.
     */
    private getTextContent(node: XNode): string {
        if (node.nodeType === 3 || node.nodeType === 2) { // TEXT_NODE or ATTRIBUTE_NODE
            return node.nodeValue || '';
        }

        if (!node.childNodes) return '';

        let text = '';
        for (const child of node.childNodes) {
            if (child.nodeType === 3) { // TEXT_NODE
                text += child.nodeValue || '';
            } else if (child.nodeType === 1) { // ELEMENT_NODE
                text += this.getTextContent(child);
            }
        }
        return text;
    }

    /**
     * Convert variables from ExprContext format to XPathContext format.
     */
    private convertVariables(exprContext: ExprContext): Record<string, any> {
        const variables: Record<string, any> = {};

        for (const [name, value] of Object.entries(exprContext.variables || {})) {
            if (value && typeof value === 'object' && 'stringValue' in value) {
                // It's a NodeValue, extract the raw value
                // Cast to any to access the type property which exists on concrete implementations
                const nodeValue = value as any;
                if (nodeValue.type === 'node-set') {
                    variables[name] = (value as NodeSetValue).nodeSetValue().map(n => this.adaptXNode(n));
                } else if (nodeValue.type === 'string') {
                    variables[name] = value.stringValue();
                } else if (nodeValue.type === 'number') {
                    variables[name] = value.numberValue();
                } else if (nodeValue.type === 'boolean') {
                    variables[name] = value.booleanValue();
                } else {
                    // Unknown type, try to get string value
                    variables[name] = value.stringValue();
                }
            } else {
                variables[name] = value;
            }
        }

        return variables;
    }

    /**
     * Create custom functions for XPath context (like key(), document(), etc.).
     * Note: Custom functions receive the XPathContext as their first argument,
     * followed by the evaluated function arguments.
     */
    private createCustomFunctions(exprContext: ExprContext): Record<string, (...args: any[]) => any> {
        const functions: Record<string, (...args: any[]) => any> = {};

        // key() function - XSLT specific
        // Signature: key(context, keyName, keyValue)
        functions['key'] = (_context: XPathContext, keyName: string, keyValue: string) => {
            const keyDef = exprContext.keys?.[keyName];
            if (keyDef && keyDef[keyValue]) {
                const nodeSetValue = keyDef[keyValue];
                return nodeSetValue.nodeSetValue().map((n: XNode) => this.adaptXNode(n));
            }
            return [];
        };

        // current() function - XSLT specific
        // Signature: current(context)
        functions['current'] = (_context: XPathContext) => {
            const currentNode = exprContext.nodeList[exprContext.position];
            return [this.adaptXNode(currentNode)];
        };

        // format-number() function - XSLT specific
        // Signature: format-number(context, number, format, decimalFormatName?)
        functions['format-number'] = (_context: XPathContext, number: number, format: string, decimalFormatName?: string) => {
            const settings = exprContext.decimalFormatSettings;
            // Basic implementation - can be expanded
            return number.toLocaleString();
        };

        // xml-to-json() function - XSLT 3.0 specific
        // Signature: xml-to-json(context, nodes)
        functions['xml-to-json'] = (_context: XPathContext, nodes: any) => {
            // Check XSLT version - only supported in 3.0
            if (exprContext.xsltVersion !== '3.0') {
                throw new Error('xml-to-json() is only supported in XSLT 3.0. Use version="3.0" in your stylesheet.');
            }

            // Handle node set or single node
            const node = Array.isArray(nodes) ? nodes[0] : nodes;
            if (!node) {
                return '""';
            }

            // Convert XML node to JSON string
            return this.xmlToJson(node);
        };

        // json-to-xml() function - XSLT 3.0 specific
        // Signature: json-to-xml(context, jsonText)
        functions['json-to-xml'] = (_context: XPathContext, jsonText: any) => {
            // Check XSLT version - only supported in 3.0
            if (exprContext.xsltVersion !== '3.0') {
                throw new Error('json-to-xml() is only supported in XSLT 3.0. Use version="3.0" in your stylesheet.');
            }

            // Handle node set or single value
            const jsonStr = Array.isArray(jsonText) ? jsonText[0] : jsonText;
            if (!jsonStr) {
                return [];
            }

            // Convert JSON string to XML document node using xpath lib converter
            const converter = new JsonToXmlConverter();
            const xpathNode = converter.convert(String(jsonStr));
            
            if (!xpathNode) {
                return null;
            }

            // Get owner document from context
            const ownerDoc = exprContext.nodeList && exprContext.nodeList.length > 0 
                ? exprContext.nodeList[0].ownerDocument 
                : null;

            // Convert XPathNode interface tree to actual XNode objects
            const convertedNode = this.convertXPathNodeToXNode(xpathNode, ownerDoc);
            
            // Return as array for consistency with xpath processor
            return convertedNode ? [convertedNode] : [];
        };

        // system-property() function - XSLT specific (Section 12.4)
        // Signature: system-property(context, propertyName)
        functions['system-property'] = (_context: XPathContext, propertyName: any) => {
            const propName = String(propertyName);

            // Required system properties per XSLT 1.0 spec
            const systemProperties: Record<string, string> = {
                'xsl:version': exprContext.xsltVersion || '1.0',
                'xsl:vendor': 'Design Liquido',
                'xsl:vendor-url': 'https://github.com/DesignLiquido/xslt-processor'
            };

            // Check custom system properties from context
            if (exprContext.systemProperties && exprContext.systemProperties[propName]) {
                return exprContext.systemProperties[propName];
            }

            return systemProperties[propName] || '';
        };

        // element-available() function - XSLT specific (Section 15)
        // Signature: element-available(context, elementName)
        functions['element-available'] = (_context: XPathContext, elementName: any) => {
            const name = String(elementName);

            // List of supported XSLT 1.0 elements
            const xsltElements = [
                'xsl:apply-imports',
                'xsl:apply-templates',
                'xsl:attribute',
                'xsl:attribute-set',
                'xsl:call-template',
                'xsl:choose',
                'xsl:comment',
                'xsl:copy',
                'xsl:copy-of',
                'xsl:decimal-format',
                'xsl:element',
                'xsl:fallback',
                'xsl:for-each',
                'xsl:if',
                'xsl:import',
                'xsl:include',
                'xsl:key',
                'xsl:message',
                'xsl:namespace-alias',
                'xsl:number',
                'xsl:otherwise',
                'xsl:output',
                'xsl:param',
                'xsl:preserve-space',
                'xsl:processing-instruction',
                'xsl:sort',
                'xsl:strip-space',
                'xsl:stylesheet',
                'xsl:template',
                'xsl:text',
                'xsl:transform',
                'xsl:value-of',
                'xsl:variable',
                'xsl:when',
                'xsl:with-param'
            ];

            // Handle with or without prefix
            const normalizedName = name.startsWith('xsl:') ? name : `xsl:${name}`;
            return xsltElements.includes(normalizedName) || xsltElements.includes(name);
        };

        // function-available() function - XSLT specific (Section 15)
        // Signature: function-available(context, functionName)
        functions['function-available'] = (_context: XPathContext, functionName: any) => {
            const name = String(functionName);

            // Core XPath 1.0 functions
            const xpathCoreFunctions = [
                'boolean', 'ceiling', 'concat', 'contains', 'count',
                'false', 'floor', 'id', 'lang', 'last', 'local-name',
                'name', 'namespace-uri', 'normalize-space', 'not', 'number',
                'position', 'round', 'starts-with', 'string', 'string-length',
                'substring', 'substring-after', 'substring-before', 'sum',
                'translate', 'true'
            ];

            // XSLT 1.0 additional functions
            const xsltFunctions = [
                'current', 'document', 'element-available', 'format-number',
                'function-available', 'generate-id', 'key', 'system-property',
                'unparsed-entity-uri'
            ];

            // Additional functions supported by this processor
            const additionalFunctions = [
                'matches', 'ends-with', 'xml-to-json', 'json-to-xml'
            ];

            const allFunctions = [...xpathCoreFunctions, ...xsltFunctions, ...additionalFunctions];
            return allFunctions.includes(name);
        };

        // document() function - XSLT specific (Section 12.1)
        // Signature: document(context, uriOrNodeSet, baseNode?)
        // Note: This is a basic implementation. Full implementation requires document loading.
        functions['document'] = (_context: XPathContext, uriOrNodeSet: any, _baseNode?: any) => {
            // If a document loader is provided in context, use it
            if (exprContext.documentLoader) {
                const uri = Array.isArray(uriOrNodeSet)
                    ? (uriOrNodeSet[0]?.textContent || String(uriOrNodeSet[0] || ''))
                    : String(uriOrNodeSet || '');

                if (!uri) {
                    // Empty string returns the current document
                    return exprContext.root ? [this.adaptXNode(exprContext.root)] : [];
                }

                try {
                    const doc = exprContext.documentLoader(uri);
                    if (doc) {
                        return [this.adaptXNode(doc)];
                    }
                } catch (e) {
                    // Document loading failed, return empty node-set
                    console.warn(`document() failed to load: ${uri}`, e);
                }
            }

            // Return empty node-set if no document loader or loading failed
            return [];
        };

        // unparsed-entity-uri() function - XSLT specific (Section 12.4)
        // Signature: unparsed-entity-uri(context, entityName)
        // Note: This requires DTD parsing support which is not commonly available in JavaScript
        functions['unparsed-entity-uri'] = (_context: XPathContext, entityName: any) => {
            const name = String(entityName);

            // Check if unparsed entities are provided in context
            if (exprContext.unparsedEntities && exprContext.unparsedEntities[name]) {
                return exprContext.unparsedEntities[name];
            }

            // Return empty string if entity not found (per XSLT spec)
            return '';
        };

        return functions;
    }

    /**
     * Convert an XPathNode interface tree to actual XNode objects.
     * This is needed to convert json-to-xml() output to XSLT-compatible nodes.
     */
    private convertXPathNodeToXNode(xpathNode: XPathNode, ownerDoc?: any): XNode | null {
        if (!xpathNode) {
            return null;
        }

        const { XNode: XNodeClass } = require('../dom');
        const { DOM_DOCUMENT_NODE, DOM_TEXT_NODE, DOM_ELEMENT_NODE } = require('../constants');

        let node: XNode;

        if (xpathNode.nodeType === DOM_DOCUMENT_NODE) {
            // For document nodes, extract and return the root element
            if (xpathNode.childNodes && xpathNode.childNodes.length > 0) {
                const rootChild = xpathNode.childNodes[0] as any;
                node = this.convertXPathNodeToXNode(rootChild, ownerDoc);
                return node;
            }
            return null;
        } else if (xpathNode.nodeType === DOM_TEXT_NODE) {
            // Create a text node
            const textContent = xpathNode.textContent || '';
            node = new XNodeClass(
                DOM_TEXT_NODE,
                '#text',
                textContent,
                ownerDoc
            );
        } else {
            // Element node (DOM_ELEMENT_NODE)
            node = new XNodeClass(
                DOM_ELEMENT_NODE,
                xpathNode.nodeName || 'element',
                '',
                ownerDoc
            );

            // Copy namespace URI if present
            if (xpathNode.namespaceUri) {
                node.namespaceUri = xpathNode.namespaceUri;
            }

            // Recursively convert child nodes
            if (xpathNode.childNodes && xpathNode.childNodes.length > 0) {
                for (let i = 0; i < xpathNode.childNodes.length; i++) {
                    const childXPathNode = xpathNode.childNodes[i] as any;
                    const childXNode = this.convertXPathNodeToXNode(childXPathNode, ownerDoc);
                    if (childXNode) {
                        childXNode.parentNode = node;
                        node.childNodes.push(childXNode);
                    }
                }
                if (node.childNodes.length > 0) {
                    node.firstChild = node.childNodes[0];
                    node.lastChild = node.childNodes[node.childNodes.length - 1];
                }
            }
        }

        return node;
    }

    /**
     * Convert an XML node to a JSON string representation.
     * This is a simplified implementation of XSLT 3.0's xml-to-json().
     */
    private xmlToJson(node: any): string {
        if (!node) {
            return '""';
        }

        // Use the well-tested xmlValue function which handles all node types correctly
        // Pass true to disable browser-specific optimizations since we're in Node.js
        const textContent = xmlValue(node as XNode, true);
        return JSON.stringify(textContent);
    }

    /**
     * Wrap XPath result in appropriate NodeValue type.
     */
    wrapResult(result: XPathResult, exprContext: ExprContext): NodeValue {
        if (Array.isArray(result)) {
            // Node set - nodes are already XNodes (we use them directly)
            const xnodes = result.map(node => this.xPathNodeToXNode(node)).filter(n => n !== null) as XNode[];
            return new NodeSetValue(xnodes);
        }

        if (typeof result === 'string') {
            return new StringValue(result);
        }

        if (typeof result === 'number') {
            return new NumberValue(result);
        }

        if (typeof result === 'boolean') {
            return new BooleanValue(result);
        }

        // Default to empty node set
        return new NodeSetValue([]);
    }

    /**
     * Clear any internal state if needed.
     */
    clearCache() {
        // No caches to clear now that we use XNodes directly
    }
}

/**
 * XPath class that uses the new lexer/parser implementation
 * while maintaining API compatibility with the old implementation.
 */
export class XPath {
    private lexer: XPathLexer;
    private parser: XPath10Parser;
    private nodeConverter: NodeConverter;
    private parseCache: Map<string, Expression> = new Map();

    constructor() {
        // Use XPath 1.0 for backward compatibility with XSLT 1.0
        this.lexer = new XPathLexer('1.0');
        this.parser = new XPath10Parser();
        this.nodeConverter = new NodeConverter();
    }

    /**
     * Parse an XPath expression and return an Expression object.
     * @param expression The XPath expression string.
     * @param axis Optional axis override for relative paths.
     */
    xPathParse(expression: string, axis?: string): Expression {
        const cacheKey = `${expression}:${axis || ''}`;

        if (this.parseCache.has(cacheKey)) {
            return this.parseCache.get(cacheKey)!;
        }

        const tokens = this.lexer.scan(expression);
        const xpathExpr = this.parser.parse(tokens);

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
        const expression = this.xPathParse(select);
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
