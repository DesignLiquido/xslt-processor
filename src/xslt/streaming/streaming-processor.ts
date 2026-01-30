/**
 * XSLT 3.0 Streaming Processor
 * 
 * Encapsulates the streaming-related XSLT instructions:
 * - xsl:stream
 * - xsl:fork
 * - xsl:merge
 * 
 * This class coordinates streaming context, copy management, and merge operations.
 */

import { XNode } from "../../dom/xnode";
import { ExprContext } from "../../xpath/expr-context";
import { XPath } from "../../xpath/xpath";
import { xmlGetAttribute } from "../../dom/xml-functions";
import { StreamingContext } from "./streaming-context";
import { StreamingCopyManager } from "./streaming-copy-manager";
import { StreamingMergeCoordinator } from "./streaming-merge-coordinator";
import { StreamingParserInterface } from "./streaming-parser-interface";
import { StreamingParserBase } from "./streaming-parser-base";
import { StreamablePatternValidator } from "./streamable-pattern-validator";
import { StreamingModeDetector } from "./streaming-mode-detector";
import { StreamingEventInterface } from "./streaming-event-interface";
import { MergeSourceInterface } from "./merge-source-interface";

/**
 * Configuration options for the streaming processor.
 */
export interface StreamingProcessorOptions {
    /** Reference to XPath evaluator for expression evaluation */
    xPath: XPath;
    /** XSLT version being processed */
    version: string;
}

/**
 * Callback interface for processing child nodes during streaming.
 */
export interface StreamingChildProcessor {
    /**
     * Process child nodes of a template element.
     * @param context Expression context
     * @param template Template node containing children
     * @param output Output node for results
     */
    processChildren(context: ExprContext, template: XNode, output?: XNode): Promise<void>;
    
    /**
     * Check if a node is an XSLT element with the given local name.
     * @param node Node to check
     * @param name Optional local name to match
     */
    isXsltElement(node: XNode, name?: string): boolean;
}

/**
 * Streaming processor for XSLT 3.0 streaming instructions.
 * Delegates to specialized managers for different streaming operations.
 */
export class StreamingProcessor {
    /** Streaming context for tracking state during streaming */
    private context: StreamingContext = new StreamingContext();
    
    /** Copy manager for xsl:fork operations */
    private copyManager: StreamingCopyManager = new StreamingCopyManager();
    
    /** Merge coordinator for xsl:merge operations */
    private mergeCoordinator: StreamingMergeCoordinator = new StreamingMergeCoordinator();
    
    /** Whether streaming is currently enabled */
    private enabled: boolean = false;
    
    /** Streaming parser implementation */
    private parser: StreamingParserInterface = new StreamingParserBase();
    
    /** XPath evaluator reference */
    private xPath: XPath;
    
    /** XSLT version */
    private version: string;

    constructor(options: StreamingProcessorOptions) {
        this.xPath = options.xPath;
        this.version = options.version;
    }

    /**
     * Update the version (called when version is determined from stylesheet).
     */
    setVersion(version: string): void {
        this.version = version;
    }

    /**
     * Check if streaming is currently enabled.
     */
    isEnabled(): boolean {
        return this.enabled;
    }

    /**
     * Get the streaming context.
     */
    getContext(): StreamingContext {
        return this.context;
    }

    /**
     * Get the copy manager.
     */
    getCopyManager(): StreamingCopyManager {
        return this.copyManager;
    }

    /**
     * Get the merge coordinator.
     */
    getMergeCoordinator(): StreamingMergeCoordinator {
        return this.mergeCoordinator;
    }

    /**
     * Set a custom streaming parser implementation.
     */
    setParser(parser: StreamingParserInterface): void {
        this.parser = parser;
    }

    /**
     * Validate that a pattern is streamable.
     */
    validatePattern(pattern: string): { isStreamable: boolean; issues: string[] } {
        return StreamablePatternValidator.validatePattern(pattern);
    }

    /**
     * Detect the streaming mode for a template.
     */
    detectMode(templateNode: XNode): ReturnType<typeof StreamingModeDetector.detectMode> {
        return StreamingModeDetector.detectMode(templateNode);
    }

    /**
     * Implements `<xsl:stream>` (XSLT 3.0 Section 16).
     * Enables streaming processing of large documents.
     * 
     * @param exprContext The Expression Context.
     * @param template The xsl:stream element.
     * @param output The output node.
     * @param childProcessor Callback for processing child nodes.
     */
    async processStream(
        exprContext: ExprContext,
        template: XNode,
        output: XNode | undefined,
        childProcessor: StreamingChildProcessor
    ): Promise<void> {
        // Check XSLT version
        if (!this.version || parseFloat(this.version) < 3.0) {
            throw new Error('<xsl:stream> is only supported in XSLT 3.0 or later.');
        }

        // Get select attribute (required)
        const select = xmlGetAttribute(template, 'select');
        if (!select) {
            throw new Error('<xsl:stream> requires a "select" attribute specifying the input document.');
        }

        // Enable streaming mode
        const previouslyEnabled = this.enabled;
        this.enabled = true;
        this.context.startStreaming();

        try {
            // Evaluate select to get document(s) to stream
            const contextClone = exprContext.clone();
            const selectedValue = this.xPath.xPathEval(select, contextClone);

            // Process selected document(s) in streaming mode
            let nodes: XNode[] = [];
            if (selectedValue.type === 'node-set') {
                nodes = selectedValue.nodeSetValue();
            } else if (selectedValue.type === 'node') {
                nodes = [selectedValue] as any as XNode[];
            }

            // For each selected node, process its children with streaming
            for (const node of nodes) {
                await childProcessor.processChildren(exprContext, template, output);
            }
        } finally {
            // Disable streaming mode
            this.enabled = previouslyEnabled;
            this.context.endStreaming();
            this.copyManager.clear();
        }
    }

