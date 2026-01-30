import { ExprContext } from "../expr-context";
import { XNode } from "../../dom";
import { XPathContext, XPathResult, createContext } from "../lib/src/context";
import { XPathNode } from "../lib/src/node";
import { NodeSetValue } from "../values/node-set-value";
import { StringValue } from "../values/string-value";
import { NumberValue } from "../values/number-value";
import { BooleanValue } from "../values/boolean-value";
import { MapValue } from "../values/map-value";
import { ArrayValue } from "../values/array-value";
import { FunctionValue } from "../values/function-value";
import { NodeValue } from "../values";
import { JsonToXmlConverter } from "../lib/src/expressions/json-to-xml-converter";
import { xmlValue } from "../../dom";
import { DOM_DOCUMENT_NODE, DOM_TEXT_NODE, DOM_ELEMENT_NODE, DOM_ATTRIBUTE_NODE, DOM_COMMENT_NODE, DOM_PROCESSING_INSTRUCTION_NODE } from "../../constants";

/**
 * Handles conversion between ExprContext and XPathContext.
 * Uses XNode directly as XPathNode-compatible objects to preserve node identity.
 */
export class NodeConverter {
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
                } else if (nodeValue.type === 'map') {
                    variables[name] = nodeValue.value;
                } else if (nodeValue.type === 'array') {
                    variables[name] = nodeValue.value;
                } else if (nodeValue.type === 'function') {
                    variables[name] = nodeValue.value;
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
                    const warn = exprContext.warningsCallback ?? console.warn;
                    warn(`document() failed to load: ${uri}`, e);
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
            node = new XNode(
                DOM_TEXT_NODE,
                '#text',
                textContent,
                ownerDoc
            );
        } else {
            // Element node (DOM_ELEMENT_NODE)
            node = new XNode(
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
        if (result === null || result === undefined) {
            return new NodeSetValue([]);
        }

        if (Array.isArray(result)) {
            // Node set - nodes are already XNodes (we use them directly)
            // But we must distinguish between node-set and sequence of other items.
            // If it's a sequence of nodes, we treat it as NodeSetValue.
            const nodes = result.map(node => this.xPathNodeToXNode(node)).filter(n => n !== null) as XNode[];
            
            // If we have nodes OR it's an empty sequence, default to NodeSetValue for backward compatibility
            // In XPath 1.0, everything was a node-set (or primitive).
            if (nodes.length > 0 || result.length === 0) {
                return new NodeSetValue(nodes);
            }
            
            // If it's a sequence of non-nodes, we should ideally have a SequenceValue.
            // For now, let's treat it as a StringValue joined by space (common XSLT 2.0 behavior for sequences in some contexts)
            // or just take the first item's string value.
            return new StringValue(result.map(item => String(item)).join(' '));
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

        if (typeof result === 'object') {
            if ((result as any).__isMap) {
                return new MapValue(result);
            }
            if ((result as any).__isArray) {
                return new ArrayValue(result);
            }
            if ((result as any).__isFunctionItem) {
                return new FunctionValue(result);
            }
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