    /**
     * Implements `<xsl:fork>` (XSLT 3.0 Section 17).
     * Creates multiple independent output branches from the input stream.
     * 
     * @param exprContext The Expression Context.
     * @param template The xsl:fork element.
     * @param output The output node.
     * @param childProcessor Callback for processing child nodes.
     */
    async processFork(
        exprContext: ExprContext,
        template: XNode,
        output: XNode | undefined,
        childProcessor: StreamingChildProcessor
    ): Promise<void> {
        // Check that we're in streaming mode
        if (!this.enabled) {
            throw new Error('<xsl:fork> can only be used within <xsl:stream>.');
        }

        // Process each xsl:fork-sequence child
        for (const child of template.childNodes) {
            if (childProcessor.isXsltElement(child, 'fork-sequence')) {
                // Each fork-sequence creates an independent branch
                const copy = this.copyManager.createCopy(async (event: StreamingEventInterface) => {
                    // Process the fork-sequence with the streaming events
                    await childProcessor.processChildren(exprContext, child, output);
                });

                // Register copy with context for event distribution
                this.context.registerCopy(copy);

                // Distribute events from stream to this copy
                // Full implementation would integrate with the streaming parser
            }
        }
    }

    /**
     * Implements `<xsl:merge>` (XSLT 3.0 Section 15).
     * Merges multiple sorted input sequences.
     * 
     * @param exprContext The Expression Context.
     * @param template The xsl:merge element.
     * @param output The output node.
     * @param childProcessor Callback for processing child nodes.
     */
    async processMerge(
        exprContext: ExprContext,
        template: XNode,
        output: XNode | undefined,
        childProcessor: StreamingChildProcessor
    ): Promise<void> {
        // Check XSLT version
        if (!this.version || parseFloat(this.version) < 3.0) {
            throw new Error('<xsl:merge> is only supported in XSLT 3.0 or later.');
        }

        // Get merge sources from xsl:merge-source children
        const sources: MergeSourceInterface[] = [];
        for (const child of template.childNodes) {
            if (childProcessor.isXsltElement(child, 'merge-source')) {
                const selectAttr = xmlGetAttribute(child, 'select');
                if (!selectAttr) {
                    throw new Error('<xsl:merge-source> requires a "select" attribute.');
                }

                // Create merge source
                const source: MergeSourceInterface = {
                    select: selectAttr,
                    mergeKeys: [],
                    position: 0,
                    isExhausted: false,
                    buffer: []
                };

                // Get merge keys from xsl:merge-key children
                for (const keyChild of child.childNodes) {
                    if (childProcessor.isXsltElement(keyChild, 'merge-key')) {
                        const keySelect = xmlGetAttribute(keyChild, 'select');
                        const order = (xmlGetAttribute(keyChild, 'order') || 'ascending') as 'ascending' | 'descending';

                        source.mergeKeys.push({
                            select: keySelect || '.',
                            order
                        });
                    }
                }

                // Evaluate the select expression to populate the buffer
                const result = this.xPath.xPathEval(selectAttr, exprContext);
                const nodes = result.nodeSetValue ? result.nodeSetValue() : [];
                source.buffer = Array.isArray(nodes) ? nodes.slice() : (nodes ? [nodes] : []);
                source.isExhausted = source.buffer.length === 0;

                sources.push(source);
            }
        }

        if (sources.length === 0) {
            throw new Error('<xsl:merge> requires at least one <xsl:merge-source> child element.');
        }

        // Add sources to coordinator
        for (const source of sources) {
            this.mergeCoordinator.addSource(source);
        }

        try {
            // Process merge groups - iterate through all items in sources
            // For a basic implementation, we process merge-action once for each source that has data
            let hasData = sources.some(s => s.buffer.length > 0);
            
            if (hasData) {
                // For each source that has items, process the merge-action
                for (const source of sources) {
                    while (source.buffer.length > 0) {
                        const item = source.buffer.shift();
                        
                        // Create context with the current merge item
                        const mergeContext = exprContext.clone([item], 0);
                        
                        // Process merge group with xsl:merge-action
                        for (const child of template.childNodes) {
                            if (childProcessor.isXsltElement(child, 'merge-action')) {
                                await childProcessor.processChildren(mergeContext, child, output);
                            }
                        }
                    }
                    source.isExhausted = true;
                }
            }
        } finally {
            this.mergeCoordinator.clear();
        }
    }

    /**
     * Clear all streaming state.
     */
    reset(): void {
        this.enabled = false;
        this.context.endStreaming();
        this.copyManager.clear();
        this.mergeCoordinator.clear();
    }
}
