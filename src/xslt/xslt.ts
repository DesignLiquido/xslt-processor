// Copyright 2023-2026 Design Liquido
// Copyright 2018 Johannes Wilm
// Copyright 2005 Google Inc.
// All Rights Reserved
//
// Original author: Steffen Meschkat <mesch@google.com>

import {
    XDocument,
    XNode,
    XmlParser,
    domAppendChild,
    domCreateCDATASection,
    domCreateComment,
    domCreateDocumentFragment,
    domCreateElement,
    domCreateProcessingInstruction,
    domCreateTextNode,
    domGetAttributeValue,
    domSetAttribute,
    xmlGetAttribute,
    xmlTransformedText,
    xmlToJson,
    detectAdaptiveOutputFormat,
    xmlValue,
    xmlValueLegacyBehavior
} from '../dom';
import { ExprContext, XPath, MatchResolver } from '../xpath';

import {
    DOM_ATTRIBUTE_NODE,
    DOM_CDATA_SECTION_NODE,
    DOM_COMMENT_NODE,
    DOM_DOCUMENT_FRAGMENT_NODE,
    DOM_DOCUMENT_NODE,
    DOM_ELEMENT_NODE,
    DOM_PROCESSING_INSTRUCTION_NODE,
    DOM_TEXT_NODE
} from '../constants';

import { StringValue, NodeSetValue, NodeValue, NumberValue, BooleanValue } from '../xpath/values';
import { XsltDecimalFormatSettings, XsltOptions } from './types';
import { 
    PackageRegistry, 
    XsltPackageInterface, 
    PackageComponentInterface, 
    UsedPackageInterface,
    ComponentVisibility,
    ComponentType,
    ModeProperties,
    makeComponentKey,
    isComponentVisible,
    canOverrideComponent
} from './package-system';
import {
    StreamingProcessor,
    StreamingChildProcessor
} from './streaming';
import {
    collectAndExpandTemplates,
    selectBestTemplate,
    emitConflictWarning
} from './functions';

import {
    AccumulatorDefinition,
    AccumulatorRule,
    AccumulatorState,
    AccumulatorRegistry
} from './xslt-accumulator';
import { TemplatePriorityInterface } from './template-mechanics';

/**
 * Metadata about a stylesheet in the import hierarchy.
 * Used to track template precedence for apply-imports.
 */
interface StylesheetMetadata {
    /** Import depth: 0 = main stylesheet, 1+ = imported stylesheets */
    importDepth: number;
    /** Source URI/href of the stylesheet */
    href: string;
    /** Order in which stylesheet was encountered (for stable sorting) */
    order: number;
}

/**
 * Context information about a currently executing template.
 * Used by apply-imports to find the next lower-precedence template.
 */
interface CurrentTemplateContext {
    /** The template XNode being executed */
    template: XNode;
    /** Import depth of the stylesheet containing this template */
    stylesheetDepth: number;
    /** Mode of the template (null for default mode) */
    mode: string | null;
    /** Match pattern of the template */
    match: string | null;
}

interface WhitespacePattern {
    namespaceUri: string | null;
    localName: string;
    isWildcard: boolean;
}

/**
 * The main class for XSL-T processing.
 *
 * References:
 *
 * [XSLT 1.0] XSL Transformations (XSLT) Version 1.0
 * <https://www.w3.org/TR/1999/REC-xslt-19991116>.
 *
 * [XSLT 2.0] XSL Transformations (XSLT) Version 2.0
 * <https://www.w3.org/TR/xslt20/>.
 *
 * [XSLT 3.0] XSL Transformations (XSLT) Version 3.0
 * <https://www.w3.org/TR/xslt-30/>.
 *
 * [ECMA] ECMAScript Language Specification
 * <http://www.ecma-international.org/publications/standards/Ecma-262.htm>.
 *
 * The XSL processor API has one entry point: the async function
 * `xsltProcess()`. It receives as arguments the input XML document
 * and the XSL-T stylesheet document (both as `XDocument` instances),
 * and returns the transformed output as a string (XML, HTML, JSON,
 * or plain text depending on the output method).
 *
 * NOTE: Strictly speaking, XSL-T processing according to the specification
 * is defined as operation on text documents, not as operation on DOM
 * trees. This implementation operates on an internal DOM representation,
 * complemented by an XML parser and serializer to be complete. Those two
 * are found in the `dom` folder.
 */
export class Xslt {
    xPath: XPath;
    xmlParser: XmlParser;
    matchResolver: MatchResolver;
    options: XsltOptions;
    decimalFormatSettings: XsltDecimalFormatSettings;
    warningsCallback: (...args: any[]) => void;

    /**
     * Custom fetch function for loading external resources (e.g. xsl:import, xsl:include).
     * Takes a URI and returns the fetched content as a string.
     * Defaults to using the global `fetch` API.
     */
    fetchFunction: (uri: string) => Promise<string>;

    outputDocument: XDocument;
    outputMethod: 'xml' | 'html' | 'text' | 'name' | 'xhtml' | 'json' | 'adaptive';
    outputOmitXmlDeclaration: string;
    outputVersion: string;
    itemSeparator: string;
    version: string;
    firstTemplateRan: boolean;

    /**
     * Forwards-compatible processing mode (XSLT 1.0 Section 2.5).
     * When true, the processor is running a stylesheet with version > 1.0.
     * In this mode:
     * - Unknown top-level elements are silently ignored
     * - Unknown XSLT instructions use xsl:fallback if available, otherwise are ignored
     * - Unknown attributes on XSLT elements are ignored
     */
    forwardsCompatible: boolean;

    /**
     * List of element name patterns from xsl:strip-space declarations.
     * Whitespace-only text nodes inside matching elements will be stripped.
     */
    stripSpacePatterns: WhitespacePattern[];

    /**
     * List of element name patterns from xsl:preserve-space declarations.
     * Whitespace-only text nodes inside matching elements will be preserved.
     * preserve-space takes precedence over strip-space for conflicting patterns.
     */
    preserveSpacePatterns: WhitespacePattern[];

    /**
     * Namespace aliases from xsl:namespace-alias declarations.
     * Maps stylesheet namespace prefixes to result namespace prefixes.
     */
    namespaceAliases: Map<string, string>;

    /**
     * Set of supported extension element namespaces.
     * Processors can register custom extension namespaces here.
     * Currently only XSLT namespace is auto-registered.
     */
    supportedExtensions: Set<string>;

    /**
     * Map of attribute sets defined in the stylesheet.
     * Keys are attribute set names, values are arrays of xsl:attribute nodes.
     */
    attributeSets: Map<string, XNode[]>;

    /**
     * Map of user-defined functions from xsl:function declarations.
     * Keys are QNames (namespace:localname), values are the function definition nodes.
     */
    userDefinedFunctions: Map<string, XNode>;

    /**
     * Result documents created by xsl:result-document.
     * Keys are the href URIs, values are the serialized output strings.
     */
    resultDocuments: Map<string, string>;

    /**
     * Stack of stylesheet metadata for tracking import hierarchy.
     * Used by apply-imports to find templates from imported stylesheets.
     */
    private styleSheetStack: StylesheetMetadata[] = [];

    /**
     * Map of imported stylesheet HREFs to their parsed XNodes.
     * Prevents duplicate imports and allows precedence tracking.
     */
    private importedStylesheets: Map<string, XNode> = new Map();

    /**
     * Map templates to the stylesheet they came from.
     * Enables apply-imports to find templates by import precedence.
     */
    private templateSourceMap: Map<XNode, StylesheetMetadata> = new Map();

    /**
     * Stack of currently executing templates with their metadata.
     * Used by apply-imports to determine which template called it.
     */
    private currentTemplateStack: CurrentTemplateContext[] = [];

        /**
         * Package registry for XSLT 3.0 package system.
         * Manages loaded packages and their components.
         */
        private packageRegistry: PackageRegistry = new PackageRegistry();

        /**
         * Callback for loading external packages.
         * Called when a package is not found in the registry.
         */
        private packageLoader?: (uri: string, version?: string) => Promise<XNode | null>;

        /**
         * Current package being processed (for XSLT 3.0).
         * null if processing a non-package stylesheet.
         */
        private currentPackage: XsltPackageInterface | null = null;

        /**
         * Current override context (for XSLT 3.0 xsl:original).
         * Tracks the original component when executing an override.
         */
        private currentOverrideContext: PackageComponentInterface | null = null;

        /**
         * Accumulator registry for XSLT 3.0 accumulators.
         * Stores accumulator definitions and current state during processing.
         */
        private accumulatorRegistry: AccumulatorRegistry = new AccumulatorRegistry();

    /**
     * Streaming processor for XSLT 3.0 streaming processing.
     * Encapsulates streaming context, copy management, and merge coordination.
     */
    private streamingProcessor: StreamingProcessor;

    constructor(
        options: Partial<XsltOptions> = {
            cData: true,
            escape: true,
            selfClosingTags: true,
            parameters: []
        }
    ) {
        this.xPath = new XPath();
        this.xmlParser = new XmlParser();
        this.matchResolver = new MatchResolver();
        this.options = {
            cData: options.cData === true,
            escape: options.escape === true,
            selfClosingTags: options.selfClosingTags === true,
            outputMethod: options.outputMethod,
            parameters: options.parameters || []
        };
        this.outputMethod = options.outputMethod || 'xml';
        this.outputOmitXmlDeclaration = 'no';
        this.outputVersion = '';
        this.itemSeparator = '';
        this.stripSpacePatterns = [];
        this.preserveSpacePatterns = [];
        this.namespaceAliases = new Map();
        this.supportedExtensions = new Set(['http://www.w3.org/1999/XSL/Transform']);
        this.attributeSets = new Map();
        this.userDefinedFunctions = new Map();
        this.resultDocuments = new Map();
        this.decimalFormatSettings = {
            decimalSeparator: '.',
            groupingSeparator: ',',
            infinity: 'Infinity',
            minusSign: '-',
            naN: 'NaN',
            percent: '%',
            perMille: '‰',
            zeroDigit: '0',
            digit: '#',
            patternSeparator: ';'
        };
        this.firstTemplateRan = false;
        this.forwardsCompatible = false;
        this.warningsCallback = console.warn.bind(console);
        this.fetchFunction = options.fetchFunction || (async (uri: string) => {
            const globalFetch =
                typeof globalThis !== 'undefined' && typeof (globalThis as any).fetch === 'function'
                    ? (globalThis as any).fetch
                    : null;

            if (!globalFetch) {
                throw new Error(
                    'No global fetch implementation available. ' +
                    'Please provide options.fetchFunction or use a runtime that exposes globalThis.fetch.'
                );
            }

            const response = await globalFetch(uri);
            return response.text();
        });
        this.streamingProcessor = new StreamingProcessor({
            xPath: this.xPath,
            version: ''
        });
    }

    /**
     * The exported entry point of the XSL-T processor.
     * @param xmlDoc The input document root, as DOM node.
     * @param stylesheet The stylesheet document root, as DOM node.
     * @returns the processed document, as XML text in a string, JSON string if outputMethod is 'json', or text if outputMethod is 'text' or 'adaptive' (with text content).
     */
    async xsltProcess(xmlDoc: XDocument, stylesheet: XDocument) {
        const outputDocument = await this.xsltProcessToDocument(xmlDoc, stylesheet);

        // Handle JSON output format
        if (this.outputMethod === 'json') {
            return xmlToJson(outputDocument);
        }

        // Handle adaptive output format
        let outputMethod = this.outputMethod;
        if (this.outputMethod === 'adaptive') {
            outputMethod = detectAdaptiveOutputFormat(outputDocument);
        }

        // Support HTML5 output (method="html" version="5.0")
        // Keep method as 'html' for serialization, but track version for HTML5-specific handling
        let serializationMethod = outputMethod;
        if (outputMethod === 'html' && this.outputVersion === '5.0') {
            // HTML5 uses method="html" with version="5.0"
            serializationMethod = 'html';
        }

        const transformedOutputXml: string = xmlTransformedText(outputDocument, {
            cData: this.options.cData,
            escape: this.options.escape,
            selfClosingTags: this.options.selfClosingTags,
            outputMethod: serializationMethod as 'xml' | 'html' | 'text' | 'xhtml',
            outputVersion: this.outputVersion,
            itemSeparator: this.itemSeparator
        });

        return transformedOutputXml;
    }

    /**
     * Processes the XSLT transformation and returns the output as an XDocument
     * instead of a serialized string. This is useful for:
     * - Working with the result tree programmatically
     * - Converting to a different DOM representation (e.g., React elements)
     * - Using browser-native serialization (XMLSerializer) if desired
     *
     * @param xmlDoc The input document root, as DOM node.
     * @param stylesheet The stylesheet document root, as DOM node.
     * @returns The processed document as an XDocument tree.
     */
    async xsltProcessToDocument(xmlDoc: XDocument, stylesheet: XDocument): Promise<XDocument> {
        const outputDocument = new XDocument();
        this.outputDocument = outputDocument;
        const expressionContext = new ExprContext([xmlDoc]);
        expressionContext.warningsCallback = this.warningsCallback;

        if (this.options.parameters.length > 0) {
            for (const parameter of this.options.parameters) {
                expressionContext.setVariable(parameter.name, new StringValue(parameter.value));
            }
        }

        await this.xsltProcessContext(expressionContext, stylesheet, this.outputDocument);

        return outputDocument;
    }

    /**
     * The main entry point of the XSL-T processor, as explained on the top of the file.
     * @param context The input document root, as XPath `ExprContext`.
     * @param template The stylesheet document root, as DOM node.
     * @param output If set, the output where the transformation should occur.
     */
    protected async xsltProcessContext(context: ExprContext, template: XNode, output?: XNode) {
        if (!context.warningsCallback) {
            context.warningsCallback = this.warningsCallback;
        }
        if (!this.isXsltElement(template)) {
            // Check if this is an unsupported extension element
            if (
                template.nodeType === DOM_ELEMENT_NODE &&
                !this.isExtensionElementSupported(template)
            ) {
                // This is an extension element - handle with fallback support
                await this.xsltExtensionElement(context, template, output);
            } else {
                // Regular literal result element
                await this.xsltPassThrough(context, template, output);
            }
        } else {
            let node: XNode,
                select: any,
                value: any,
                nodes: XNode[];
            switch (template.localName) {
                case 'apply-imports':
                    await this.xsltApplyImports(context, template, output);
                    break;
                case 'apply-templates':
                    await this.xsltApplyTemplates(context, template, output);
                    break;
                case 'analyze-string':
                    await this.xsltAnalyzeString(context, template, output);
                    break;
                case 'attribute':
                    await this.xsltAttribute(context, template, output);
                    break;
                case 'attribute-set':
                    // attribute-set declarations are processed during stylesheet initialization
                    // in collectAttributeSets(). This case is skipped.
                    break;
                case 'call-template':
                    await this.xsltCallTemplate(context, template, output);
                    break;
                case 'choose':
                    await this.xsltChoose(context, template, output);
                    break;
                case 'comment':
                    await this.xsltComment(context, template, output);
                    break;
                case 'copy':
                    node = this.xsltCopy(output || this.outputDocument, context.nodeList[context.position]);
                    if (node) {
                        await this.xsltChildNodes(context, template, node);
                    }
                    break;
                case 'copy-of':
                    select = xmlGetAttribute(template, 'select');
                    value = this.xPath.xPathEval(select, context);
                    const destinationNode = output || this.outputDocument;
                    if (value.type === 'node-set') {
                        nodes = value.nodeSetValue();
                        for (let i = 0; i < nodes.length; ++i) {
                            this.xsltCopyOf(destinationNode, nodes[i]);
                        }
                    } else {
                        let node = domCreateTextNode(this.outputDocument, value.stringValue());
                        node.siblingPosition = destinationNode.childNodes.length;
                        domAppendChild(destinationNode, node);
                    }
                    break;
                case 'accumulator':
                    this.xsltAccumulator(context, template);
                    break;
                case 'accumulator-rule':
                    // xsl:accumulator-rule is handled inside xsltAccumulator.
                    throw new Error(`<xsl:accumulator-rule> must be a child of <xsl:accumulator>.`);
                case 'decimal-format':
                    this.xsltDecimalFormat(context, template);
                    break;
                case 'evaluate':
                    await this.xsltEvaluate(context, template, output);
                    break;
                case 'element':
                    await this.xsltElement(context, template, output);
                    break;
                case 'fallback':
                    // Allow fallback only when its parent is an extension element
                    const parent = template.parentNode;
                    const isExtensionParent =
                        parent &&
                        parent.nodeType === DOM_ELEMENT_NODE &&
                        !this.isExtensionElementSupported(parent);

                    if (!isExtensionParent) {
                        throw new Error(
                            '<xsl:fallback> must be a direct child of an extension element'
                        );
                    }

                    // Execute the fallback's children in the current context/output
                    await this.xsltChildNodes(context, template, output);
                    break;
                case 'for-each':
                    await this.xsltForEach(context, template, output);
                    break;
                case 'for-each-group':
                    await this.xsltForEachGroup(context, template, output);
                    break;
                case 'function':
                    // xsl:function is collected during stylesheet initialization
                    // and not executed during template processing
                    this.xsltFunction(context, template);
                    break;
                case 'iterate':
                    await this.xsltIterate(context, template, output);
                    break;
                case 'try':
                    await this.xsltTry(context, template, output);
                    break;
                case 'if':
                    await this.xsltIf(context, template, output);
                    break;
                case 'import':
                    await this.xsltImport(context, template, output);
                    break;
                case 'include':
                    await this.xsltInclude(context, template, output);
                    break;
                case 'key':
                    this.xsltKey(context, template);
                    break;
                case 'matching-substring':
                    // xsl:matching-substring is handled inside xsltAnalyzeString.
                    throw new Error(`<xsl:matching-substring> must be a child of <xsl:analyze-string>.`);
                case 'message':
                    await this.xsltMessage(context, template);
                    break;
                case 'namespace':
                    await this.xsltNamespace(context, template, output);
                    break;
                case 'namespace-alias':
                    this.xsltNamespaceAlias(template);
                    break;
                case 'non-matching-substring':
                    // xsl:non-matching-substring is handled inside xsltAnalyzeString.
                    throw new Error(`<xsl:non-matching-substring> must be a child of <xsl:analyze-string>.`);
                case 'on-empty':
                    // xsl:on-empty is handled inside sequence-generating instructions.
                    throw new Error(`<xsl:on-empty> must be a child of a sequence-generating instruction like <xsl:for-each>, <xsl:for-each-group>, or <xsl:apply-templates>.`);
                case 'on-non-empty':
                    // xsl:on-non-empty is handled inside sequence-generating instructions.
                    throw new Error(`<xsl:on-non-empty> must be a child of a sequence-generating instruction like <xsl:for-each>, <xsl:for-each-group>, or <xsl:apply-templates>.`);
                case 'number':
                    this.xsltNumber(context, template, output);
                    break;
                case 'otherwise':
                    // xsl:otherwise is handled inside xsltChoose. If we reach here,
                    // it means the element was used outside of xsl:choose.
                    throw new Error(`<xsl:otherwise> must be a child of <xsl:choose>.`);
                case 'output':
                    this.outputMethod = xmlGetAttribute(template, 'method') as 'xml' | 'html' | 'text' | 'name';
                    this.outputOmitXmlDeclaration = xmlGetAttribute(template, 'omit-xml-declaration');
                    this.outputVersion = xmlGetAttribute(template, 'version') || '';
                    this.itemSeparator = xmlGetAttribute(template, 'item-separator') || '';
                    break;
                    case 'package':
                        await this.xsltPackage(context, template, output);
                        break;
                    case 'use-package':
                        await this.xsltUsePackage(context, template, output);
                        break;
                    case 'expose':
                        this.xsltExpose(context, template);
                        break;
                    case 'accept':
                        this.xsltAccept(context, template);
                        break;
                    case 'override':
                        await this.xsltOverride(context, template, output);
                        break;
                    case 'original':
                        await this.xsltOriginal(context, template, output);
                        break;
                case 'param':
                    await this.xsltVariable(context, template, false);
                    break;
                case 'preserve-space':
                    this.xsltPreserveSpace(template);
                    break;
                case 'perform-sort':
                    await this.xsltPerformSort(context, template, output);
                    break;
                case 'processing-instruction':
                    await this.xsltProcessingInstruction(context, template, output);
                    break;
                case 'result-document':
                    await this.xsltResultDocument(context, template);
                    break;
                case 'sequence':
                    await this.xsltSequence(context, template, output);
                    break;
                case 'sort':
                    this.xsltSort(context, template);
                    break;
                case 'strip-space':
                    this.xsltStripSpace(template);
                    break;
                case 'stylesheet':
                case 'transform':
                    await this.xsltTransformOrStylesheet(context, template, output);
                    break;
                case 'stream':
                    await this.xsltStream(context, template, output);
                    break;
                case 'fork':
                    await this.xsltFork(context, template, output);
                    break;
                case 'merge':
                    await this.xsltMerge(context, template, output);
                    break;
                case 'mode':
                    // xsl:mode declaration (XSLT 3.0)
                    if (this.currentPackage) {
                        this.xsltMode(context, template);
                    }
                    break;
                case 'template':
                    await this.xsltTemplate(context, template, output);
                    break;
                case 'text':
                    this.xsltText(context, template, output);
                    break;
                case 'value-of':
                    this.xsltValueOf(context, template, output);
                    break;
                case 'variable':
                    await this.xsltVariable(context, template, true);
                    break;
                case 'when':
                    // xsl:when is handled inside xsltChoose. If we reach here,
                    // it means the element was used outside of xsl:choose.
                    throw new Error(`<xsl:when> must be a child of <xsl:choose>.`);
                case 'with-param':
                    // xsl:with-param is handled inside xsltWithParam called from
                    // xsltCallTemplate and xsltApplyTemplates. If we reach here,
                    // it means the element was used outside of those contexts.
                    throw new Error(`<xsl:with-param> must be a child of <xsl:call-template> or <xsl:apply-templates>.`);
                default:
                    // Unknown XSLT element - handle according to forwards-compatible mode (Section 2.5)
                    await this.xsltUnknownInstruction(context, template, output);
            }
        }
    }

    /**
     * Handle unknown XSLT instructions per XSLT 1.0 Section 2.5 (Forwards-Compatible Processing).
     *
     * In forwards-compatible mode (version > 1.0):
     * - If the instruction has an xsl:fallback child, execute the fallback
     * - Otherwise, the instruction is silently ignored
     *
     * In strict mode (version = 1.0):
     * - Unknown instructions are an error
     *
     * @param context The Expression Context
     * @param template The unknown XSLT instruction element
     * @param output The output node
     */
    protected async xsltUnknownInstruction(context: ExprContext, template: XNode, output?: XNode): Promise<void> {
        const elementName = `xsl:${template.localName}`;

        if (this.forwardsCompatible) {
            // Forwards-compatible mode: look for xsl:fallback child
            const fallback = this.getFallbackElement(template);

            if (fallback) {
                // Execute the fallback content
                await this.xsltChildNodes(context, fallback, output);
            }
            // If no fallback, silently ignore the unknown instruction
            // (Per XSLT 1.0 Section 2.5: "if the instruction element...does not have
            // an xsl:fallback child element, then the XSLT element is instantiated
            // by instantiating each of its children that is in the XSLT namespace")
            return;
        }

        // Strict mode: unknown instruction is an error
        throw new Error(
            `Unknown XSLT instruction: <${elementName}>. ` +
            `This element is not supported in XSLT 1.0. ` +
            `If this is a future XSLT version feature, use version="2.0" or higher ` +
            `to enable forwards-compatible processing mode.`
        );
    }

    /**
     * Implements `xsl:apply-templates`.
     * @param context The Expression Context.
     * @param template The template.
     * @param output The output. Only used if there's no corresponding output node already defined.
     * @protected
     */
    protected async xsltApplyTemplates(context: ExprContext, template: XNode, output?: XNode) {
        const select = xmlGetAttribute(template, 'select');
        let nodes: XNode[] = [];
        if (select) {
            nodes = this.xPath.xPathEval(select, context).nodeSetValue();
        } else {
            nodes = context.nodeList[context.position].childNodes;
        }

        const onEmpty = this.findConditionalChild(template, 'on-empty');
        const onNonEmpty = this.findConditionalChild(template, 'on-non-empty');

        if (nodes.length === 0) {
            if (onEmpty) {
                await this.xsltChildNodes(context.clone(), onEmpty, output);
            }
            return;
        }

        if (onNonEmpty) {
            await this.xsltChildNodes(context.clone(), onNonEmpty, output);
            return;
        }

        // TODO: Check why apply-templates was sorting and filing parameters
        // automatically.
        /* this.xsltWithParam(sortContext, template);
        this.xsltSort(sortContext, template); */

        const mode: string | null = xmlGetAttribute(template, 'mode');
        const effectiveMode = mode || null;
        const top = template.ownerDocument.documentElement;

        // Collect all templates with their priority metadata
        let expandedTemplates: TemplatePriorityInterface[] = collectAndExpandTemplates(top, effectiveMode, this.xPath, this.templateSourceMap);

        // Also collect templates from accepted components in used packages
        expandedTemplates = expandedTemplates.concat(this.collectAcceptedTemplates(effectiveMode));

        // Clone context and set any xsl:with-param parameters defined on
        // the <xsl:apply-templates> element so they are visible to the
        // templates executed for each selected node.
        const paramContext = context.clone();
        await this.xsltWithParam(paramContext, template);
        const modifiedContext = paramContext.clone(nodes);
        // Process nodes in document order, selecting the BEST matching template for each node.
        // This is the XSLT 3.0 compliant behavior - only ONE template executes per node.
        for (let j = 0; j < modifiedContext.contextSize(); ++j) {
            const currentNode = modifiedContext.nodeList[j];
            // Handle text nodes - check for templates matching text() first (per XSLT 1.0 spec)
            if (currentNode.nodeType === DOM_TEXT_NODE) {
                // Check if this whitespace-only text node should be stripped
                if (!this.xsltPassText(currentNode)) {
                    // Skip whitespace-only text nodes in apply-templates
                    continue;
                }

                // Check if there's a template matching text() nodes
                const textNodeContext = paramContext.clone([currentNode], 0);
                textNodeContext.inApplyTemplates = true;

                const textSelection = selectBestTemplate(
                    expandedTemplates,
                    textNodeContext,
                    this.matchResolver,
                    this.xPath,
                    this.warningsCallback
                );

                if (textSelection.selectedTemplate) {
                    // Execute the matching template for this text node
                    const metadata = this.templateSourceMap.get(textSelection.selectedTemplate);
                    const matchPattern = xmlGetAttribute(textSelection.selectedTemplate, 'match');
                    const modeAttr = xmlGetAttribute(textSelection.selectedTemplate, 'mode');

                    this.currentTemplateStack.push({
                        template: textSelection.selectedTemplate,
                        stylesheetDepth: metadata?.importDepth ?? 0,
                        mode: modeAttr || effectiveMode,
                        match: matchPattern
                    });

                    const previousOverrideContext = this.currentOverrideContext;
                    const overrideContext = textSelection.originalComponent || (textSelection.selectedTemplate as any).__originalComponent;
                    if (overrideContext) {
                        this.currentOverrideContext = overrideContext;
                    }

                    try {
                        await this.xsltChildNodes(textNodeContext, textSelection.selectedTemplate, output);
                    } finally {
                        this.currentTemplateStack.pop();
                        this.currentOverrideContext = previousOverrideContext;
                    }
                } else {
                    // No matching template - use built-in behavior (copy text)
                    const oldTextNodeContext = context.clone([currentNode], 0);
                    this.commonLogicTextNode(oldTextNodeContext, currentNode, output);
                }
            } else {
                // For non-text nodes, select the BEST matching template based on priority
                const clonedContext = modifiedContext.clone(
                    [currentNode],
                    0
                );
                clonedContext.inApplyTemplates = true;

                // Select the best template according to XSLT conflict resolution rules
                const selection = selectBestTemplate(
                    expandedTemplates,
                    clonedContext,
                    this.matchResolver,
                    this.xPath,
                    this.warningsCallback
                );

                // Emit warning if there's a conflict
                if (selection.hasConflict) {
                    emitConflictWarning(selection, currentNode, this.warningsCallback);
                }

                // Execute ONLY the selected template (not all matching templates)
                // We directly execute the template children here, bypassing xsltTemplate's
                // own matching logic since we've already determined this is the best match.
                if (selection.selectedTemplate) {
                    // Track the executing template for apply-imports
                    const metadata = this.templateSourceMap.get(selection.selectedTemplate);
                    const matchPattern = xmlGetAttribute(selection.selectedTemplate, 'match');
                    const modeAttr = xmlGetAttribute(selection.selectedTemplate, 'mode');
                    
                    this.currentTemplateStack.push({
                        template: selection.selectedTemplate,
                        stylesheetDepth: metadata?.importDepth ?? 0,
                        mode: modeAttr || effectiveMode,
                        match: matchPattern
                    });
                    
                    // Set override context if this is an overridden template
                    const previousOverrideContext = this.currentOverrideContext;
                    const overrideContext = selection.originalComponent || (selection.selectedTemplate as any).__originalComponent;
                    if (overrideContext) {
                        this.currentOverrideContext = overrideContext;
                    }
                    
                    try {
                        await this.xsltChildNodes(clonedContext, selection.selectedTemplate, output);
                    } finally {
                        this.currentTemplateStack.pop();
                        this.currentOverrideContext = previousOverrideContext;
                    }
                } else {
                    // No matching template found - apply built-in template for elements
                    // The built-in template for elements recursively applies templates to children
                    if (currentNode.nodeType === DOM_ELEMENT_NODE && currentNode.childNodes && currentNode.childNodes.length > 0) {
                        // Filter out attribute nodes and recursively apply templates
                        const childNodes = currentNode.childNodes.filter(
                            (n: XNode) => n.nodeType !== DOM_ATTRIBUTE_NODE
                        );
                        // Process children using the same logic as the main loop
                        for (let k = 0; k < childNodes.length; ++k) {
                            const childNode = childNodes[k];
                            if (childNode.nodeType === DOM_TEXT_NODE) {
                                // Check for text-matching templates first
                                const textContext = paramContext.clone([childNode], 0);
                                textContext.inApplyTemplates = true;
                                const textSelection = selectBestTemplate(
                                    expandedTemplates,
                                    textContext,
                                    this.matchResolver,
                                    this.xPath,
                                    this.warningsCallback
                                );
                                if (textSelection.selectedTemplate) {
                                    await this.xsltChildNodes(textContext, textSelection.selectedTemplate, output);
                                } else {
                                    // Built-in text template: copy text
                                    this.commonLogicTextNode(textContext, childNode, output);
                                }
                            } else {
                                // For element nodes, recursively select best template
                                const childContext = paramContext.clone([childNode], 0);
                                childContext.inApplyTemplates = true;
                                const childSelection = selectBestTemplate(
                                    expandedTemplates,
                                    childContext,
                                    this.matchResolver,
                                    this.xPath,
                                    this.warningsCallback
                                );
                                if (childSelection.selectedTemplate) {
                                    const childMetadata = this.templateSourceMap.get(childSelection.selectedTemplate);
                                    const childMatchPattern = xmlGetAttribute(childSelection.selectedTemplate, 'match');
                                    const childModeAttr = xmlGetAttribute(childSelection.selectedTemplate, 'mode');
                                    
                                    this.currentTemplateStack.push({
                                        template: childSelection.selectedTemplate,
                                        stylesheetDepth: childMetadata?.importDepth ?? 0,
                                        mode: childModeAttr || effectiveMode,
                                        match: childMatchPattern
                                    });
                                    
                                    try {
                                        await this.xsltChildNodes(childContext, childSelection.selectedTemplate, output);
                                    } finally {
                                        this.currentTemplateStack.pop();
                                    }
                                } else if (childNode.nodeType === DOM_ELEMENT_NODE) {
                                    // Recursively apply built-in template to this element's children
                                    // Use a helper to avoid deep code duplication
                                    await this.applyBuiltInTemplate(childNode, expandedTemplates, effectiveMode, paramContext, output);
                                }
                            }
                        }
                    } else if (currentNode.nodeType === DOM_TEXT_NODE) {
                        // Built-in template for text nodes: copy text content
                        this.commonLogicTextNode(clonedContext, currentNode, output);
                    }
                }
            }
        }
    }

    /**
     * Helper method to apply the built-in template for elements.
     * The built-in template recursively applies templates to children.
     */
    private async applyBuiltInTemplate(
        node: XNode,
        expandedTemplates: TemplatePriorityInterface[],
        mode: string | null,
        paramContext: ExprContext,
        output?: XNode
    ): Promise<void> {
        if (!node.childNodes || node.childNodes.length === 0) {
            return;
        }
        
        const childNodes = node.childNodes.filter(
            (n: XNode) => n.nodeType !== DOM_ATTRIBUTE_NODE
        );
        
        for (const childNode of childNodes) {
            if (childNode.nodeType === DOM_TEXT_NODE) {
                // Check for text-matching templates first
                const textContext = paramContext.clone([childNode], 0);
                textContext.inApplyTemplates = true;
                const textSelection = selectBestTemplate(
                    expandedTemplates,
                    textContext,
                    this.matchResolver,
                    this.xPath,
                    this.warningsCallback
                );
                if (textSelection.selectedTemplate) {
                    const previousOverrideContext = this.currentOverrideContext;
                    const overrideContext = textSelection.originalComponent || (textSelection.selectedTemplate as any).__originalComponent;
                    if (overrideContext) {
                        this.currentOverrideContext = overrideContext;
                    }
                    try {
                        await this.xsltChildNodes(textContext, textSelection.selectedTemplate, output);
                    } finally {
                        this.currentOverrideContext = previousOverrideContext;
                    }
                } else {
                    // Built-in text template: copy text
                    this.commonLogicTextNode(textContext, childNode, output);
                }
            } else {
                // For element nodes, recursively select best template
                const childContext = paramContext.clone([childNode], 0);
                childContext.inApplyTemplates = true;
                const childSelection = selectBestTemplate(
                    expandedTemplates,
                    childContext,
                    this.matchResolver,
                    this.xPath,
                    this.warningsCallback
                );
                if (childSelection.selectedTemplate) {
                    const childMetadata = this.templateSourceMap.get(childSelection.selectedTemplate);
                    const childMatchPattern = xmlGetAttribute(childSelection.selectedTemplate, 'match');
                    const childModeAttr = xmlGetAttribute(childSelection.selectedTemplate, 'mode');
                    
                    this.currentTemplateStack.push({
                        template: childSelection.selectedTemplate,
                        stylesheetDepth: childMetadata?.importDepth ?? 0,
                        mode: childModeAttr || mode,
                        match: childMatchPattern
                    });
                    
                    const previousOverrideContext = this.currentOverrideContext;
                    const overrideContext = childSelection.originalComponent || (childSelection.selectedTemplate as any).__originalComponent;
                    if (overrideContext) {
                        this.currentOverrideContext = overrideContext;
                    }

                    try {
                        await this.xsltChildNodes(childContext, childSelection.selectedTemplate, output);
                    } finally {
                        this.currentTemplateStack.pop();
                        this.currentOverrideContext = previousOverrideContext;
                    }
                } else if (childNode.nodeType === DOM_ELEMENT_NODE) {
                    // Recursively apply built-in template
                    await this.applyBuiltInTemplate(childNode, expandedTemplates, mode, paramContext, output);
                }
            }
        }
    }

    /**
     * Implements `xsl:apply-imports`.
     * Applies templates from imported stylesheets with the same match pattern and mode.
     * This enables template overriding where a template in an importing stylesheet
     * can call the overridden template from the imported stylesheet.
     * @param context The Expression Context.
     * @param template The apply-imports template node.
     * @param output The output node.
     */
    protected async xsltApplyImports(context: ExprContext, template: XNode, output?: XNode) {
        // Check if we're within a template execution
        if (this.currentTemplateStack.length === 0) {
            throw new Error('<xsl:apply-imports> can only be used within a template');
        }

        // Get the current executing template's context
        const currentTemplateContext = this.currentTemplateStack[this.currentTemplateStack.length - 1];
        const {
            stylesheetDepth: currentDepth,
            mode: currentMode
        } = currentTemplateContext;

        // Get current node
        const currentNode = context.nodeList[context.position];

        // Collect templates from imported stylesheets (higher import depth = lower precedence)
        // We only want templates with importPrecedence LESS than current template (from imported stylesheets)
        const top = template.ownerDocument.documentElement;
        const stylesheetRoots: XNode[] = [];

        if (top) {
            stylesheetRoots.push(top);
        }

        this.importedStylesheets.forEach((doc) => {
            if (!doc) {
                return;
            }
            if (doc.nodeType === DOM_DOCUMENT_NODE) {
                const rootElement = doc.childNodes.find(
                    (child: XNode) => child.nodeType === DOM_ELEMENT_NODE
                );
                if (rootElement) {
                    stylesheetRoots.push(rootElement);
                }
            } else if (doc.nodeType === DOM_ELEMENT_NODE) {
                stylesheetRoots.push(doc);
            }
        });

        let allTemplates: TemplatePriorityInterface[] = [];
        let docOrderOffset = 0;

        for (const root of stylesheetRoots) {
            const templates = collectAndExpandTemplates(
                root,
                currentMode,
                this.xPath,
                this.templateSourceMap
            );
            for (const templateEntry of templates) {
                templateEntry.documentOrder += docOrderOffset;
            }
            docOrderOffset += templates.length;
            allTemplates = allTemplates.concat(templates);
        }

        // Filter to only templates from imported stylesheets (depth > currentDepth)
        const importedTemplates = allTemplates.filter((t) => {
            const metadata = this.templateSourceMap.get(t.template);
            return metadata && metadata.importDepth > currentDepth;
        });

        if (importedTemplates.length === 0) {
            return;
        }

        // Create a context for the current node to use with template selection
        const nodeContext = context.clone([currentNode], 0);

        // Select best matching template from imported stylesheets
        const selection = selectBestTemplate(
            importedTemplates,
            nodeContext,
            this.matchResolver,
            this.xPath,
            this.warningsCallback
        );

        if (!selection.selectedTemplate) {
            // No matching template in imported stylesheets
            return;
        }

        // Clone context and apply any with-param parameters from the apply-imports element
        const importedContext = context.clone();
        await this.xsltWithParam(importedContext, template);

        // Execute the imported template
        // Need to track this as the new current template
        const metadata = this.templateSourceMap.get(selection.selectedTemplate);
        if (metadata) {
            const matchPattern = xmlGetAttribute(selection.selectedTemplate, 'match');
            const modeAttr = xmlGetAttribute(selection.selectedTemplate, 'mode');
            this.currentTemplateStack.push({
                template: selection.selectedTemplate,
                stylesheetDepth: metadata.importDepth,
                mode: modeAttr || currentMode,
                match: matchPattern
            });

            const previousOverrideContext = this.currentOverrideContext;
            const overrideContext = selection.originalComponent || (selection.selectedTemplate as any).__originalComponent;
            if (overrideContext) {
                this.currentOverrideContext = overrideContext;
            }

            try {
                await this.xsltChildNodes(importedContext, selection.selectedTemplate, output);
            } finally {
                this.currentTemplateStack.pop();
                this.currentOverrideContext = previousOverrideContext;
            }
        }
    }

    /**
     * Implements `xsl:attribute`.
     * @param context The Expression Context.
     * @param template The template.
     * @param output The output. Only used if there's no corresponding output node already defined.
     * @protected
     */
    protected async xsltAttribute(context: ExprContext, template: XNode, output?: XNode) {
        const nameExpr = xmlGetAttribute(template, 'name');
        const name = this.xsltAttributeValue(nameExpr, context);

        const documentFragment = domCreateDocumentFragment(this.outputDocument);
        await this.xsltChildNodes(context, template, documentFragment);
        const value = xmlValueLegacyBehavior(documentFragment);

        if (output) {
            domSetAttribute(output, name, value);

            // If the attribute name has a namespace prefix, ensure xmlns declaration exists
            if (name.includes(':')) {
                const prefix = name.split(':')[0];
                if (prefix !== 'xmlns') {
                    const explicitNs = xmlGetAttribute(template, 'namespace');
                    const nsUri = explicitNs || this.resolveNamespaceUriForPrefix(template, prefix);
                    if (nsUri) {
                        const nsAttr = `xmlns:${prefix}`;
                        if (!this.isNamespaceDeclaredOnAncestor(output, nsAttr, nsUri)) {
                            domSetAttribute(output, nsAttr, nsUri);
                        }
                    }
                }
            }
        }
    }

    /**
     * Implements `xsl:call-template`.
     * @param context The Expression Context.
     * @param template The template.
     * @param output The output, used when a fragment is passed by a previous step.
     */
    protected async xsltCallTemplate(context: ExprContext, template: XNode, output?: XNode) {
        const name = xmlGetAttribute(template, 'name');
        const top = template.ownerDocument.documentElement;

        const paramContext = context.clone();
        await this.xsltWithParam(paramContext, template);

        // First, check for overridden named templates from used packages
        let foundTemplate: XNode | null = null;
        if (this.currentPackage) {
            this.currentPackage.usedPackages.forEach((usedPkg) => {
                usedPkg.acceptedComponents.forEach((component) => {
                    if (component.type === 'template' && component.name === name && component.isAccepted) {
                        // Check for override
                        const effectiveComponent = this.getEffectiveComponent(component);
                        foundTemplate = effectiveComponent.node;
                    }
                });
            });
        }

        // If found in accepted components (possibly overridden), use it
        if (foundTemplate) {
            await this.xsltChildNodes(paramContext, foundTemplate, output);
            return;
        }

        // Otherwise, search in the current stylesheet
        for (let i = 0; i < top.childNodes.length; ++i) {
            let childNode = top.childNodes[i];
            if (
                childNode.nodeType === DOM_ELEMENT_NODE &&
                this.isXsltElement(childNode, 'template') &&
                domGetAttributeValue(childNode, 'name') === name
            ) {
                await this.xsltChildNodes(paramContext, childNode, output);
                break;
            }
        }
    }

    /**
     * Implements `xsl:choose`, its child nodes `xsl:when`, and
     * `xsl:otherwise`.
     * @param context The Expression Context.
     * @param template The template.
     * @param output The output. Only used if there's no corresponding output node already defined.
     */
    protected async xsltChoose(context: ExprContext, template: XNode, output?: XNode) {
        for (const childNode of template.childNodes) {
            if (childNode.nodeType !== DOM_ELEMENT_NODE) {
                continue;
            }

            if (this.isXsltElement(childNode, 'when')) {
                const test = xmlGetAttribute(childNode, 'test');
                if (this.xPath.xPathEval(test, context).booleanValue()) {
                    await this.xsltChildNodes(context, childNode, output);
                    break;
                }
            } else if (this.isXsltElement(childNode, 'otherwise')) {
                await this.xsltChildNodes(context, childNode, output);
                break;
            }
        }
    }

    /**
     * Implements `xsl:copy` for all node types.
     * @param {XNode} destination the node being copied to, part of output document.
     * @param {XNode} source the node being copied, part in input document.
     * @returns {XNode|null} If an element node was created, the element node. Otherwise, null.
     */
    protected xsltCopy(destination: XNode, source: XNode): XNode {
        if (source.nodeType == DOM_ELEMENT_NODE) {
            let node = domCreateElement(this.outputDocument, source.nodeName);
            // node.transformedNodeName = source.nodeName;
            if (source.namespaceUri !== null && source.namespaceUri !== undefined) {
                const prefix = source.prefix || (source.nodeName.includes(':') ? source.nodeName.split(':')[0] : null);
                const nsAttr = prefix ? `xmlns:${prefix}` : 'xmlns';
                // Only add the namespace declaration if not already declared by an ancestor
                if (!this.isNamespaceDeclaredOnAncestor(destination, nsAttr, source.namespaceUri)) {
                    domSetAttribute(node, nsAttr, source.namespaceUri);
                }
            }
            // Set siblingPosition to preserve insertion order during serialization
            node.siblingPosition = destination.childNodes.length;
            domAppendChild(destination, node);
            return node;
        }
        if (source.nodeType == DOM_TEXT_NODE) {
            // Check if this whitespace-only text node should be stripped
            if (this.shouldStripWhitespaceNode(source)) {
                return null;
            }
            let node = domCreateTextNode(this.outputDocument, source.nodeValue);
            node.siblingPosition = destination.childNodes.length;
            domAppendChild(destination, node);
        } else if (source.nodeType == DOM_CDATA_SECTION_NODE) {
            let node = domCreateCDATASection(this.outputDocument, source.nodeValue);
            node.siblingPosition = destination.childNodes.length;
            domAppendChild(destination, node);
        } else if (source.nodeType == DOM_COMMENT_NODE) {
            let node = domCreateComment(this.outputDocument, source.nodeValue);
            node.siblingPosition = destination.childNodes.length;
            domAppendChild(destination, node);
        } else if (source.nodeType == DOM_ATTRIBUTE_NODE) {
            domSetAttribute(destination, source.nodeName, source.nodeValue);

            // If the attribute has a namespace prefix, ensure xmlns declaration exists
            if (source.prefix && source.namespaceUri &&
                source.prefix !== 'xmlns' && !source.nodeName.startsWith('xmlns')) {
                const nsAttr = `xmlns:${source.prefix}`;
                if (!this.isNamespaceDeclaredOnAncestor(destination, nsAttr, source.namespaceUri)) {
                    domSetAttribute(destination, nsAttr, source.namespaceUri);
                }
            }
        }

        return null;
    }

    /**
     * Implements `xsl:comment`. 
     * @param context The Expression Context.
     * @param template The template.
     * @param output The output. Only used if there's no corresponding output node already defined. 
     */
    protected async xsltComment(context: ExprContext, template: XNode, output?: XNode) {
        const node = domCreateDocumentFragment(this.outputDocument);
        await this.xsltChildNodes(context, template, node);
        const commentData = xmlValue(node);
        const commentNode = domCreateComment(this.outputDocument, commentData);
        const resolvedOutput = output || this.outputDocument;
        resolvedOutput.appendChild(commentNode);
    }

    /**
     * Implements `xsl:processing-instruction`.
     * @param context The Expression Context.
     * @param template The template.
     * @param output The output. Only used if there's no corresponding output node already defined.
     */
    protected async xsltProcessingInstruction(context: ExprContext, template: XNode, output?: XNode) {
        // Get the target name (required)
        const nameExpr = xmlGetAttribute(template, 'name');
        if (!nameExpr) {
            throw new Error('<xsl:processing-instruction> requires a "name" attribute');
        }

        // Evaluate name as attribute value template
        const target = this.xsltAttributeValue(nameExpr, context);

        if (!target) {
            throw new Error('<xsl:processing-instruction> target name cannot be empty');
        }

        if (target.toLowerCase() === 'xml') {
            throw new Error('Processing instruction target cannot be "xml"');
        }

        // Validate target name format (no spaces, valid XML NCName for PI target)
        // PI targets must match: [a-zA-Z_:][a-zA-Z0-9_:.-]*
        if (!/^[a-zA-Z_][a-zA-Z0-9_:.-]*$/.test(target)) {
            throw new Error(`Invalid processing instruction target: "${target}"`);
        }

        // Process child nodes to get PI data content
        const documentFragment = domCreateDocumentFragment(this.outputDocument);
        await this.xsltChildNodes(context, template, documentFragment);

        // Extract text content from fragment
        const data = xmlValue(documentFragment);

        // Create processing instruction node
        const pi = domCreateProcessingInstruction(this.outputDocument, target, data);

        // Add to output
        const resolvedOutput = output || this.outputDocument;
        domAppendChild(resolvedOutput, pi);
    }

    /**
     * Implements `xsl:copy-of` for node-set values of the select
     * expression. Recurses down the source node tree, which is part of
     * the input document.
     * @param {XNode} destination the node being copied to, part of output document.
     * @param {XNode} source the node being copied, part in input document.
     */
    protected xsltCopyOf(destination: XNode, source: XNode): void {
        if (source.nodeType == DOM_DOCUMENT_FRAGMENT_NODE || source.nodeType == DOM_DOCUMENT_NODE) {
            for (let i = 0; i < source.childNodes.length; ++i) {
                this.xsltCopyOf(destination, source.childNodes[i]);
            }
        } else {
            const node = this.xsltCopy(destination, source);
            if (node) {
                for (let i = 0; i < source.childNodes.length; ++i) {
                    this.xsltCopyOf(node, source.childNodes[i]);
                }
            }
        }
    }

    /**
     * Implements `xsl:decimal-format`, registering the settings in this instance
     * and the current context. 
     * @param context The Expression Context.
     * @param template The template.
     */
    protected xsltDecimalFormat(context: ExprContext, template: XNode) {
        const name = xmlGetAttribute(template, 'name');
        const decimalSeparator = xmlGetAttribute(template, 'decimal-separator');
        const groupingSeparator = xmlGetAttribute(template, 'grouping-separator');
        const infinity = xmlGetAttribute(template, 'infinity');
        const minusSign = xmlGetAttribute(template, 'minus-sign');
        const naN = xmlGetAttribute(template, 'NaN');
        const percent = xmlGetAttribute(template, 'percent');
        const perMille = xmlGetAttribute(template, 'per-mille');
        const zeroDigit = xmlGetAttribute(template, 'zero-digit');
        const digit = xmlGetAttribute(template, 'digit');
        const patternSeparator = xmlGetAttribute(template, 'pattern-separator');
        this.decimalFormatSettings = {
            name: name || this.decimalFormatSettings.name,
            decimalSeparator: decimalSeparator || this.decimalFormatSettings.decimalSeparator,
            groupingSeparator: groupingSeparator || this.decimalFormatSettings.groupingSeparator,
            infinity: infinity || this.decimalFormatSettings.infinity,
            minusSign: minusSign || this.decimalFormatSettings.minusSign,
            naN: naN || this.decimalFormatSettings.naN,
            percent: percent || this.decimalFormatSettings.percent,
            perMille: perMille || this.decimalFormatSettings.perMille,
            zeroDigit: zeroDigit || this.decimalFormatSettings.zeroDigit,
            digit: digit || this.decimalFormatSettings.digit,
            patternSeparator: patternSeparator || this.decimalFormatSettings.patternSeparator
        };
        context.decimalFormatSettings = this.decimalFormatSettings;
    }

    /**
     * Implements `xsl:element`.
     * @param context The Expression Context.
     * @param template The template.
     */
    protected async xsltElement(context: ExprContext, template: XNode, output?: XNode) {
        const nameExpr = xmlGetAttribute(template, 'name');
        const name = this.xsltAttributeValue(nameExpr, context);
        const node = domCreateElement(this.outputDocument, name);

        // Apply attribute sets first (they can be overridden by child attributes)
        const useAttributeSets = xmlGetAttribute(template, 'use-attribute-sets');
        if (useAttributeSets) {
            await this.applyAttributeSets(context, node, useAttributeSets);
        }

        // node.transformedNodeName = name;

        // Fix for Issue 161: Set siblingPosition to preserve document order
        node.siblingPosition = (output || this.outputDocument).childNodes.length;

        domAppendChild(output || this.outputDocument, node);
        // The element becomes the output node of the source node.
        // context.nodeList[context.position].outputNode = node;
        const clonedContext = context.clone();
        await this.xsltChildNodes(clonedContext, template, node);
    }

    /**
     * Implements `xsl:accumulator` (XSLT 3.0).
     *
     * Accumulators are a declarative way to compute values during template processing.
     * They consist of rules that are applied as elements are processed.
     *
     * @param context The expression context
     * @param template The xsl:accumulator element
     */
    protected xsltAccumulator(context: ExprContext, template: XNode) {
        const name = xmlGetAttribute(template, 'name');
        if (!name) {
            throw new Error('<xsl:accumulator> requires a "name" attribute');
        }

        const initialValue = xmlGetAttribute(template, 'initial-value') || '()';
        const as = xmlGetAttribute(template, 'as') || 'xs:anyAtomicType*';
        const streamableStr = xmlGetAttribute(template, 'streamable') || 'no';
        const streamable = streamableStr === 'yes' || streamableStr === 'true' || streamableStr === '1';

        const rules: AccumulatorRule[] = [];

        // Process xsl:accumulator-rule children
        for (let i = 0; i < template.childNodes.length; i++) {
            const child = template.childNodes[i];
            if (child.nodeType === DOM_ELEMENT_NODE && child.nodeName === 'accumulator-rule') {
                const match = xmlGetAttribute(child, 'match');
                if (!match) {
                    throw new Error('<xsl:accumulator-rule> requires a "match" attribute');
                }

                const select = xmlGetAttribute(child, 'select');
                if (!select) {
                    throw new Error('<xsl:accumulator-rule> requires a "select" attribute');
                }

                const phase = xmlGetAttribute(child, 'phase');
                rules.push({
                    match,
                    select,
                    phase: (phase === 'start' || phase === 'end') ? phase : undefined
                });
            }
        }

        const definition: AccumulatorDefinition = {
            name,
            initialValue,
            as,
            rules,
            streamable
        };

        // Register the accumulator
        this.accumulatorRegistry.registerAccumulator(definition);

        // Initialize the accumulator value with the initial value expression
        try {
            const initialResult = this.xPath.xPathEval(initialValue, context);
            const state: AccumulatorState = {
                currentValue: initialResult,
                valueStack: [initialResult]
            };
            this.accumulatorRegistry.setAccumulatorState(name, state);
        } catch (e) {
            // If initial-value evaluation fails, use the result as-is
            const state: AccumulatorState = {
                currentValue: null,
                valueStack: [null]
            };
            this.accumulatorRegistry.setAccumulatorState(name, state);
        }
    }

    /**
     * Evaluates all matching accumulator rules for a given node
     * and updates the accumulator state
     *
     * @param context The expression context with current node
     * @param node The current node being processed
     */
    protected evaluateAccumulatorRules(context: ExprContext, node: XNode): void {
        const allAccumulators = this.accumulatorRegistry.getAllAccumulators();

        for (const accumulator of allAccumulators) {
            const state = this.accumulatorRegistry.getAccumulatorState(accumulator.name);
            if (!state) continue;

            // Process each rule
            for (const rule of accumulator.rules) {
                // Check if the pattern matches the current node
                try {
                    // Create a match context for this node
                    const matchContext = context.clone([node], 0);
                    const matchedNodes = this.xsltMatch(rule.match, matchContext);
                    const matchResult = matchedNodes && matchedNodes.length > 0;

                    if (matchResult) {
                        // Pattern matches - evaluate the select expression
                        // The context should include the $value variable with current accumulated value
                        const ruleContext = context.clone([node], 0);

                        // Set $value to current accumulated value
                        ruleContext.setVariable('value', new StringValue(
                            state.currentValue ? String(state.currentValue) : ''
                        ));

                        // Evaluate the select expression
                        const newValue = this.xPath.xPathEval(rule.select, ruleContext);

                        // Update the accumulator state
                        state.currentValue = newValue;
                    }
                } catch (e) {
                    // Pattern matching or evaluation failed - skip this rule
                    // Log warning if configured
                    if (this.warningsCallback) {
                        this.warningsCallback(`Error evaluating accumulator rule for ${accumulator.name}: ${e}`);
                    }
                }
            }
        }
    }

    /**
     * Retrieves the current value of an accumulator
     * Used when accessing accumulators in templates via accumulator-after() or accumulator-before()
     *
     * @param accumulatorName The name of the accumulator
     * @returns The current value of the accumulator, or null if not found
     */
    protected getAccumulatorValue(accumulatorName: string): any {
        const state = this.accumulatorRegistry.getAccumulatorState(accumulatorName);
        return state ? state.currentValue : null;
    }

    /**
     * Implements `xsl:for-each`.
     * @param context The Expression Context.
     * @param template The template.
     * @param output The output.
     */
    protected async xsltForEach(context: ExprContext, template: XNode, output?: XNode) {
        const select = xmlGetAttribute(template, 'select');
        const nodes = this.xPath.xPathEval(select, context).nodeSetValue();
        const onEmpty = this.findConditionalChild(template, 'on-empty');
        const onNonEmpty = this.findConditionalChild(template, 'on-non-empty');

        if (nodes.length === 0) {
            if (onEmpty) {
                await this.xsltChildNodes(context.clone(), onEmpty, output);
            }
            return;
        }

        if (onNonEmpty) {
            await this.xsltChildNodes(context.clone(), onNonEmpty, output);
            return;
        }

        // TODO: Why do we need this sort, really?
        // I have no idea why this logic is here (it was implemented
        // before Design Liquido taking over), so if it is proven not useful,
        // this entire logic must be removed.
        const sortContext = context.clone(nodes);
        this.xsltSort(sortContext, template);

        const nodesWithParent = sortContext.nodeList.filter((n) => n.parentNode !== null && n.parentNode !== undefined);
        if (nodesWithParent.length <= 0) {
            throw new Error('Nodes with no parents defined.');
        }

        for (let i = 0; i < sortContext.contextSize(); ++i) {
            await this.xsltChildNodesExcludingConditional(
                sortContext.clone(sortContext.nodeList, i),
                template,
                output
            );
        }
    }

    /**
     * Implements `xsl:for-each-group` (XSLT 2.0).
     *
     * Groups items from the select expression and processes each group.
     * Supports group-by and group-adjacent grouping methods.
     *
     * @param context The Expression Context.
     * @param template The template.
     * @param output The output.
     */
    protected async xsltForEachGroup(context: ExprContext, template: XNode, output?: XNode) {
        const select = xmlGetAttribute(template, 'select');
        const groupBy = xmlGetAttribute(template, 'group-by');
        const groupAdjacent = xmlGetAttribute(template, 'group-adjacent');
        const groupStartingWith = xmlGetAttribute(template, 'group-starting-with');
        const groupEndingWith = xmlGetAttribute(template, 'group-ending-with');
        const onEmpty = this.findConditionalChild(template, 'on-empty');
        const onNonEmpty = this.findConditionalChild(template, 'on-non-empty');

        if (!select) {
            throw new Error('<xsl:for-each-group> requires a select attribute.');
        }

        // Check that exactly one grouping method is specified
        const groupingMethods = [groupBy, groupAdjacent, groupStartingWith, groupEndingWith].filter(m => m);
        if (groupingMethods.length === 0) {
            throw new Error('<xsl:for-each-group> requires one of: group-by, group-adjacent, group-starting-with, or group-ending-with.');
        }
        if (groupingMethods.length > 1) {
            throw new Error('<xsl:for-each-group> can only have one grouping method.');
        }

        // Get the items to group
        const items = this.xPath.xPathEval(select, context).nodeSetValue();
        if (items.length === 0) {
            if (onEmpty) {
                await this.xsltChildNodes(context.clone(), onEmpty, output);
            }
            return;
        }

        // Build groups based on the grouping method
        let groups: { key: any; items: XNode[] }[];

        if (groupBy) {
            groups = this.groupByKey(items, groupBy, context);
        } else if (groupAdjacent) {
            groups = this.groupAdjacent(items, groupAdjacent, context);
        } else if (groupStartingWith) {
            groups = this.groupStartingWith(items, groupStartingWith, context);
        } else if (groupEndingWith) {
            groups = this.groupEndingWith(items, groupEndingWith, context);
        } else {
            return; // Should not reach here
        }

        if (onNonEmpty) {
            await this.xsltChildNodes(context.clone(), onNonEmpty, output);
            return;
        }

        // Process each group
        for (let i = 0; i < groups.length; i++) {
            const group = groups[i];
            // Create context with first item of group as context node
            const groupContext = context.clone(group.items, 0);
            // Set current group and grouping key for current-group() and current-grouping-key() functions
            groupContext.currentGroup = group.items;
            groupContext.currentGroupingKey = group.key;

            await this.xsltChildNodesExcludingConditional(groupContext, template, output);
        }
    }

    /**
     * Group items by a computed key value.
     * Items with the same key are placed in the same group.
     */
    private groupByKey(items: XNode[], keyExpr: string, context: ExprContext): { key: any; items: XNode[] }[] {
        const groupMap = new Map<string, { key: any; items: XNode[] }>();
        const groupOrder: string[] = []; // Maintain insertion order

        for (const item of items) {
            const itemContext = context.clone([item], 0);
            const keyValue = this.xPath.xPathEval(keyExpr, itemContext);
            const keyString = keyValue.stringValue();

            if (!groupMap.has(keyString)) {
                groupMap.set(keyString, { key: keyString, items: [] });
                groupOrder.push(keyString);
            }
            groupMap.get(keyString)!.items.push(item);
        }

        // Return groups in order of first occurrence
        return groupOrder.map(key => groupMap.get(key)!);
    }

    /**
     * Group adjacent items with the same key.
     * A new group starts when the key changes.
     */
    private groupAdjacent(items: XNode[], keyExpr: string, context: ExprContext): { key: any; items: XNode[] }[] {
        const groups: { key: any; items: XNode[] }[] = [];
        let currentKey: string | null = null;
        let currentGroup: XNode[] = [];

        for (const item of items) {
            const itemContext = context.clone([item], 0);
            const keyValue = this.xPath.xPathEval(keyExpr, itemContext);
            const keyString = keyValue.stringValue();

            if (currentKey === null || keyString !== currentKey) {
                // Start a new group
                if (currentGroup.length > 0) {
                    groups.push({ key: currentKey, items: currentGroup });
                }
                currentKey = keyString;
                currentGroup = [item];
            } else {
                // Add to current group
                currentGroup.push(item);
            }
        }

        // Don't forget the last group
        if (currentGroup.length > 0) {
            groups.push({ key: currentKey, items: currentGroup });
        }

        return groups;
    }

    /**
     * Convert an XSLT pattern to a self:: expression for matching against the current node.
     * For example, "h1" becomes "self::h1", "section[@type]" becomes "self::section[@type]".
     */
    private patternToSelfExpression(pattern: string): string {
        // If it already uses an axis or is a complex expression, wrap it appropriately
        if (pattern.includes('::') || pattern.startsWith('/') || pattern.startsWith('(')) {
            // Already has an axis or is an absolute/complex path
            return pattern;
        }
        // For simple patterns like "h1" or "section", prepend self::
        return `self::${pattern}`;
    }

    /**
     * Group items starting with items that match a pattern.
     * A new group starts when an item matches the pattern.
     */
    private groupStartingWith(items: XNode[], pattern: string, context: ExprContext): { key: any; items: XNode[] }[] {
        const groups: { key: any; items: XNode[] }[] = [];
        let currentGroup: XNode[] = [];
        let groupIndex = 0;
        // Convert pattern to self:: expression for proper matching
        const selfPattern = this.patternToSelfExpression(pattern);

        for (const item of items) {
            const itemContext = context.clone([item], 0);
            // Check if item matches the pattern
            const matches = this.xPath.xPathEval(selfPattern, itemContext).booleanValue();

            if (matches && currentGroup.length > 0) {
                // Start a new group (save previous)
                groups.push({ key: groupIndex++, items: currentGroup });
                currentGroup = [item];
            } else if (matches && currentGroup.length === 0) {
                // First item starts a new group
                currentGroup = [item];
            } else {
                // Add to current group
                currentGroup.push(item);
            }
        }

        // Don't forget the last group
        if (currentGroup.length > 0) {
            groups.push({ key: groupIndex, items: currentGroup });
        }

        return groups;
    }

    /**
     * Group items ending with items that match a pattern.
     * A group ends when an item matches the pattern.
     */
    private groupEndingWith(items: XNode[], pattern: string, context: ExprContext): { key: any; items: XNode[] }[] {
        const groups: { key: any; items: XNode[] }[] = [];
        let currentGroup: XNode[] = [];
        let groupIndex = 0;
        // Convert pattern to self:: expression for proper matching
        const selfPattern = this.patternToSelfExpression(pattern);

        for (const item of items) {
            currentGroup.push(item);

            const itemContext = context.clone([item], 0);
            // Check if item matches the pattern (ends the group)
            const matches = this.xPath.xPathEval(selfPattern, itemContext).booleanValue();

            if (matches) {
                // End the current group
                groups.push({ key: groupIndex++, items: currentGroup });
                currentGroup = [];
            }
        }

        // Don't forget the last group (if it didn't end with a match)
        if (currentGroup.length > 0) {
            groups.push({ key: groupIndex, items: currentGroup });
        }

        return groups;
    }

    /**
     * Implements `xsl:iterate` (XSLT 3.0).
     *
     * Iterates over a sequence, maintaining accumulators that are updated across iterations.
     * Each iteration can output content and update accumulator values.
     * After all iterations complete, optional xsl:on-completion is executed.
     *
     * @param context The Expression Context.
     * @param template The template.
     * @param output The output.
     */
    protected async xsltIterate(context: ExprContext, template: XNode, output?: XNode) {
        const select = xmlGetAttribute(template, 'select');

        if (!select) {
            throw new Error('<xsl:iterate> requires a select attribute.');
        }

        // Evaluate the sequence to iterate over
        const items = this.xPath.xPathEval(select, context).nodeSetValue();
        if (items.length === 0) {
            // Process on-completion even with empty sequence
            const onCompletionElements = Array.from(template.childNodes || []).filter(
                (node) => node.nodeType === DOM_ELEMENT_NODE && 
                         this.isXsltElement(node as XNode, 'on-completion')
            ) as XNode[];

            if (onCompletionElements.length > 0) {
                const onCompletion = onCompletionElements[0];
                const completionContext = context.clone([], 0);
                await this.xsltChildNodes(completionContext, onCompletion, output);
            }
            return;
        }
        
        // Initialize accumulators from xsl:param children
        const accumulators: { [name: string]: any } = {};
        const paramElements = Array.from(template.childNodes || []).filter(
            (node) => node.nodeType === DOM_ELEMENT_NODE && 
                     (node as XNode).localName === 'param' &&
                     this.isXsltElement(node as XNode)
        ) as XNode[];

        // Initialize each accumulator
        for (const paramNode of paramElements) {
            const paramName = xmlGetAttribute(paramNode, 'name');
            if (!paramName) {
                throw new Error('<xsl:param> in <xsl:iterate> requires a name attribute.');
            }

            // Get initial value from select attribute
            const selectValue = xmlGetAttribute(paramNode, 'select');
            let initialValue: any = new StringValue('');

            if (selectValue) {
                initialValue = this.xPath.xPathEval(selectValue, context);
            }

            accumulators[paramName] = initialValue;
        }

        // Iterate over items
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            
            // Create iteration context with current item as context node
            const iterationContext = context.clone([item], 0);
            
            // Add accumulators to the context as variables
            for (const accName in accumulators) {
                iterationContext.variables[accName] = accumulators[accName];
            }

            // Process the iteration body (excluding xsl:param, xsl:on-completion, xsl:next-iteration)
            const allBodyNodes = Array.from(template.childNodes || []);

            // Process iteration body
            for (const bodyNode of allBodyNodes) {
                if (bodyNode.nodeType === DOM_ELEMENT_NODE) {
                    const elem = bodyNode as XNode;
                    // Skip XSLT special elements
                    if (this.isXsltElement(elem) && 
                        (elem.localName === 'param' ||
                         elem.localName === 'on-completion' ||
                         elem.localName === 'next-iteration')) {
                        continue;
                    }
                }
                
                await this.xsltProcessContext(iterationContext, bodyNode, output);
            }

            // Process xsl:next-iteration to update accumulators
            const nextIterationElements = Array.from(template.childNodes || []).filter(
                (node) => node.nodeType === DOM_ELEMENT_NODE && 
                         this.isXsltElement(node as XNode, 'next-iteration')
            ) as XNode[];

            if (nextIterationElements.length > 0) {
                const nextIteration = nextIterationElements[0];
                const withParamElements = Array.from(nextIteration.childNodes || []).filter(
                    (node) => node.nodeType === DOM_ELEMENT_NODE && 
                             this.isXsltElement(node as XNode, 'with-param')
                ) as XNode[];

                // Update accumulators with new values from xsl:with-param
                for (const withParam of withParamElements) {
                    const paramName = xmlGetAttribute(withParam, 'name');
                    if (!paramName) {
                        throw new Error('<xsl:with-param> requires a name attribute.');
                    }

                    const selectValue = xmlGetAttribute(withParam, 'select');
                    if (selectValue) {
                        const newValue = this.xPath.xPathEval(selectValue, iterationContext);
                        accumulators[paramName] = newValue;
                    }
                }
            }
        }

        // After iteration, process xsl:on-completion if present
        const onCompletionElements = Array.from(template.childNodes || []).filter(
            (node) => node.nodeType === DOM_ELEMENT_NODE && 
                     this.isXsltElement(node as XNode, 'on-completion')
        ) as XNode[];

        if (onCompletionElements.length > 0) {
            const onCompletion = onCompletionElements[0];
            
            // Create completion context - use empty nodelist but preserve variables
            const completionContext = context.clone([], 0);
            
            // Add final accumulators to context
            for (const accName in accumulators) {
                completionContext.variables[accName] = accumulators[accName];
            }

            // Process on-completion body
            await this.xsltChildNodes(completionContext, onCompletion, output);
        }
    }

    /**
     * Implements `xsl:try`.
     * @param context The Expression Context.
     * @param template The template.
     * @param output The output.
     */
    protected async xsltTry(context: ExprContext, template: XNode, output?: XNode) {
        const tryBodyNodes = Array.from(template.childNodes || []).filter(
            (node) => node.nodeType === DOM_ELEMENT_NODE && 
                     !this.isXsltElement(node as XNode, 'catch')
        ) as XNode[];

        const catchElements = Array.from(template.childNodes || []).filter(
            (node) => node.nodeType === DOM_ELEMENT_NODE && 
                     this.isXsltElement(node as XNode, 'catch')
        ) as XNode[];

        try {
            // Execute try body
            for (const bodyNode of tryBodyNodes) {
                await this.xsltProcessContext(context, bodyNode, output);
            }
        } catch (error: any) {
            // Extract error code from error object or use a generic error code
            let errorCode = 'err:UNKNOWN';
            if (error && typeof error === 'object') {
                if (error.code) {
                    errorCode = error.code;
                } else if (error.message) {
                    // Try to detect specific error types from error message
                    if (error.message.includes('division by zero') || error.message.includes('div 0')) {
                        errorCode = 'err:FOAR0001'; // Division by zero
                    } else if (error.message.includes('undefined')) {
                        errorCode = 'err:XPDY0002'; // Dynamic error
                    }
                }
            }

            // Try to match against catch blocks
            let caught = false;
            for (const catchElement of catchElements) {
                const errorsAttr = xmlGetAttribute(catchElement, 'errors');
                
                // If no errors attribute, catch all errors
                if (!errorsAttr) {
                    caught = true;
                } else {
                    // Check if error code matches the pattern
                    const errorPatterns = errorsAttr.split('|').map(p => p.trim());
                    for (const pattern of errorPatterns) {
                        if (pattern === '*' || pattern === errorCode) {
                            caught = true;
                            break;
                        }
                        // Support namespace-prefixed patterns like "err:*"
                        if (pattern.endsWith('*')) {
                            const prefix = pattern.slice(0, -1);
                            if (errorCode.startsWith(prefix)) {
                                caught = true;
                                break;
                            }
                        }
                    }
                }

                if (caught) {
                    // Execute catch block body (but not the catch element itself)
                    await this.xsltChildNodes(context, catchElement, output);
                    return; // Successfully caught, stop processing further catch blocks
                }
            }

            // If no catch block matched, re-throw the error
            if (!caught && catchElements.length > 0) {
                throw error;
            }
        }
    }

    /**
     * Implements `xsl:evaluate` (XSLT 3.0).
     * Dynamically evaluates an XPath expression constructed as a string.
     * @param context The Expression Context.
     * @param template The template.
     * @param output The output.
     */
    protected async xsltEvaluate(context: ExprContext, template: XNode, output?: XNode) {
        const xpathAttr = xmlGetAttribute(template, 'xpath');
        if (!xpathAttr) {
            throw new Error('<xsl:evaluate> requires an xpath attribute.');
        }

        // Evaluate the xpath attribute itself (it may contain variables)
        // to get the actual XPath expression to evaluate
        const xpathExpr = this.xPath.xPathEval(xpathAttr, context).stringValue();

        // Get optional context-item attribute
        let contextItem = null;
        const contextItemAttr = xmlGetAttribute(template, 'context-item');
        if (contextItemAttr) {
            const contextItemResult = this.xPath.xPathEval(contextItemAttr, context);
            const items = contextItemResult.nodeSetValue();
            if (items.length > 0) {
                contextItem = items[0];
            }
        }

        // Create evaluation context
        // Use context-item if specified, otherwise use current context
        let evalContext: ExprContext;
        if (contextItem) {
            evalContext = context.clone([contextItem], 0);
        } else {
            evalContext = context.clone();
        }

        try {
            // Evaluate the dynamic XPath expression
            const result = this.xPath.xPathEval(xpathExpr, evalContext);

            // Output the result based on its type
            const destinationNode = output || this.outputDocument;

            if (result.type === 'node-set') {
                // For node-sets, copy each node
                const nodes = result.nodeSetValue();
                for (const node of nodes) {
                    this.xsltCopyOf(destinationNode, node);
                }
            } else if (result.type === 'array' && (result as any).arrayValue) {
                // For arrays, serialize to text
                const arrayItems = (result as any).arrayValue();
                for (const item of arrayItems) {
                    let textNode = domCreateTextNode(this.outputDocument, item.stringValue());
                    textNode.siblingPosition = destinationNode.childNodes.length;
                    domAppendChild(destinationNode, textNode);
                }
            } else {
                // For other types, output as text
                let textNode = domCreateTextNode(this.outputDocument, result.stringValue());
                textNode.siblingPosition = destinationNode.childNodes.length;
                domAppendChild(destinationNode, textNode);
            }
        } catch (error: any) {
            // Wrap XPath errors as XSLT dynamic errors
            throw new Error(`Dynamic XPath evaluation error in xsl:evaluate: ${error.message}`);
        }
    }

    /**
     * Implements `xsl:if`.
     * @param context The Expression Context.
     * @param template The template.
     * @param output The output.
     */
    protected async xsltIf(context: ExprContext, template: XNode, output?: XNode) {
        const test = xmlGetAttribute(template, 'test');
        if (this.xPath.xPathEval(test, context).booleanValue()) {
            await this.xsltChildNodes(context, template, output);
        }
    }

    /**
     * Common implementation for `<xsl:import>` and `<xsl:include>`.
     * @param context The Expression Context.
     * @param template The template.
     * @param output The output.
     * @param isImport Whether this is an import (true) or include (false).
     */
    protected async xsltImportOrInclude(context: ExprContext, template: XNode, output: XNode | undefined, isImport: boolean) {
        const elementName = isImport ? 'xsl:import' : 'xsl:include';

        const hrefAttributeFind = template.childNodes.filter(n => n.nodeName === 'href');
        if (hrefAttributeFind.length <= 0) {
            throw new Error(`<${elementName}> with no href attribute defined.`);
        }

        const hrefAttribute = hrefAttributeFind[0];
        const href = hrefAttribute.nodeValue;

        // Check if we've already imported this stylesheet
        if (this.importedStylesheets.has(href)) {
            // Already imported, skip to avoid duplicate processing
            return;
        }

        const fetchResponse = await this.fetchFunction(href);
        const includedXslt = this.xmlParser.xmlParse(fetchResponse);
        
        // Track stylesheet metadata for apply-imports
        const currentDepth = this.styleSheetStack.length > 0 
            ? this.styleSheetStack[this.styleSheetStack.length - 1].importDepth 
            : 0;
        
        const metadata: StylesheetMetadata = {
            importDepth: isImport ? currentDepth + 1 : currentDepth,  // Includes are same depth, imports are deeper
            href: href,
            order: this.importedStylesheets.size
        };
        
        this.styleSheetStack.push(metadata);
        this.importedStylesheets.set(href, includedXslt);
        
        // Map all templates in this stylesheet to their metadata
        const stylesheetRoot = includedXslt.childNodes[0];
        if (stylesheetRoot) {
            this.mapTemplatesFromStylesheet(stylesheetRoot, metadata);
        }
        
        await this.xsltChildNodes(context, stylesheetRoot, output);
        
        this.styleSheetStack.pop();
    }

    /**
     * Implements `<xsl:import>`. For now the code is nearly identical to `<xsl:include>`, but there's
     * no precedence evaluation implemented yet.
     * @param context The Expression Context.
     * @param template The template.
     * @param output The output.
     */
    protected async xsltImport(context: ExprContext, template: XNode, output?: XNode) {
        await this.xsltImportOrInclude(context, template, output, true);
    }

    /**
     * Implements `xsl:include`.
     * @param context The Expression Context.
     * @param template The template.
     * @param output The output.
     */
    protected async xsltInclude(context: ExprContext, template: XNode, output?: XNode) {
        await this.xsltImportOrInclude(context, template, output, false);
    }

        /**
         * Implements `<xsl:package>` (XSLT 3.0 Section 3.6).
         * Defines a package of XSLT components with controlled visibility.
         * @param context The Expression Context.
         * @param template The xsl:package element.
         * @param output The output node.
         */
        protected async xsltPackage(context: ExprContext, template: XNode, output?: XNode) {
            // Check XSLT version
            const version = xmlGetAttribute(template, 'version') || this.version;
            if (!version || parseFloat(version) < 3.0) {
                throw new Error('<xsl:package> is only supported in XSLT 3.0 or later.');
            }

            // Get package attributes
            const name = xmlGetAttribute(template, 'name');
            const packageVersion = xmlGetAttribute(template, 'package-version');
            const declaredModes = (xmlGetAttribute(template, 'declared-modes') || 'yes') as 'yes' | 'no';
            const inputTypeAnnotations = (xmlGetAttribute(template, 'input-type-annotations') || 'unspecified') as 'preserve' | 'strip' | 'unspecified';

            if (!name) {
                throw new Error('<xsl:package> requires a "name" attribute.');
            }

            // Mark as loading for circular dependency detection (if not already marked by loadAndRegisterPackage)
            const packageKey = packageVersion ? `${name}@${packageVersion}` : name;
            const wasAlreadyLoading = this.packageRegistry.isLoading(packageKey);
            if (!wasAlreadyLoading) {
                this.packageRegistry.beginLoading(packageKey);
            }

            // Create package structure
            const pkg: XsltPackageInterface = {
                name,
                version: packageVersion,
                root: template,
                components: new Map(),
                usedPackages: new Map(),
                isTopLevel: this.currentPackage === null,
                overrides: new Map(),
                modes: new Map(),
                declaredModes,
                inputTypeAnnotations
            };

            // Save previous package context
            const previousPackage = this.currentPackage;
            this.currentPackage = pkg;

            try {
                // Register the package
                this.packageRegistry.register(pkg);

                    // Process package like a stylesheet (templates, variables, keys, etc.)
                    await this.xsltTransformOrStylesheet(context, template, output);
            } finally {
                // Only end loading if we started it (not if loadAndRegisterPackage did)
                if (!wasAlreadyLoading) {
                    this.packageRegistry.endLoading(packageKey);
                }
                // Restore previous package context
                this.currentPackage = previousPackage;
            }
        }

        /**
         * Loads and registers an external package.
         * Creates a temporary context and processes the package document.
         * 
         * @param name The package name/URI.
         * @param packageDoc The parsed package document.
         * @param version Optional semantic version string.
         */
        protected async loadAndRegisterPackage(name: string, packageDoc: XNode, version?: string): Promise<void> {
            // Detect circular dependencies
            const packageKey = version ? `${name}@${version}` : name;
            
            if (!this.packageRegistry.beginLoading(packageKey)) {
                throw new Error(`Circular package dependency detected: "${packageKey}".`);
            }

            try {
                // Find the xsl:package root element
                let packageRoot = packageDoc;
                if (packageDoc.nodeType === DOM_DOCUMENT_NODE) {
                    for (const child of packageDoc.childNodes) {
                        if (child.nodeType === DOM_ELEMENT_NODE && this.isXsltElement(child, 'package')) {
                            packageRoot = child;
                            break;
                        }
                    }
                }

                // Process as package
                if (packageRoot && this.isXsltElement(packageRoot, 'package')) {
                    // Override the name and version if provided
                    if (name && !xmlGetAttribute(packageRoot, 'name')) {
                        domSetAttribute(packageRoot, 'name', name);
                    }
                    if (version && !xmlGetAttribute(packageRoot, 'package-version')) {
                        domSetAttribute(packageRoot, 'package-version', version);
                    }
                    
                    // Create a temporary context for processing
                    const tempContext = new ExprContext([packageRoot]);
                    
                    // We don't need output for package registration, just to process the package definition
                    await this.xsltPackage(tempContext, packageRoot);
                } else {
                    throw new Error('Package document does not contain an xsl:package root element.');
                }
            } finally {
                this.packageRegistry.endLoading(packageKey);
            }
        }

        /**
         * Implements `<xsl:use-package>` (XSLT 3.0 Section 3.7).
         * Imports another package and makes its public components available.
         * @param context The Expression Context.
         * @param template The xsl:use-package element.
         * @param output The output node.
         */
        protected async xsltUsePackage(context: ExprContext, template: XNode, output?: XNode) {
            if (!this.currentPackage) {
                throw new Error('<xsl:use-package> can only appear as a child of <xsl:package>.');
            }

            // Get package reference
            const name = xmlGetAttribute(template, 'name');
            const packageVersion = xmlGetAttribute(template, 'package-version');

            if (!name) {
                throw new Error('<xsl:use-package> requires a "name" attribute.');
            }

            // Check for circular dependency - if the package is currently being loaded, it's a circular reference
            const packageKey = packageVersion ? `${name}@${packageVersion}` : name;
            if (this.packageRegistry.isLoading(packageKey)) {
                throw new Error(`Circular package dependency detected: "${packageKey}".`);
            }

            // Try to load the package from registry first
            let usedPackage = this.packageRegistry.get(name, packageVersion);
            
            // If not found and loader exists, try loading
            if (!usedPackage && this.packageLoader) {
                try {
                    const packageDoc = await this.packageLoader(name, packageVersion);
                    if (packageDoc) {
                        // Parse and register the package
                        await this.loadAndRegisterPackage(name, packageDoc, packageVersion);
                        usedPackage = this.packageRegistry.get(name, packageVersion);
                    }
                } catch (error) {
                    // If this is a circular dependency error, rethrow it
                    if (error instanceof Error && error.message.includes('Circular package dependency')) {
                        throw error;
                    }
                    // Otherwise, continue to error message below
                }
            }
            
            if (!usedPackage) {
                throw new Error(
                    `Package "${name}"${packageVersion ? `@${packageVersion}` : ''} not found. ` +
                    (this.packageLoader ? 'Package loader failed to load the package.' : 'Packages must be loaded before they can be used.')
                );
            }

            // Create used package entry
            const usedPkg: UsedPackageInterface = {
                package: usedPackage,
                acceptedComponents: new Map()
            };

            // Store in current package
            const key = packageVersion ? `${name}@${packageVersion}` : name;
            this.currentPackage.usedPackages.set(key, usedPkg);

            // Process xsl:accept and xsl:override children
            for (const child of template.childNodes) {
                if (this.isXsltElement(child, 'accept')) {
                    this.xsltAccept(context, child);
                } else if (this.isXsltElement(child, 'override')) {
                    await this.xsltOverride(context, child, output);
                }
            }

            // Register accepted variables in the context
            await this.registerAcceptedVariables(context);

            // Refresh function registry so accepted/overridden functions are available
            this.registerUserDefinedFunctionsInContext(context);

            // Validate that all abstract components have been overridden (Phase 4.5)
            usedPackage.components.forEach((component, key) => {
                if (component.visibility === 'abstract') {
                    const hasOverride = this.currentPackage!.overrides.has(key);
                    if (!hasOverride) {
                        throw new Error(
                            `Abstract component "${component.name || component.match || key}" from package "${name}" must be overridden.`
                        );
                    }
                }
            });
        }

        /**
         * Implements `<xsl:expose>` (XSLT 3.0 Section 3.8).
         * Marks a component as visible outside the package.
         * @param context The Expression Context.
         * @param template The xsl:expose element.
         */
        protected xsltExpose(context: ExprContext, template: XNode) {
            if (!this.currentPackage) {
                throw new Error('<xsl:expose> can only appear as a child of <xsl:package>.');
            }

            // Get exposure attributes
            const componentType = xmlGetAttribute(template, 'component') as ComponentType;
            const names = xmlGetAttribute(template, 'names');
            const visibility = (xmlGetAttribute(template, 'visibility') || 'public') as ComponentVisibility;

            if (!componentType) {
                throw new Error('<xsl:expose> requires a "component" attribute (template, function, variable, attribute-set, mode).');
            }

            // Parse names (can be space-separated list or wildcard '*')
            const nameList = names === '*' ? ['*'] : (names ? names.split(/\s+/) : []);

            if (nameList.length === 0) {
                throw new Error('<xsl:expose> requires a "names" attribute.');
            }

            // Mark components as exposed
            // For xsl:expose, we need to find the actual component definitions in the package
            // and register them with their actual nodes
            for (const name of nameList) {
                // Find the actual component in the package root
                const actualComponent = this.findComponentInPackageRoot(
                    this.currentPackage.root,
                    componentType,
                    name === '*' ? null : name
                );

                if (actualComponent) {
                    const component: PackageComponentInterface = {
                        type: componentType,
                            name: actualComponent.name || (name !== '*' ? name : undefined),
                        match: actualComponent.match,
                        mode: actualComponent.mode,
                        visibility,
                        overridable: visibility !== 'final',
                        node: actualComponent.node,
                        priority: actualComponent.priority
                    };

                    const key = makeComponentKey(component);
                    this.currentPackage.components.set(key, component);
                } else if (name !== '*') {
                    // Only warn for specific names, not wildcards
                    // Wildcard might not match anything yet
                }
            }
        }

        /**
         * Find a component definition in the package root.
         * @param packageRoot The package root element
         * @param type The component type to find
         * @param name The component name (null for all matching type)
         * @returns Component information or null if not found
         */
        private findComponentInPackageRoot(
            packageRoot: XNode,
            type: ComponentType,
            name: string | null
        ): { node: XNode; name?: string; match?: string; mode?: string | null; priority?: number } | null {
            for (const child of packageRoot.childNodes) {
                if (child.nodeType !== DOM_ELEMENT_NODE) {
                    continue;
                }

                // Match by component type
                if (type === 'template' && this.isXsltElement(child, 'template')) {
                    const templateName = xmlGetAttribute(child, 'name');
                    const match = xmlGetAttribute(child, 'match');
                    const mode = xmlGetAttribute(child, 'mode');
                    
                    // If name is specified, match by name
                    if (name) {
                        if (templateName === name) {
                            return { node: child, name: templateName, match, mode };
                        }
                    } else {
                        // Return first template for wildcard
                        return { node: child, name: templateName, match, mode };
                    }
                } else if (type === 'function' && this.isXsltElement(child, 'function')) {
                    const functionName = xmlGetAttribute(child, 'name');
                    if (!name || functionName === name) {
                        return { node: child, name: functionName };
                    }
                } else if (type === 'variable' && this.isXsltElement(child, 'variable')) {
                    const varName = xmlGetAttribute(child, 'name');
                    if (!name || varName === name) {
                        return { node: child, name: varName };
                    }
                } else if (type === 'attribute-set' && this.isXsltElement(child, 'attribute-set')) {
                    const setName = xmlGetAttribute(child, 'name');
                    if (!name || setName === name) {
                        return { node: child, name: setName };
                    }
                }
            }

            return null;
        }

        /**
         * Implements `<xsl:accept>` (XSLT 3.0 Section 3.9).
         * Accepts and optionally overrides a component from a used package.
         * @param context The Expression Context.
         * @param template The xsl:accept element.
         */
        protected xsltAccept(context: ExprContext, template: XNode) {
            if (!this.currentPackage) {
                throw new Error('<xsl:accept> can only appear as a child of <xsl:use-package>.');
            }

            // Get accept attributes
            const componentType = xmlGetAttribute(template, 'component') as ComponentType;
            const names = xmlGetAttribute(template, 'names');
            const visibilityOverride = xmlGetAttribute(template, 'visibility') as ComponentVisibility | undefined;

            if (!componentType) {
                throw new Error('<xsl:accept> requires a "component" attribute.');
            }

            if (!names) {
                throw new Error('<xsl:accept> requires a "names" attribute.');
            }

            // Parse names
            const nameList = names === '*' ? ['*'] : names.split(/\s+/);

            // Find the parent xsl:use-package to determine which package we're accepting from
            const parentUsePackage = template.parentNode;
            if (!parentUsePackage || !this.isXsltElement(parentUsePackage, 'use-package')) {
                throw new Error('<xsl:accept> must be a child of <xsl:use-package>.');
            }

            const packageName = xmlGetAttribute(parentUsePackage, 'name');
            const packageVersion = xmlGetAttribute(parentUsePackage, 'package-version');
            const key = packageVersion ? `${packageName}@${packageVersion}` : packageName;

            const usedPkg = this.currentPackage.usedPackages.get(key);
            if (!usedPkg) {
                throw new Error(`Internal error: used package "${key}" not found.`);
            }

            // Look up and accept components from the used package
            const componentsToAccept = this.findComponentsInPackage(
                usedPkg.package,
                componentType,
                nameList
            );

            // Validate and accept each component
            for (const component of componentsToAccept) {
                // Check if component is visible (not from the same package, so fromPackage = false)
                if (!isComponentVisible(component, false)) {
                    const componentName = component.name || component.match || 'unnamed';
                    throw new Error(
                        `Cannot accept private component "${componentName}" of type "${componentType}" ` +
                        `from package "${usedPkg.package.name}".`
                    );
                }

                // Create accepted component with tracking information
                const acceptedComponent: PackageComponentInterface = {
                    ...component,
                    sourcePackage: usedPkg.package.name,
                    isAccepted: true,
                    effectiveVisibility: visibilityOverride || component.visibility
                };

                const componentKey = makeComponentKey(acceptedComponent);
                usedPkg.acceptedComponents.set(componentKey, acceptedComponent);
            }
        }

        /**
         * Implements <xsl:override> (XSLT 3.0 Section 3.7.2).
         * Overrides components from a used package.
         */
        protected async xsltOverride(context: ExprContext, template: XNode, output?: XNode) {
            if (!this.currentPackage) {
                throw new Error('<xsl:override> can only appear as a child of <xsl:use-package>.');
            }

            // Validate parent is xsl:use-package
            const parentUsePackage = template.parentNode;
            if (!parentUsePackage || !this.isXsltElement(parentUsePackage, 'use-package')) {
                throw new Error('<xsl:override> must be a child of <xsl:use-package>.');
            }

            const packageName = xmlGetAttribute(parentUsePackage, 'name');
            const packageVersion = xmlGetAttribute(parentUsePackage, 'package-version');
            const key = packageVersion ? `${packageName}@${packageVersion}` : packageName;

            const usedPkg = this.currentPackage.usedPackages.get(key);
            if (!usedPkg) {
                throw new Error(`Internal error: used package "${key}" not found.`);
            }

            // Process each child element as an override
            for (let i = 0; i < template.childNodes.length; i++) {
                const child = template.childNodes[i];
                if (child.nodeType !== DOM_ELEMENT_NODE) {
                    continue;
                }

                const localName = child.localName;
                
                // Determine component type from element name
                let componentType: ComponentType | null = null;
                let componentName: string | null = null;
                let componentMatch: string | null = null;
                
                switch (localName) {
                    case 'template':
                        componentType = 'template';
                        componentName = xmlGetAttribute(child, 'name');
                        componentMatch = xmlGetAttribute(child, 'match');
                        break;
                    case 'function':
                        componentType = 'function';
                        componentName = xmlGetAttribute(child, 'name');
                        break;
                    case 'variable':
                        componentType = 'variable';
                        componentName = xmlGetAttribute(child, 'name');
                        break;
                    case 'attribute-set':
                        componentType = 'attribute-set';
                        componentName = xmlGetAttribute(child, 'name');
                        break;
                    default:
                        throw new Error(`<xsl:override> does not support <xsl:${localName}> elements.`);
                }

                if (!componentType) {
                    continue;
                }

                // Find the original component in the used package
                // Check both accepted components and the package's own components
                let originalComponent: PackageComponentInterface | undefined;
                
                
                // First check accepted components (which we explicitly accepted)
                usedPkg.acceptedComponents.forEach((component) => {
                    if (component.type !== componentType) {
                        return;
                    }
                    
                    // Match by name or match pattern
                    if (componentName && component.name === componentName) {
                        originalComponent = component;
                    } else if (componentMatch && component.match === componentMatch) {
                        originalComponent = component;
                    }
                });
                
                // If not found in accepted, check the package components directly
                if (!originalComponent) {
                    usedPkg.package.components.forEach((component) => {
                        if (component.type !== componentType) {
                            return;
                        }
                        
                        // Match by name or match pattern
                        if (componentName && component.name === componentName) {
                            originalComponent = component;
                        } else if (componentMatch && component.match === componentMatch) {
                            originalComponent = component;
                        }
                    });
                }

                if (!originalComponent) {
                    const identifier = componentName || componentMatch || 'unnamed';
                    throw new Error(
                        `Cannot override component "${identifier}" of type "${componentType}": ` +
                        `component not found in package "${usedPkg.package.name}".`
                    );
                }

                // Verify it's overridable (not final)
                if (!canOverrideComponent(originalComponent)) {
                    const identifier = componentName || componentMatch || 'unnamed';
                    throw new Error(
                        `Cannot override component "${identifier}" of type "${componentType}": ` +
                        `component is marked as "final" in package "${usedPkg.package.name}".`
                    );
                }

                // Create the overriding component
                const overridingComponent: PackageComponentInterface = {
                    type: componentType,
                    name: componentName || undefined,
                    match: componentMatch || undefined,
                    mode: xmlGetAttribute(child, 'mode') || undefined,
                    visibility: originalComponent.visibility, // Inherit visibility from original
                    overridable: false, // Overrides cannot themselves be overridden (unless explicitly marked)
                    node: child,
                    sourcePackage: this.currentPackage.name,
                    isAccepted: false,
                    effectiveVisibility: originalComponent.visibility
                };

                // Store reference to original component in the overriding component
                // This allows xsl:original to find and call the original
                (overridingComponent as any).originalComponent = originalComponent;
                (overridingComponent.node as any).__originalComponent = originalComponent;

                // Register the override
                const componentKey = makeComponentKey(originalComponent);
                this.currentPackage.overrides.set(componentKey, overridingComponent);

                // Register overriding function definitions so they are available to XPath
                if (componentType === 'function') {
                    this.xsltFunction(context, child);
                }

                // Do not execute the overriding component during registration.
                // It will be selected/executed during transformation when matched.
            }
        }

        /**
         * Find components in a package matching the given criteria.
         * Used by xsl:accept to locate components from used packages.
         * 
         * @param pkg The package to search in
         * @param componentType The type of component to find
         * @param namePatterns Array of name patterns ('*' for all, or specific names)
         * @returns Array of matching components
         */
        private findComponentsInPackage(
            pkg: XsltPackageInterface,
            componentType: ComponentType,
            namePatterns: string[]
        ): PackageComponentInterface[] {
            const results: PackageComponentInterface[] = [];
            const isWildcard = namePatterns.includes('*');

            pkg.components.forEach((component, key) => {
                // Filter by component type
                if (component.type !== componentType) {
                    return;
                }

                // If wildcard, accept all components of this type
                if (isWildcard) {
                    results.push(component);
                    return;
                }

                // Otherwise, match by name
                const componentName = this.getComponentNameForMatching(component);
                if (componentName && namePatterns.includes(componentName)) {
                    results.push(component);
                }
            });

            return results;
        }

        /**
         * Get the name to use when matching components.
         * For named components (functions, variables, attribute-sets), returns the name.
         * For templates, returns the name if present, otherwise returns null (match-based templates).
         * 
         * @param component The component to get the name from
         * @returns The component name for matching, or null if unnamed
         */
        private getComponentNameForMatching(component: PackageComponentInterface): string | null {
            switch (component.type) {
                case 'function':
                case 'variable':
                case 'attribute-set':
                case 'mode':
                    return component.name || null;
                case 'template':
                    // Only named templates can be matched by name in xsl:accept
                    return component.name || null;
                default:
                    return null;
            }
        }

        /**
         * Implements <xsl:original> (XSLT 3.0 Section 3.7.2).
         * Calls the original component from within an override.
         */
        protected async xsltOriginal(context: ExprContext, template: XNode, output?: XNode) {
            // Check if we're within an override context
            if (!this.currentOverrideContext && this.currentTemplateStack.length > 0) {
                const currentTemplate = this.currentTemplateStack[this.currentTemplateStack.length - 1].template;
                const templateOverrideContext = (currentTemplate as any).__originalComponent as PackageComponentInterface | undefined;
                if (templateOverrideContext) {
                    this.currentOverrideContext = templateOverrideContext;
                }
            }
            if (!this.currentOverrideContext) {
                throw new Error('<xsl:original> can only be used within an overriding component.');
            }

            const originalComponent = this.currentOverrideContext;
            const originalNode = originalComponent.node;

            // Execute the original component based on its type
            switch (originalComponent.type) {
                case 'template':
                    // Execute the original template's children
                    await this.xsltChildNodes(context, originalNode, output);
                    break;
                
                case 'function':
                    // For functions, xsl:original would be called from within the override function body
                    // The actual function execution is handled by the function call mechanism
                    throw new Error('<xsl:original> for functions should be called as a function, not as an element.');
                
                case 'variable':
                    // For variables, execute the original variable definition
                    await this.xsltVariable(context, originalNode, true);
                    break;
                
                case 'attribute-set':
                    // For attribute-sets, apply the original attribute set
                    if (originalComponent.name && output) {
                        await this.applyAttributeSets(context, output, originalComponent.name);
                    }
                    break;
                
                default:
                    throw new Error(`<xsl:original> does not support component type "${originalComponent.type}".`);
            }
        }

        /**
         * Implements `<xsl:mode>` (XSLT 3.0 Section 3.5).
         * Declares a mode with visibility and other properties.
         * Only valid within an xsl:package.
         */
        protected xsltMode(context: ExprContext, template: XNode): void {
            if (!this.currentPackage) {
                throw new Error('<xsl:mode> can only appear as a child of <xsl:package>.');
            }

            const name = xmlGetAttribute(template, 'name');
            if (!name) {
                throw new Error('<xsl:mode> requires a "name" attribute.');
            }

            // Get mode properties
            const visibility = (xmlGetAttribute(template, 'visibility') || 'public') as ComponentVisibility;
            const streamableAttr = xmlGetAttribute(template, 'streamable');
            const onNoMatch = xmlGetAttribute(template, 'on-no-match');
            const onMultipleMatch = xmlGetAttribute(template, 'on-multiple-match');

            const streamable = streamableAttr === 'yes';

            // Initialize modes map if not already done
            if (!this.currentPackage.modes) {
                this.currentPackage.modes = new Map();
            }

            // Register the mode with its properties
            const modeProperties: ModeProperties = {
                name,
                visibility,
                streamable,
                onNoMatch,
                onMultipleMatch
            };

            this.currentPackage.modes.set(name, modeProperties);

            // Also register as a component for tracking
            const componentKey = makeComponentKey({ type: 'mode', name, visibility } as any);
            if (!this.currentPackage.components.has(componentKey)) {
                this.currentPackage.components.set(componentKey, {
                    type: 'mode',
                    name,
                    visibility,
                    overridable: false,
                    node: template
                });
            }
        }

        /**
         * Get the effective component, checking for overrides first.
         * If the component has been overridden in the current package, returns the override.
         * Otherwise, returns the original component.
         * @param component The original component
         * @returns The effective component (override or original)
         */
        private getEffectiveComponent(component: PackageComponentInterface): PackageComponentInterface {
            if (!this.currentPackage) {
                return component;
            }

            const componentKey = makeComponentKey(component);
            const override = this.currentPackage.overrides.get(componentKey);
            return override || component;
        }

        /**
         * Collect templates from accepted components in used packages.
         * @param mode The mode to match (null for default mode)
         * @returns Array of template priority interfaces
         */
        private collectAcceptedTemplates(mode: string | null): TemplatePriorityInterface[] {
            const templates: TemplatePriorityInterface[] = [];
            
            if (!this.currentPackage) {
                return templates;
            }

            // Iterate through all used packages
            this.currentPackage.usedPackages.forEach((usedPkg, packageKey) => {
                // Look at accepted components
                usedPkg.acceptedComponents.forEach((component, componentKey) => {
                    if (component.type === 'template' && component.isAccepted) {
                        // Check for overrides - use the effective component
                        const effectiveComponent = this.getEffectiveComponent(component);
                        const templateNode = effectiveComponent.node;
                        
                        // If this is an override, store the original for xsl:original
                        const isOverride = effectiveComponent !== component;
                        const originalForContext = isOverride ? component : undefined;
                        
                        // Check if this template matches the requested mode
                        const templateMode = xmlGetAttribute(templateNode, 'mode') || null;
                        const effectiveMode = mode || null;
                        if (effectiveMode !== templateMode) {
                            return;
                        }
                        
                        // Only include templates with match patterns
                        const match = xmlGetAttribute(templateNode, 'match');
                        if (!match) {
                            return;
                        }
                        
                        // Get priority
                        const priorityAttr = xmlGetAttribute(templateNode, 'priority');
                        const explicitPriority = priorityAttr ? parseFloat(priorityAttr) : null;
                        
                        // Calculate default priority - use 0 as a safe default for accepted templates
                        const defaultPriority = component.priority || 0;
                        const effectivePriority = explicitPriority !== null && !isNaN(explicitPriority)
                            ? explicitPriority
                            : defaultPriority;
                        
                        templates.push({
                            template: templateNode,
                            explicitPriority: explicitPriority !== null && !isNaN(explicitPriority) ? explicitPriority : null,
                            defaultPriority,
                            effectivePriority,
                            importPrecedence: 0, // Accepted templates have neutral precedence
                            documentOrder: 0,
                            matchPattern: match,
                            originalComponent: originalForContext // Store original for xsl:original support
                        });
                    }
                });
            });

            return templates;
        }

    /**
     * Implements `<xsl:stream>` (XSLT 3.0 Section 16).
     * Enables streaming processing of large documents.
     * @param context The Expression Context.
     * @param template The xsl:stream element.
     * @param output The output node.
     */
    protected async xsltStream(context: ExprContext, template: XNode, output?: XNode) {
        // Update streaming processor with current version
        this.streamingProcessor.setVersion(this.version);
        
        // Create child processor callback
        const childProcessor: StreamingChildProcessor = {
            processChildren: (ctx, tmpl, out) => this.xsltChildNodes(ctx, tmpl, out),
            isXsltElement: (node, name) => this.isXsltElement(node, name)
        };
        
        await this.streamingProcessor.processStream(context, template, output, childProcessor);
    }

    /**
     * Implements `<xsl:fork>` (XSLT 3.0 Section 17).
     * Creates multiple independent output branches from the input stream.
     * @param context The Expression Context.
     * @param template The xsl:fork element.
     * @param output The output node.
     */
    protected async xsltFork(context: ExprContext, template: XNode, output?: XNode) {
        // Create child processor callback
        const childProcessor: StreamingChildProcessor = {
            processChildren: (ctx, tmpl, out) => this.xsltChildNodes(ctx, tmpl, out),
            isXsltElement: (node, name) => this.isXsltElement(node, name)
        };
        
        await this.streamingProcessor.processFork(context, template, output, childProcessor);
    }

    /**
     * Implements `<xsl:merge>` (XSLT 3.0 Section 15).
     * Merges multiple sorted input sequences.
     * @param context The Expression Context.
     * @param template The xsl:merge element.
     * @param output The output node.
     */
    protected async xsltMerge(context: ExprContext, template: XNode, output?: XNode) {
        // Update streaming processor with current version
        this.streamingProcessor.setVersion(this.version);
        
        // Create child processor callback
        const childProcessor: StreamingChildProcessor = {
            processChildren: (ctx, tmpl, out) => this.xsltChildNodes(ctx, tmpl, out),
            isXsltElement: (node, name) => this.isXsltElement(node, name)
        };
        
        await this.streamingProcessor.processMerge(context, template, output, childProcessor);
    }

    /**
     * Implements `xsl:key`.
     * @param context The Expression Context.
     * @param template The template.
     */
    protected xsltKey(context: ExprContext, template: XNode) {
        // `name`, `match`, and `use` are required.
        const name: string = xmlGetAttribute(template, 'name');
        const match: string = xmlGetAttribute(template, 'match');
        const use: string = xmlGetAttribute(template, 'use');

        if (!name || !match || !use) {
            let errorMessage = '<xsl:key> missing required parameters: ';
            if (!name) {
                errorMessage += 'name, ';
            }

            if (!match) {
                errorMessage += 'match, ';
            }

            if (!use) {
                errorMessage += 'use, ';
            }

            errorMessage = errorMessage.slice(0, -2);
            throw new Error(errorMessage);
        }

        let keyContext: ExprContext;
        if (context.nodeList[context.position].nodeName === '#document') {
            keyContext = context.clone(context.nodeList[context.position].childNodes);
        } else {
            keyContext = context;
        }

        const nodes = this.xsltMatch(match, keyContext);
        if (!(name in context.keys)) {
            context.keys[name] = {};
        }

        for (const node of nodes) {
            const nodeContext = context.clone([node]);
            const attribute = this.xPath.xPathEval(use, nodeContext);
            const attributeValue = attribute.stringValue();
            context.keys[name][attributeValue] = new NodeSetValue([node]);
        }
    }

    /**
     * Implements `xsl:message`.
     * Outputs a message to the console. If terminate="yes", throws an error to stop processing.
     * @param context The Expression Context.
     * @param template The `<xsl:message>` node.
     */
    protected async xsltMessage(context: ExprContext, template: XNode) {
        // Build the message content by processing child nodes
        const documentFragment = domCreateDocumentFragment(this.outputDocument);
        await this.xsltChildNodes(context, template, documentFragment);
        const messageText = xmlValue(documentFragment);

        // Check the terminate attribute
        const terminate = xmlGetAttribute(template, 'terminate') || 'no';

        // Output the message to console
        console.log(`[xsl:message] ${messageText}`);

        // If terminate="yes", stop processing by throwing an error
        if (terminate === 'yes') {
            throw new Error(`xsl:message terminated: ${messageText}`);
        }
    }

    /**
     * Implements `xsl:namespace-alias`.
     * Declares that a namespace URI in the stylesheet should be replaced by a different
     * namespace URI in the output.
     * @param template The `<xsl:namespace-alias>` node.
     */
    protected xsltNamespaceAlias(template: XNode) {
        const stylesheetPrefix = xmlGetAttribute(template, 'stylesheet-prefix');
        const resultPrefix = xmlGetAttribute(template, 'result-prefix');

        if (!stylesheetPrefix || !resultPrefix) {
            throw new Error('<xsl:namespace-alias> requires both stylesheet-prefix and result-prefix attributes.');
        }

        // Store the alias mapping
        // "#default" represents the default namespace (no prefix)
        this.namespaceAliases.set(stylesheetPrefix, resultPrefix);
    }

    /**
     * Implements `xsl:number`.
     * Inserts a formatted number into the result tree.
     * @param context The Expression Context.
     * @param template The `<xsl:number>` node.
     * @param output The output node.
     */
    protected xsltNumber(context: ExprContext, template: XNode, output?: XNode) {
        const value = xmlGetAttribute(template, 'value');
        const level = xmlGetAttribute(template, 'level') || 'single';
        const count = xmlGetAttribute(template, 'count');
        const from = xmlGetAttribute(template, 'from');
        const format = xmlGetAttribute(template, 'format') || '1';
        const lang = xmlGetAttribute(template, 'lang');
        const letterValue = xmlGetAttribute(template, 'letter-value');
        const groupingSeparator = xmlGetAttribute(template, 'grouping-separator');
        const groupingSize = xmlGetAttribute(template, 'grouping-size');

        let numbers: number[];

        if (value) {
            // If value attribute is present, evaluate it as an XPath expression
            const result = this.xPath.xPathEval(value, context);
            numbers = [Math.round(result.numberValue())];
        } else {
            // Otherwise, count nodes based on level, count, and from attributes
            numbers = this.xsltNumberCount(context, level, count, from);
        }

        // Format the numbers (handles both single and multiple levels)
        const formattedNumber = this.xsltFormatNumbers(numbers, format, groupingSeparator, groupingSize);

        // Create text node with the formatted number
        const textNode = domCreateTextNode(this.outputDocument, formattedNumber);
        const targetOutput = output || this.outputDocument;
        textNode.siblingPosition = targetOutput.childNodes.length;
        domAppendChild(targetOutput, textNode);
    }

    /**
     * Counts nodes for xsl:number based on level, count, and from attributes.
     * @param context The Expression Context.
     * @param level The counting level: 'single', 'multiple', or 'any'.
     * @param count Pattern to match nodes to count.
     * @param from Pattern to define counting boundary.
     * @returns Array of count values (single element for 'single'/'any', multiple for 'multiple').
     */
    protected xsltNumberCount(context: ExprContext, level: string, count: string | null, from: string | null): number[] {
        const currentNode = context.nodeList[context.position];

        // Default count pattern matches nodes with the same name and type as current node
        const countPattern = count || currentNode.nodeName;

        switch (level) {
            case 'single': {
                // Find the first ancestor-or-self that matches count pattern
                // If from is specified, stop at the from boundary
                let node: XNode | null = currentNode;
                while (node) {
                    if (this.nodeMatchesPattern(node, countPattern)) {
                        // Count preceding siblings (plus 1 for self) that match
                        let num = 1;
                        let sibling = node.previousSibling;
                        while (sibling) {
                            if (this.nodeMatchesPattern(sibling, countPattern)) {
                                num++;
                            }
                            sibling = sibling.previousSibling;
                        }
                        return [num];
                    }
                    // Check if we've hit the from boundary
                    if (from && this.nodeMatchesPattern(node, from)) {
                        break;
                    }
                    node = node.parentNode;
                }
                return [0];
            }
            case 'multiple': {
                // Build hierarchical number by walking up ancestor chain
                // Each level counts position among siblings matching count pattern
                const numbers: number[] = [];
                let node: XNode | null = currentNode;

                // First, collect all ancestors matching count pattern (up to from boundary)
                const matchingAncestors: XNode[] = [];
                while (node) {
                    if (this.nodeMatchesPattern(node, countPattern)) {
                        matchingAncestors.push(node);
                    }
                    // Check if we've hit the from boundary
                    if (from && this.nodeMatchesPattern(node, from)) {
                        break;
                    }
                    node = node.parentNode;
                }

                // Process from outermost to innermost (reverse order)
                for (let i = matchingAncestors.length - 1; i >= 0; i--) {
                    const ancestor = matchingAncestors[i];
                    let num = 1;
                    let sibling = ancestor.previousSibling;
                    while (sibling) {
                        if (this.nodeMatchesPattern(sibling, countPattern)) {
                            num++;
                        }
                        sibling = sibling.previousSibling;
                    }
                    numbers.push(num);
                }

                return numbers.length > 0 ? numbers : [0];
            }
            case 'any': {
                // Count all preceding nodes in document order that match
                // If from is specified, only count nodes after the from boundary
                let num = 0;
                const allNodes = this.getAllPrecedingNodes(currentNode, from);

                // Count self if it matches
                if (this.nodeMatchesPattern(currentNode, countPattern)) {
                    num = 1;
                }

                for (const node of allNodes) {
                    if (this.nodeMatchesPattern(node, countPattern)) {
                        num++;
                    }
                }
                return [num];
            }
            default:
                return [1];
        }
    }

    /**
     * Checks if a node matches a pattern (supports simple names and union patterns).
     * @param node The node to check.
     * @param pattern The pattern (node name, wildcard, or union like "a|b|c").
     * @returns True if the node matches.
     */
    protected nodeMatchesPattern(node: XNode, pattern: string): boolean {
        // Handle union patterns (e.g., "chapter|section|para")
        if (pattern.includes('|')) {
            const alternatives = pattern.split('|').map(p => p.trim());
            return alternatives.some(alt => this.nodeMatchesSinglePattern(node, alt));
        }
        return this.nodeMatchesSinglePattern(node, pattern);
    }

    /**
     * Checks if a node matches a single (non-union) pattern.
     * @param node The node to check.
     * @param pattern The pattern (node name or wildcard).
     * @returns True if the node matches.
     */
    protected nodeMatchesSinglePattern(node: XNode, pattern: string): boolean {
        if (pattern === '*') {
            return node.nodeType === DOM_ELEMENT_NODE;
        }
        if (pattern === 'node()') {
            return true;
        }
        if (pattern === 'text()') {
            return node.nodeType === DOM_TEXT_NODE;
        }
        if (pattern === 'comment()') {
            return node.nodeType === DOM_COMMENT_NODE;
        }
        if (pattern.startsWith('processing-instruction')) {
            return node.nodeType === DOM_PROCESSING_INSTRUCTION_NODE;
        }
        return node.nodeName === pattern || node.localName === pattern;
    }

    /**
     * Gets all nodes preceding the given node in document order.
     * @param node The reference node.
     * @param fromPattern Optional pattern to define counting boundary.
     * @returns Array of preceding nodes.
     */
    protected getAllPrecedingNodes(node: XNode, fromPattern: string | null = null): XNode[] {
        const result: XNode[] = [];

        // Get preceding siblings
        let sibling = node.previousSibling;
        while (sibling) {
            // Check if we've hit the from boundary
            if (fromPattern && this.nodeMatchesPattern(sibling, fromPattern)) {
                // Include descendants after the from boundary element
                this.collectDescendants(sibling, result);
                return result;
            }
            result.push(sibling);
            // Add descendants of preceding siblings
            this.collectDescendants(sibling, result);
            sibling = sibling.previousSibling;
        }

        // Get ancestors' preceding siblings
        let parent = node.parentNode;
        while (parent) {
            // Check if parent matches from pattern (stop here)
            if (fromPattern && this.nodeMatchesPattern(parent, fromPattern)) {
                return result;
            }

            let parentSibling = parent.previousSibling;
            while (parentSibling) {
                // Check if we've hit the from boundary
                if (fromPattern && this.nodeMatchesPattern(parentSibling, fromPattern)) {
                    this.collectDescendants(parentSibling, result);
                    return result;
                }
                result.push(parentSibling);
                this.collectDescendants(parentSibling, result);
                parentSibling = parentSibling.previousSibling;
            }
            parent = parent.parentNode;
        }

        return result;
    }

    /**
     * Collects all descendant nodes of a given node.
     * @param node The parent node.
     * @param result The array to collect into.
     */
    protected collectDescendants(node: XNode, result: XNode[]): void {
        for (const child of node.childNodes) {
            if (child.nodeType === DOM_ELEMENT_NODE) {
                result.push(child);
                this.collectDescendants(child, result);
            }
        }
    }

    /**
     * Formats an array of numbers according to the format string.
     * For level="multiple", numbers like [1, 2, 3] with format "1.1.1" produce "1.2.3".
     * @param numbers The numbers to format.
     * @param format The format string (e.g., "1", "1.1", "1.a.i").
     * @param groupingSeparator Optional grouping separator.
     * @param groupingSize Optional grouping size.
     * @returns The formatted number string.
     */
    protected xsltFormatNumbers(
        numbers: number[],
        format: string,
        groupingSeparator: string | null,
        groupingSize: string | null
    ): string {
        if (numbers.length === 0) return '0';

        // Parse the format string to extract format tokens and separators
        // Format like "1.a.i" has tokens ["1", "a", "i"] with separator "."
        const { tokens, separators } = this.parseFormatString(format);

        const formattedParts: string[] = [];
        for (let i = 0; i < numbers.length; i++) {
            // Use corresponding token, or last token if we run out
            const tokenIndex = Math.min(i, tokens.length - 1);
            const token = tokens[tokenIndex] || '1';
            const formatted = this.xsltFormatNumber(numbers[i], token, groupingSeparator, groupingSize);
            formattedParts.push(formatted);
        }

        // Join with separators
        if (formattedParts.length === 1) {
            return formattedParts[0];
        }

        let result = formattedParts[0];
        for (let i = 1; i < formattedParts.length; i++) {
            // Use corresponding separator, or last separator if we run out
            const sepIndex = Math.min(i - 1, separators.length - 1);
            const sep = separators.length > 0 ? separators[sepIndex] : '.';
            result += sep + formattedParts[i];
        }

        return result;
    }

    /**
     * Parses a format string into tokens and separators.
     * E.g., "1.a.i" -> tokens: ["1", "a", "i"], separators: [".", "."]
     * @param format The format string.
     * @returns Object with tokens and separators arrays.
     */
    protected parseFormatString(format: string): { tokens: string[]; separators: string[] } {
        const tokens: string[] = [];
        const separators: string[] = [];

        // Format tokens are: 1, 01, 001, a, A, i, I, or sequences like 0001
        // Everything else is a separator
        const tokenRegex = /^(0*1|[aAiI])/;
        let remaining = format;
        let lastWasToken = false;

        while (remaining.length > 0) {
            const match = remaining.match(tokenRegex);
            if (match) {
                tokens.push(match[1]);
                remaining = remaining.substring(match[1].length);
                lastWasToken = true;
            } else {
                // This character is a separator
                if (lastWasToken && tokens.length > 0) {
                    // Find separator until next token or end
                    let sepEnd = 1;
                    while (sepEnd < remaining.length && !remaining.substring(sepEnd).match(tokenRegex)) {
                        sepEnd++;
                    }
                    separators.push(remaining.substring(0, sepEnd));
                    remaining = remaining.substring(sepEnd);
                } else {
                    // Leading separator or continuation - skip one char
                    remaining = remaining.substring(1);
                }
                lastWasToken = false;
            }
        }

        // Default to "1" if no tokens found
        if (tokens.length === 0) {
            tokens.push('1');
        }

        // Default separator is "."
        if (separators.length === 0 && tokens.length > 1) {
            for (let i = 1; i < tokens.length; i++) {
                separators.push('.');
            }
        }

        return { tokens, separators };
    }

    /**
     * Formats a number according to the format string.
     * @param number The number to format.
     * @param format The format string (e.g., "1", "01", "a", "A", "i", "I").
     * @param groupingSeparator Optional grouping separator.
     * @param groupingSize Optional grouping size.
     * @returns The formatted number string.
     */
    protected xsltFormatNumber(
        number: number,
        format: string,
        groupingSeparator: string | null,
        groupingSize: string | null
    ): string {
        if (format.match(/^0+1$/)) {
            const width = format.length;
            let result = number.toString().padStart(width, '0');
            if (groupingSeparator && groupingSize) {
                const size = parseInt(groupingSize, 10);
                if (size > 0 && !isNaN(size)) {
                    result = this.applyGrouping(result, groupingSeparator, size);
                }
            }
            return result;
        }

        // Handle different format tokens
        const formatChar = format.charAt(0);

        let result: string;

        switch (formatChar) {
            case '1':
                result = number.toString();
                // Handle zero-padding (e.g., "01" -> "01", "02", etc.)
                if (format.length > 1 && format.match(/^0+1$/)) {
                    const width = format.length;
                    result = number.toString().padStart(width, '0');
                }
                break;
            case 'a':
                // Lowercase alphabetic: a, b, c, ..., z, aa, ab, ...
                result = this.numberToAlpha(number, false);
                break;
            case 'A':
                // Uppercase alphabetic: A, B, C, ..., Z, AA, AB, ...
                result = this.numberToAlpha(number, true);
                break;
            case 'i':
                // Lowercase Roman numerals
                result = this.numberToRoman(number).toLowerCase();
                break;
            case 'I':
                // Uppercase Roman numerals
                result = this.numberToRoman(number);
                break;
            default:
                result = number.toString();
        }

        // Apply grouping if specified
        if (groupingSeparator && groupingSize) {
            const size = parseInt(groupingSize, 10);
            if (size > 0 && !isNaN(size)) {
                result = this.applyGrouping(result, groupingSeparator, size);
            }
        }

        return result;
    }

    /**
     * Converts a number to alphabetic representation.
     * @param number The number to convert.
     * @param uppercase Whether to use uppercase letters.
     * @returns The alphabetic representation.
     */
    protected numberToAlpha(number: number, uppercase: boolean): string {
        if (number <= 0) return '';

        let result = '';
        while (number > 0) {
            number--;
            result = String.fromCharCode((number % 26) + (uppercase ? 65 : 97)) + result;
            number = Math.floor(number / 26);
        }
        return result;
    }

    /**
     * Converts a number to Roman numeral representation.
     * @param number The number to convert.
     * @returns The Roman numeral string.
     */
    protected numberToRoman(number: number): string {
        if (number <= 0 || number > 3999) return number.toString();

        const romanNumerals: [number, string][] = [
            [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
            [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
            [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
        ];

        let result = '';
        for (const [value, numeral] of romanNumerals) {
            while (number >= value) {
                result += numeral;
                number -= value;
            }
        }
        return result;
    }

    /**
     * Applies grouping separators to a numeric string.
     * @param numStr The numeric string.
     * @param separator The grouping separator.
     * @param size The grouping size.
     * @returns The grouped string.
     */
    protected applyGrouping(numStr: string, separator: string, size: number): string {
        // Only apply to the integer part
        const parts = numStr.split('.');
        let intPart = parts[0];
        const decPart = parts[1];

        // Apply grouping from right to left
        let result = '';
        let count = 0;
        for (let i = intPart.length - 1; i >= 0; i--) {
            if (count > 0 && count % size === 0) {
                result = separator + result;
            }
            result = intPart[i] + result;
            count++;
        }

        return decPart ? result + '.' + decPart : result;
    }

    /**
     * Orders the current node list in the input context according to the
     * sort order specified by xsl:sort child nodes of the current
     * template node. This happens before the operation specified by the
     * current template node is executed.
     * @param context The expression context.
     * @param template The template node.
     * @todo case-order is not implemented.
     */
    protected xsltSort(context: ExprContext, template: XNode) {
        const sort: any[] = [];

        for (const childNode of template.childNodes) {
            if (childNode.nodeType == DOM_ELEMENT_NODE && this.isXsltElement(childNode, 'sort')) {
                const select = xmlGetAttribute(childNode, 'select');
                const expression = this.xPath.xPathParse(select);
                const type = xmlGetAttribute(childNode, 'data-type') || 'text';
                const order = xmlGetAttribute(childNode, 'order') || 'ascending';
                sort.push({
                    expr: expression,
                    type,
                    order
                });
            }
        }

        this.xPath.xPathSort(context, sort);
    }

    private resolveNamespaceUriForPrefix(node: XNode, prefix: string | null): string | null {
        const attrName = prefix ? `xmlns:${prefix}` : 'xmlns';
        let current: XNode | null = node;

        while (current) {
            const attributes = current.childNodes.filter(
                (child) => child.nodeType === DOM_ATTRIBUTE_NODE
            );
            for (const attribute of attributes) {
                if (attribute.nodeName === attrName) {
                    return attribute.nodeValue;
                }

                if (prefix && attribute.prefix === 'xmlns' && attribute.localName === prefix) {
                    return attribute.nodeValue;
                }

                if (!prefix && attribute.nodeName === 'xmlns') {
                    return attribute.nodeValue;
                }
            }
            current = current.parentNode;
        }

        return null;
    }

    private isNamespaceDeclaredOnAncestor(node: XNode, nsAttr: string, nsUri: string): boolean {
        let current: XNode | null = node;
        while (current) {
            const value = domGetAttributeValue(current, nsAttr);
            if (value === nsUri) {
                return true;
            }
            current = current.parentNode;
        }
        return false;
    }

    private parseWhitespacePattern(pattern: string, template: XNode): WhitespacePattern {
        if (pattern === '*') {
            return { namespaceUri: null, localName: '*', isWildcard: true };
        }

        if (pattern.includes(':')) {
            const [prefix, localPart] = pattern.split(':');
            const namespaceUri = this.resolveNamespaceUriForPrefix(template, prefix);
            return {
                namespaceUri: namespaceUri ?? null,
                localName: localPart || '*',
                isWildcard: localPart === '*'
            };
        }

        return { namespaceUri: null, localName: pattern, isWildcard: false };
    }

    /**
     * Implements `xsl:strip-space`.
     * Collects element name patterns for which whitespace-only text nodes should be stripped.
     * @param template The `<xsl:strip-space>` node.
     */
    protected xsltStripSpace(template: XNode) {
        const elements = xmlGetAttribute(template, 'elements');
        if (elements) {
            // Split on whitespace to get individual patterns (e.g., "* book" becomes ["*", "book"])
            const patterns = elements.trim().split(/\s+/);
            for (const pattern of patterns) {
                this.stripSpacePatterns.push(this.parseWhitespacePattern(pattern, template));
            }
        }
    }

    /**
     * Implements `xsl:preserve-space`.
     * Collects element name patterns for which whitespace-only text nodes should be preserved.
     * preserve-space takes precedence over strip-space for matching elements.
     * @param template The `<xsl:preserve-space>` node.
     */
    protected xsltPreserveSpace(template: XNode) {
        const elements = xmlGetAttribute(template, 'elements');
        if (elements) {
            // Split on whitespace to get individual patterns (e.g., "pre code" becomes ["pre", "code"])
            const patterns = elements.trim().split(/\s+/);
            for (const pattern of patterns) {
                this.preserveSpacePatterns.push(this.parseWhitespacePattern(pattern, template));
            }
        }
    }

    /**
     * Determines if a text node from the input document should be stripped.
     * This applies xsl:strip-space and xsl:preserve-space rules to whitespace-only text nodes.
     * @param textNode The text node to check.
     * @returns True if the text node should be stripped (not included in output).
     */
    protected shouldStripWhitespaceNode(textNode: XNode): boolean {
        // Only strip whitespace-only text nodes
        if (!textNode.nodeValue || !textNode.nodeValue.match(/^\s*$/)) {
            return false;
        }

        // If no strip-space patterns are defined, don't strip
        if (this.stripSpacePatterns.length === 0) {
            return false;
        }

        const parentElement = textNode.parentNode;
        if (!parentElement || parentElement.nodeType !== DOM_ELEMENT_NODE) {
            return false;
        }

        // Check for xml:space="preserve" on parent or ancestors (highest precedence)
        let ancestor = parentElement;
        while (ancestor && ancestor.nodeType === DOM_ELEMENT_NODE) {
            const xmlspace = domGetAttributeValue(ancestor, 'xml:space');
            if (xmlspace === 'preserve') {
                return false;
            }
            if (xmlspace === 'default') {
                break; // Continue to check strip-space/preserve-space rules
            }
            ancestor = ancestor.parentNode;
        }

        const parentName = parentElement.localName || parentElement.nodeName;

        // Check preserve-space patterns first (they take precedence over strip-space)
        for (const pattern of this.preserveSpacePatterns) {
            if (this.matchesNamePattern(parentName, pattern, parentElement)) {
                return false;
            }
        }

        // Check strip-space patterns
        for (const pattern of this.stripSpacePatterns) {
            if (this.matchesNamePattern(parentName, pattern, parentElement)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Matches an element name against a strip-space/preserve-space pattern.
     * Supports:
     * - "*" matches any element
     * - "prefix:*" matches any element in a namespace
     * - "name" matches elements with that local name
     * - "prefix:name" matches elements with that QName
     * @param elementName The local name of the element.
     * @param pattern The pattern to match against.
     * @param element The element node (for namespace checking).
     * @returns True if the element matches the pattern.
     */
    protected matchesNamePattern(
        elementName: string,
        pattern: WhitespacePattern,
        element: XNode
    ): boolean {
        const elementNamespace =
            element.namespaceUri ?? this.resolveNamespaceUriForPrefix(element, element.prefix || null);

        if (pattern.namespaceUri !== null) {
            if (elementNamespace !== pattern.namespaceUri) {
                return false;
            }
        } else if (!pattern.isWildcard && elementNamespace) {
            return false;
        }

        if (pattern.isWildcard) {
            return true;
        }

        return elementName === pattern.localName;
    }

    /**
     * Implements `xsl:template`.
     * @param context The Expression Context.
     * @param template The `<xsl:template>` node.
     * @param output The output. In general, a fragment that will be used by 
     *               the caller.
     */
    protected async xsltTemplate(context: ExprContext, template: XNode, output?: XNode) {
        // If `<xsl:template>` is executed outside `<xsl:apply-templates>`,
        // only one match is accepted per level (or per context here).
        if (!context.inApplyTemplates && context.baseTemplateMatched) {
            return;
        }

        const match = xmlGetAttribute(template, 'match');
        if (!match) return;

        // XPath doesn't have an axis to select "self and siblings", and
        // the default axis is "child", so to select the correct children
        // in relative path, we force a 'self-and-siblings' axis.
        const nodes = this.xsltMatch(match, context, 'self-and-siblings');
        if (nodes.length > 0) {
            this.firstTemplateRan = true;
            if (!context.inApplyTemplates) {
                context.baseTemplateMatched = true;
            }

            const templateContext = context.clone(nodes, 0);
            await this.xsltChildNodes(templateContext, template, output);
        }
    }

    protected xsltText(context: ExprContext, template: XNode, output?: XNode) {
        const text = xmlValue(template);
        const node = domCreateTextNode(this.outputDocument, text);
        // Mark this node as coming from xsl:text so it won't be trimmed during serialization
        node.fromXslText = true;
        const disableOutputEscaping = template.childNodes.filter(
            (a) => a.nodeType === DOM_ATTRIBUTE_NODE && a.nodeName === 'disable-output-escaping'
        );
        if (disableOutputEscaping.length > 0 && disableOutputEscaping[0].nodeValue === 'yes') {
            node.escape = false;
        }
        const destinationTextNode = output || this.outputDocument;
        // Set siblingPosition to preserve insertion order during serialization
        node.siblingPosition = destinationTextNode.childNodes.length;
        destinationTextNode.appendChild(node);
    }

    /**
     * Validates XSLT stylesheet/transform attributes.
     * According to XSLT specification, validates:
     * - Required version attribute
     * - Valid version values (1.0, 2.0, 3.0)
     * - Valid namespace declarations
     * - Valid values for optional attributes (extension-element-prefixes, exclude-result-prefixes)
     * @param stylesheetElement The `<xsl:stylesheet>` or `<xsl:transform>` element to validate.
     * @param context The Expression Context for namespace access.
     */
    protected validateStylesheetAttributes(stylesheetElement: XNode, context: ExprContext): void {
        const attributes = stylesheetElement.childNodes.filter((n) => n.nodeType === DOM_ATTRIBUTE_NODE);
        const validAttributes = ['version', 'id', 'extension-element-prefixes', 'exclude-result-prefixes', 'default-collation'];
        const validNamespaceAttributes = ['xmlns']; // xmlns and xmlns:* attributes
        
        let versionFound = false;

        for (let attribute of attributes) {
            const nodeName = attribute.nodeName;
            const nodeValue = attribute.nodeValue;

            // Check if it's a namespace declaration
            if (attribute.prefix === 'xmlns') {
                // xmlns:prefix namespace declarations are valid
                context.knownNamespaces[attribute.localName] = nodeValue;
                continue;
            }

            // Check if it's the default namespace declaration
            if (nodeName === 'xmlns') {
                context.knownNamespaces[''] = nodeValue;
                continue;
            }

            // Handle version attribute (XSLT 1.0 Section 2.5)
            if (nodeName === 'version') {
                versionFound = true;

                // Parse version as a number for comparison
                const versionNum = parseFloat(nodeValue);

                if (isNaN(versionNum) || versionNum <= 0) {
                    throw new Error(
                        `XSLT version not defined or invalid. Actual resolved version: ${nodeValue || '(none)'}.`
                    );
                }

                // XSLT 1.0 Section 2.5: Forwards-Compatible Processing
                // If the version is greater than what we support (1.0), enter forwards-compatible mode
                // This allows stylesheets written for future versions to be processed with graceful fallback
                if (versionNum > 1.0 && !['2.0', '3.0'].includes(nodeValue)) {
                    this.forwardsCompatible = true;
                    // Treat as 1.0 for processing but remember original version
                    this.version = nodeValue;
                    context.xsltVersion = '1.0';
                    this.warningsCallback(
                        `XSLT Warning: Stylesheet version "${nodeValue}" is not directly supported. ` +
                        `Entering forwards-compatible processing mode (XSLT 1.0 Section 2.5).`
                    );
                } else {
                    this.version = nodeValue;
                    context.xsltVersion = nodeValue as any;
                }
                continue;
            }

            // Validate extension-element-prefixes attribute
            if (nodeName === 'extension-element-prefixes') {
                // Should be a whitespace-separated list of namespace prefixes
                // Validate that prefixes are valid NCNames (basic check)
                const prefixes = nodeValue.split(/\s+/);
                for (const prefix of prefixes) {
                    if (prefix && !/^[a-zA-Z_:][\w:.-]*$/.test(prefix)) {
                        throw new Error(`Invalid prefix in extension-element-prefixes: "${prefix}". Prefixes must be valid QNames.`);
                    }
                }
                continue;
            }

            // Validate exclude-result-prefixes attribute
            if (nodeName === 'exclude-result-prefixes') {
                // Should be a whitespace-separated list of namespace prefixes
                // Special value "#all" is allowed
                if (nodeValue !== '#all') {
                    const prefixes = nodeValue.split(/\s+/);
                    for (const prefix of prefixes) {
                        if (prefix && !/^[a-zA-Z_:][\w:.-]*$/.test(prefix)) {
                            throw new Error(`Invalid prefix in exclude-result-prefixes: "${prefix}". Prefixes must be valid QNames or "#all".`);
                        }
                    }
                }
                continue;
            }

            // Validate default-collation attribute (XSLT 2.0+)
            if (nodeName === 'default-collation') {
                // Should be a URI, basic validation
                if (!nodeValue || nodeValue.trim().length === 0) {
                    throw new Error('The default-collation attribute must contain a URI.');
                }
                continue;
            }

            // Validate id attribute
            if (nodeName === 'id') {
                // id must be an XML NCName
                if (!/^[a-zA-Z_:][\w:.-]*$/.test(nodeValue)) {
                    throw new Error(`Invalid id attribute value: "${nodeValue}". IDs must be valid NCNames.`);
                }
                continue;
            }

            // If attribute is not a known XSLT attribute and not a namespace declaration, it might be valid
            // (like an attribute with a non-XSLT namespace), so we don't throw an error for unknown attributes
        }

        // Note: version attribute is optional in XSLT if a default version is defined in the system
        // However, it's strongly recommended, and we already validate it if provided
    }

    /**
     * Implements `<xsl:stylesheet>` and `<xsl:transform>`, and its corresponding
     * validations.
     * @param context The Expression Context.
     * @param template The `<xsl:stylesheet>` or `<xsl:transform>` node.
     * @param output The output. In general, a fragment that will be used by
     *               the caller.
     */
    protected async xsltTransformOrStylesheet(context: ExprContext, template: XNode, output?: XNode): Promise<void> {
        // Map templates from the main stylesheet (depth 0)
        const mainStylesheetMetadata: StylesheetMetadata = {
            importDepth: 0,
            href: '(main stylesheet)',
            order: 0
        };
        this.mapTemplatesFromStylesheet(template, mainStylesheetMetadata);
        
        // Collect attribute sets from stylesheet at the beginning
        this.collectAttributeSets(template);

        // Collect user-defined functions from stylesheet
        this.collectUserDefinedFunctions(template, context);

        // Register user-defined functions in context so they're available to XPath
        this.registerUserDefinedFunctionsInContext(context);

        // Validate stylesheet attributes
        this.validateStylesheetAttributes(template, context);

        // Validate that xsl:import elements are the first children (before any other elements)
        let importsDone = false;
        for (const child of template.childNodes) {
            if (child.nodeType === DOM_ELEMENT_NODE) {
                if (this.isXsltElement(child, 'import')) {
                    if (importsDone) {
                        throw new Error('<xsl:import> should be the first child node of <xsl:stylesheet> or <xsl:transform>.');
                    }
                } else {
                    importsDone = true;
                }
            }
        }

        // Separate templates from other stylesheet children (output, variable, key, etc.)
        const nonTemplates: XNode[] = [];
        const templates: XNode[] = [];

        for (const child of template.childNodes) {
            if (child.nodeType === DOM_ELEMENT_NODE && this.isXsltElement(child, 'template')) {
                templates.push(child);
            } else {
                nonTemplates.push(child);
            }
        }

        // Process non-template children first (declarations like output, variable, key, etc.)
        const contextClone = context.clone();
        for (const child of nonTemplates) {
            await this.xsltProcessContext(contextClone, child, output);
        }

        // Now select and execute the best matching template using priority rules
        if (templates.length > 0) {
            const expandedTemplates = collectAndExpandTemplates(template, null, this.xPath, this.templateSourceMap);

            // Find all (template, matchedNodes) pairs by testing each template's pattern
            const matchCandidates: { priority: TemplatePriorityInterface; matchedNodes: XNode[] }[] = [];

            for (const t of expandedTemplates) {
                try {
                    // For initial template selection, evaluate patterns from document root
                    // without axis override to ensure consistent matching for all patterns
                    const matchedNodes = this.xsltMatch(t.matchPattern, contextClone);
                    if (matchedNodes.length > 0) {
                        matchCandidates.push({ priority: t, matchedNodes });
                    }
                } catch (e) {
                    // If pattern parsing fails, skip this template
                    this.warningsCallback(`Failed to match pattern "${t.matchPattern}":`, e);
                }
            }

            if (matchCandidates.length > 0) {
                // First, check if "/" pattern matches - it's the document entry point and should be preferred
                const rootPatternMatch = matchCandidates.find(c => c.priority.matchPattern === '/');
                let winner: { priority: TemplatePriorityInterface; matchedNodes: XNode[] };
                
                if (rootPatternMatch) {
                    // Use the root template as entry point
                    winner = rootPatternMatch;
                } else {
                    // Sort by: importPrecedence DESC, effectivePriority DESC, documentOrder DESC
                    matchCandidates.sort((a, b) => {
                        if (a.priority.importPrecedence !== b.priority.importPrecedence) {
                            return b.priority.importPrecedence - a.priority.importPrecedence;
                        }
                        if (a.priority.effectivePriority !== b.priority.effectivePriority) {
                            return b.priority.effectivePriority - a.priority.effectivePriority;
                        }
                        return b.priority.documentOrder - a.priority.documentOrder;
                    });
                    winner = matchCandidates[0];
                }

                // Detect conflicts
                const conflicts = matchCandidates.filter(t =>
                    t.priority.importPrecedence === winner.priority.importPrecedence &&
                    t.priority.effectivePriority === winner.priority.effectivePriority
                );

                if (conflicts.length > 1) {
                    const patterns = conflicts
                        .map(t => `"${t.priority.matchPattern}" (priority: ${t.priority.effectivePriority})`)
                        .join(', ');
                    this.warningsCallback(
                        `XSLT Warning: Ambiguous template match. ` +
                        `Multiple templates match with equal priority: ${patterns}. ` +
                        `Using the last one in document order.`
                    );
                }

                // Execute ONLY the selected template
                this.firstTemplateRan = true;
                contextClone.baseTemplateMatched = true;
                const templateContext = contextClone.clone(winner.matchedNodes, 0);
                
                // Track this template execution for apply-imports
                const metadata = this.templateSourceMap.get(winner.priority.template);
                const matchPattern = xmlGetAttribute(winner.priority.template, 'match');
                const modeAttr = xmlGetAttribute(winner.priority.template, 'mode');
                
                this.currentTemplateStack.push({
                    template: winner.priority.template,
                    stylesheetDepth: metadata?.importDepth ?? 0,
                    mode: modeAttr || null,
                    match: matchPattern
                });
                
                await this.xsltChildNodes(templateContext, winner.priority.template, output);
                
                this.currentTemplateStack.pop();
            } else {
                // No template matched the root element.
                // Apply the default XSLT behavior: process child nodes
                const rootNode = context.nodeList[context.position];
                if (rootNode && rootNode.childNodes && rootNode.childNodes.length > 0) {
                    // Filter out DTD sections and apply templates to remaining children
                    const childNodes = rootNode.childNodes.filter((n: XNode) => n.nodeName !== '#dtd-section');
                    if (childNodes.length > 0) {
                        const childContext = context.clone(childNodes);
                        // Process each child node using xsltApplyTemplates logic
                        for (let j = 0; j < childContext.contextSize(); ++j) {
                            const currentNode = childContext.nodeList[j];

                            if (currentNode.nodeType === DOM_TEXT_NODE) {
                                const textNodeContext = context.clone([currentNode], 0);
                                this.commonLogicTextNode(textNodeContext, currentNode, output);
                            } else {
                                const clonedContext = childContext.clone([currentNode], 0);
                                const selection = selectBestTemplate(
                                    expandedTemplates,
                                    clonedContext,
                                    this.matchResolver,
                                    this.xPath,
                                    this.warningsCallback
                                );

                                if (selection.selectedTemplate) {
                                    const templateContext = clonedContext.clone([currentNode], 0);
                                    templateContext.inApplyTemplates = true;
                                    
                                    // Track this template execution for apply-imports
                                    const metadata = this.templateSourceMap.get(selection.selectedTemplate);
                                    const matchPattern = xmlGetAttribute(selection.selectedTemplate, 'match');
                                    const modeAttr = xmlGetAttribute(selection.selectedTemplate, 'mode');
                                    
                                    this.currentTemplateStack.push({
                                        template: selection.selectedTemplate,
                                        stylesheetDepth: metadata?.importDepth ?? 0,
                                        mode: modeAttr || null,
                                        match: matchPattern
                                    });
                                    
                                    await this.xsltChildNodes(templateContext, selection.selectedTemplate, output);
                                    
                                    this.currentTemplateStack.pop();
                                } else {
                                    // If no template matches this child, recursively process its children
                                    if (currentNode.childNodes && currentNode.childNodes.length > 0) {
                                        const grandchildNodes = currentNode.childNodes.filter((n: XNode) => n.nodeName !== '#dtd-section');
                                        if (grandchildNodes.length > 0) {
                                            const grandchildContext = context.clone(grandchildNodes);
                                            // Recursively process grandchildren
                                            for (let k = 0; k < grandchildContext.contextSize(); ++k) {
                                                const grandchildNode = grandchildContext.nodeList[k];
                                                if (grandchildNode.nodeType === DOM_TEXT_NODE) {
                                                    const textNodeContext = context.clone([grandchildNode], 0);
                                                    this.commonLogicTextNode(textNodeContext, grandchildNode, output);
                                                } else {
                                                    const grandchildClonedContext = grandchildContext.clone([grandchildNode], 0);
                                                    const grandchildSelection = selectBestTemplate(
                                                        expandedTemplates,
                                                        grandchildClonedContext,
                                                        this.matchResolver,
                                                        this.xPath,
                                                        this.warningsCallback
                                                    );
                                                    if (grandchildSelection.selectedTemplate) {
                                                        const grandchildTemplateContext = grandchildClonedContext.clone([grandchildNode], 0);
                                                        grandchildTemplateContext.inApplyTemplates = true;
                                                        
                                                        // Track this template execution for apply-imports
                                                        const metadata = this.templateSourceMap.get(grandchildSelection.selectedTemplate);
                                                        const matchPattern = xmlGetAttribute(grandchildSelection.selectedTemplate, 'match');
                                                        const modeAttr = xmlGetAttribute(grandchildSelection.selectedTemplate, 'mode');
                                                        
                                                        this.currentTemplateStack.push({
                                                            template: grandchildSelection.selectedTemplate,
                                                            stylesheetDepth: metadata?.importDepth ?? 0,
                                                            mode: modeAttr || null,
                                                            match: matchPattern
                                                        });
                                                        
                                                        await this.xsltChildNodes(grandchildTemplateContext, grandchildSelection.selectedTemplate, output);
                                                        
                                                        this.currentTemplateStack.pop();
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    protected xsltValueOf(context: ExprContext, template: XNode, output?: XNode) {
        const select = xmlGetAttribute(template, 'select');
        const current = context.nodeList[context.position];

        // First try evaluating in the current context. If that returns an
        // empty result and the current node is the document node, try again
        // evaluating against the document element (fallback), which helps
        // with some templates written to expect either form.
        let attribute = this.xPath.xPathEval(select, context);
        if (
            current &&
            current.nodeName === '#document' &&
            (attribute.stringValue() === '' || (attribute instanceof NodeSetValue && attribute.nodeSetValue().length === 0))
        ) {
            const docChild = current.childNodes.find((c: XNode) => c.nodeName !== '#dtd-section');
            if (docChild) {
                const fallbackContext = context.clone([docChild], 0);
                attribute = this.xPath.xPathEval(select, fallbackContext);
            }
        }

        const value = attribute.stringValue();
        const node = domCreateTextNode(this.outputDocument, value);
        // Set siblingPosition to preserve insertion order during serialization
        const targetOutput = output || this.outputDocument;
        node.siblingPosition = targetOutput.childNodes.length;
        targetOutput.appendChild(node);
    }

    /**
     * Implements `xsl:sequence` (XSLT 2.0).
     *
     * Constructs a sequence by evaluating the select expression or processing
     * child content. Unlike xsl:copy-of, xsl:sequence returns nodes by reference
     * and can return atomic values.
     *
     * @param context The expression context.
     * @param template The xsl:sequence element.
     * @param output The output node.
     */
    protected async xsltSequence(context: ExprContext, template: XNode, output?: XNode): Promise<void> {
        const select = xmlGetAttribute(template, 'select');
        const destinationNode = output || this.outputDocument;

        if (select) {
            // Evaluate the select expression
            const result: any = this.xPath.xPathEval(select, context);

            if (result.type === 'node-set') {
                // For node sequences, output each node
                const nodes = result.nodeSetValue();
                for (const node of nodes) {
                    this.xsltCopyOf(destinationNode, node);
                }
            } else {
                // For atomic values (string, number, boolean), output as text
                const textNode = domCreateTextNode(this.outputDocument, result.stringValue());
                textNode.siblingPosition = destinationNode.childNodes.length;
                domAppendChild(destinationNode, textNode);
            }
        } else {
            // No select attribute - process child content
            await this.xsltChildNodes(context, template, output);
        }
    }

    /**
     * Implements `xsl:analyze-string` (XSLT 2.0).
     *
     * Processes a string using a regular expression, with separate handling
     * for matching and non-matching substrings.
     *
     * @param context The expression context.
     * @param template The xsl:analyze-string element.
     * @param output The output node.
     */
    protected async xsltAnalyzeString(context: ExprContext, template: XNode, output?: XNode): Promise<void> {
        const selectAttr = xmlGetAttribute(template, 'select');
        const regexAttr = xmlGetAttribute(template, 'regex');
        const flagsAttr = xmlGetAttribute(template, 'flags') || '';

        if (!selectAttr) {
            throw new Error('<xsl:analyze-string> requires a select attribute.');
        }
        if (!regexAttr) {
            throw new Error('<xsl:analyze-string> requires a regex attribute.');
        }

        // Evaluate the select expression to get the string to analyze
        const inputValue = this.xPath.xPathEval(selectAttr, context);
        const inputString = inputValue.stringValue();

        // Find xsl:matching-substring and xsl:non-matching-substring children
        let matchingSubstring: XNode | null = null;
        let nonMatchingSubstring: XNode | null = null;

        for (const child of template.childNodes) {
            if (child.nodeType === DOM_ELEMENT_NODE && this.isXsltElement(child)) {
                if (child.localName === 'matching-substring') {
                    matchingSubstring = child;
                } else if (child.localName === 'non-matching-substring') {
                    nonMatchingSubstring = child;
                } else if (child.localName === 'fallback') {
                    // xsl:fallback is allowed but ignored in XSLT 2.0 processors
                    continue;
                }
            }
        }

        // Build the regex with flags
        let jsFlags = 'g'; // Always use global for analyze-string
        for (const flag of flagsAttr) {
            switch (flag) {
                case 'i': jsFlags += 'i'; break;
                case 'm': jsFlags += 'm'; break;
                case 's': jsFlags += 's'; break;
                // 'x' (extended) would need special handling - skip for now
            }
        }

        let regex: RegExp;
        try {
            regex = new RegExp(regexAttr, jsFlags);
        } catch (e) {
            throw new Error(`Invalid regular expression in xsl:analyze-string: ${regexAttr}`);
        }

        // Process the string, alternating between matches and non-matches
        let lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = regex.exec(inputString)) !== null) {
            const matchStart = match.index;
            const matchEnd = matchStart + match[0].length;

            // Process non-matching substring before this match
            if (matchStart > lastIndex && nonMatchingSubstring) {
                const nonMatchText = inputString.substring(lastIndex, matchStart);
                await this.processAnalyzeStringContent(context, nonMatchingSubstring, output, nonMatchText, null);
            }

            // Process matching substring
            if (matchingSubstring) {
                // match array: [fullMatch, group1, group2, ...]
                const groups = match.slice(0); // Copy the match array
                await this.processAnalyzeStringContent(context, matchingSubstring, output, match[0], groups);
            }

            lastIndex = matchEnd;

            // Prevent infinite loop on zero-length matches
            if (match[0].length === 0) {
                regex.lastIndex++;
            }
        }

        // Process any remaining non-matching substring after the last match
        if (lastIndex < inputString.length && nonMatchingSubstring) {
            const nonMatchText = inputString.substring(lastIndex);
            await this.processAnalyzeStringContent(context, nonMatchingSubstring, output, nonMatchText, null);
        }
    }

    /**
     * Helper method to process xsl:matching-substring or xsl:non-matching-substring content.
     * Sets up the context with the current text and regex groups.
     */
    private async processAnalyzeStringContent(
        context: ExprContext,
        template: XNode,
        output: XNode | undefined,
        currentText: string,
        regexGroups: string[] | null
    ): Promise<void> {
        // Create a text node to represent the current string being processed
        const textNode = domCreateTextNode(this.outputDocument, currentText);

        // Clone context with the text node as the context node
        const childContext = context.clone([textNode], 0);

        // Set regex groups on the context for regex-group() function
        if (regexGroups) {
            childContext.regexGroups = regexGroups;
        }

        // Process the child content of matching-substring or non-matching-substring
        await this.xsltChildNodes(childContext, template, output);
    }

    /**
     * Implements `xsl:function` (XSLT 2.0).
     * 
     * Declares a stylesheet function that can be called from XPath expressions.
     * Functions are collected during stylesheet initialization and made available
     * to the XPath evaluator.
     *
     * @param context The expression context.
     * @param template The xsl:function element.
     */
    protected xsltFunction(context: ExprContext, template: XNode): void {
        const name = xmlGetAttribute(template, 'name');
        const asAttr = xmlGetAttribute(template, 'as'); // Return type (optional)
        const overrideAttr = xmlGetAttribute(template, 'override'); // Override imported functions

        if (!name) {
            throw new Error('<xsl:function> requires a "name" attribute.');
        }

        // Function name must be in a non-null namespace (prefixed)
        if (!name.includes(':')) {
            throw new Error(`<xsl:function> name "${name}" must be in a namespace (use a prefixed name like "my:functionName").`);
        }

        // Check if this function already exists
        const override = overrideAttr === 'yes' || overrideAttr === 'true';
        if (this.userDefinedFunctions.has(name) && !override) {
            // Function already defined, only override if explicitly allowed
            return;
        }

        // Store the function definition
        this.userDefinedFunctions.set(name, template);
    }

    /**
     * Coerce a NodeValue to a specific type based on the 'as' attribute.
     * 
     * @param value The value to coerce.
     * @param type The target type (e.g., "xs:integer", "xs:string", "xs:boolean").
     * @returns The coerced value.
     */
    protected coerceToType(value: NodeValue, type: string): NodeValue {
        const normalizedType = type.replace(/^xs:/, '').toLowerCase();
        
        switch (normalizedType) {
            case 'integer':
            case 'int':
            case 'double':
            case 'decimal':
            case 'number':
                // Convert to number
                return new NumberValue(value.numberValue());
            
            case 'string':
                // Convert to string
                return new StringValue(value.stringValue());
            
            case 'boolean':
                // Convert to boolean
                return new BooleanValue(value.booleanValue());
            
            default:
                // For unknown types or node-set types, return as-is
                return value;
        }
    }

    /**
     * Execute a user-defined xsl:function.
     * Called when a function from userDefinedFunctions is invoked from XPath.
     *
     * @param context The expression context.
     * @param functionDef The xsl:function node.
     * @param args The evaluated arguments passed to the function.
     * @returns The result of the function execution.
     */
    protected async executeUserDefinedFunction(
        context: ExprContext,
        functionDef: XNode,
        args: any[]
    ): Promise<any> {
        return this.executeUserDefinedFunctionSync(context, functionDef, args);
    }

    /**
     * Synchronously execute a user-defined xsl:function.
     * This is used when functions are called from XPath expressions.
     * Limited to functions that don't require async operations in their body.
     *
     * @param context The expression context.
     * @param functionDef The xsl:function node.
     * @param args The evaluated arguments passed to the function.
     * @returns The result of the function execution.
     */
    executeUserDefinedFunctionSync(
        context: ExprContext,
        functionDef: XNode,
        args: any[]
    ): any {
        // Create a new context for function execution with its own variable scope
        const functionContext = context.clone();
        // Create a new variables object to avoid modifying parent scope
        functionContext.variables = { ...context.variables };

        // Get xsl:param children to bind arguments
        const params: XNode[] = [];
        for (const child of functionDef.childNodes) {
            if (child.nodeType === DOM_ELEMENT_NODE && this.isXsltElement(child, 'param')) {
                params.push(child);
            }
        }

        // Bind arguments to parameters
        for (let i = 0; i < params.length; i++) {
            const paramName = xmlGetAttribute(params[i], 'name');
            if (paramName) {
                if (i < args.length) {
                    // Use provided argument
                    let argValue = args[i];
                    const paramType = xmlGetAttribute(params[i], 'as');
                    
                    // Convert argument to NodeValue based on parameter type
                    let paramValue: NodeValue;
                    
                    if (argValue && typeof argValue === 'object' && 'stringValue' in argValue) {
                        // It's a NodeValue-like object - apply type coercion if needed
                        paramValue = argValue as NodeValue;
                        if (paramType) {
                            paramValue = this.coerceToType(paramValue, paramType);
                        }
                    } else if (argValue && typeof argValue === 'object' && 'nodeType' in argValue) {
                        // It's a raw DOM node
                        paramValue = new NodeSetValue([argValue as XNode]);
                        if (paramType) {
                            paramValue = this.coerceToType(paramValue, paramType);
                        }
                    } else if (Array.isArray(argValue)) {
                        // Array of nodes from XPath evaluation
                        paramValue = new NodeSetValue(argValue);
                        if (paramType) {
                            paramValue = this.coerceToType(paramValue, paramType);
                        }
                    } else if (typeof argValue === 'number') {
                        paramValue = new NumberValue(argValue);
                    } else if (typeof argValue === 'boolean') {
                        paramValue = new BooleanValue(argValue);
                    } else {
                        paramValue = new StringValue(String(argValue ?? ''));
                    }
                    
                    functionContext.setVariable(paramName, paramValue);
                } else {
                    // Use default value from parameter definition if available
                    const selectExpr = xmlGetAttribute(params[i], 'select');
                    if (selectExpr) {
                        const defaultValue = this.xPath.xPathEval(selectExpr, functionContext);
                        functionContext.setVariable(paramName, defaultValue);
                    } else {
                        functionContext.setVariable(paramName, new StringValue(''));
                    }
                }
            }
        }

        // Process function body - look for xsl:sequence with select
        // This is the common pattern for XSLT 2.0 functions
        for (const child of functionDef.childNodes) {
            if (child.nodeType === DOM_ELEMENT_NODE) {
                if (this.isXsltElement(child, 'sequence')) {
                    const select = xmlGetAttribute(child, 'select');
                    if (select) {
                        // Evaluate the select expression and return
                        const result = this.xPath.xPathEval(select, functionContext);
                        // Return as the appropriate type
                        if (result.type === 'number') {
                            return result.numberValue();
                        } else if (result.type === 'boolean') {
                            return result.booleanValue();
                        } else if (result.type === 'node-set') {
                            return result.nodeSetValue();
                        } else {
                            return result.stringValue();
                        }
                    }
                } else if (this.isXsltElement(child, 'value-of')) {
                    const select = xmlGetAttribute(child, 'select');
                    if (select) {
                        return this.xPath.xPathEval(select, functionContext).stringValue();
                    }
                }
                // Skip param elements
            }
        }

        // If no result found, return empty string
        return '';
    }

    /**
     * Implements `xsl:result-document` (XSLT 2.0).
     *
     * Creates a secondary output document. The output is stored in the
     * resultDocuments map, accessible via getResultDocuments().
     *
     * @param context The expression context.
     * @param template The xsl:result-document element.
     */
    protected async xsltResultDocument(context: ExprContext, template: XNode): Promise<void> {
        const hrefExpr = xmlGetAttribute(template, 'href') || '';
        const methodAttr = xmlGetAttribute(template, 'method') || this.outputMethod || 'xml';
        const omitXmlDeclaration = xmlGetAttribute(template, 'omit-xml-declaration') || this.outputOmitXmlDeclaration;

        // Evaluate href as attribute value template
        const href = this.xsltAttributeValue(hrefExpr, context);

        if (!href) {
            throw new Error('<xsl:result-document> requires a non-empty "href" attribute.');
        }

        // Check for duplicate result documents
        if (this.resultDocuments.has(href)) {
            throw new Error(`<xsl:result-document>: A document has already been created with href="${href}".`);
        }

        // Create a new output document for this result
        const resultDocument = new XDocument();

        // Process children into the new document
        await this.xsltChildNodes(context, template, resultDocument);

        // Serialize the result document
        const serialized = xmlTransformedText(resultDocument, {
            cData: this.options.cData,
            escape: this.options.escape,
            selfClosingTags: this.options.selfClosingTags,
            outputMethod: methodAttr as 'xml' | 'html' | 'text' | 'xhtml',
            outputVersion: this.outputVersion,
            itemSeparator: this.itemSeparator
        });

        // Store in result documents map
        this.resultDocuments.set(href, serialized);
    }

    /**
     * Get all result documents created by xsl:result-document.
     * @returns A map of href URIs to serialized output strings.
     */
    getResultDocuments(): Map<string, string> {
        return this.resultDocuments;
    }

    /**
     * Sets the package loader callback.
     * The callback is called when a package is referenced via xsl:use-package
     * but is not found in the registry.
     * 
     * @param loader A function that loads package documents by URI and optional version.
     *               Returns the parsed package document, or null if not found.
     */
    setPackageLoader(loader: (uri: string, version?: string) => Promise<XNode | null>): void {
        this.packageLoader = loader;
    }

    /**
     * Pre-registers a package for use in transformations.
     * The package is parsed and stored in the internal registry.
     * 
     * @param name The package name/URI.
     * @param packageDoc The parsed package document.
     * @param version Optional semantic version string.
     */
    async registerPackage(name: string, packageDoc: XNode, version?: string): Promise<void> {
        await this.loadAndRegisterPackage(name, packageDoc, version);
    }

    /**
     * Implements `xsl:perform-sort` (XSLT 2.0).
     *
     * Sorts a sequence of items without iteration. The sorted sequence
     * is available via xsl:sequence or other sequence-consuming instructions.
     *
     * @param context The expression context.
     * @param template The xsl:perform-sort element.
     * @param output The output node.
     */
    protected async xsltPerformSort(context: ExprContext, template: XNode, output?: XNode): Promise<void> {
        const select = xmlGetAttribute(template, 'select');

        // Get items to sort
        let items: XNode[];
        if (select) {
            items = this.xPath.xPathEval(select, context).nodeSetValue();
        } else {
            // If no select, look for xsl:sequence children to provide items
            const sequenceChildren: XNode[] = [];
            for (const child of template.childNodes) {
                if (child.nodeType === DOM_ELEMENT_NODE && !this.isXsltElement(child, 'sort')) {
                    sequenceChildren.push(child);
                }
            }
            // Evaluate sequence children
            const fragment = domCreateDocumentFragment(this.outputDocument);
            for (const child of sequenceChildren) {
                await this.xsltProcessContext(context, child, fragment);
            }
            items = Array.from(fragment.childNodes);
        }

        if (items.length === 0) {
            return;
        }

        // Create sort context and apply sorting
        const sortContext = context.clone(items);
        this.xsltSort(sortContext, template);

        // Output the sorted items
        const destinationNode = output || this.outputDocument;
        for (const node of sortContext.nodeList) {
            this.xsltCopyOf(destinationNode, node);
        }
    }

    /**
     * Implements `xsl:namespace` (XSLT 2.0).
     *
     * Creates a namespace node in the result tree.
     *
     * @param context The expression context.
     * @param template The xsl:namespace element.
     * @param output The output node.
     */
    protected async xsltNamespace(context: ExprContext, template: XNode, output?: XNode): Promise<void> {
        const nameExpr = xmlGetAttribute(template, 'name');
        const selectExpr = xmlGetAttribute(template, 'select');

        if (!nameExpr && nameExpr !== '') {
            throw new Error('<xsl:namespace> requires a "name" attribute.');
        }

        // Evaluate name as attribute value template
        const prefix = this.xsltAttributeValue(nameExpr, context);

        // Get the namespace URI
        let namespaceUri: string;
        if (selectExpr) {
            namespaceUri = this.xPath.xPathEval(selectExpr, context).stringValue();
        } else {
            // Get value from child content
            const fragment = domCreateDocumentFragment(this.outputDocument);
            await this.xsltChildNodes(context, template, fragment);
            namespaceUri = xmlValue(fragment);
        }

        // Validate namespace URI
        if (!namespaceUri) {
            throw new Error('<xsl:namespace> requires a non-empty namespace URI.');
        }

        // Create the namespace declaration on the output element
        const destinationNode = output || this.outputDocument;
        if (destinationNode.nodeType === DOM_ELEMENT_NODE) {
            if (prefix) {
                domSetAttribute(destinationNode, `xmlns:${prefix}`, namespaceUri);
            } else {
                domSetAttribute(destinationNode, 'xmlns', namespaceUri);
            }
        }
    }

    /**
     * Evaluates a variable or parameter and set it in the current input
     * context. Implements `xsl:variable`, `xsl:param`, and `xsl:with-param`.
     *
     * @param context The expression context.
     * @param template The template node.
     * @param override flag that defines if the value computed here
     * overrides the one already in the input context if that is the
     * case. I.e. decides if this is a default value or a local
     * value. `xsl:variable` and `xsl:with-param` override; `xsl:param` doesn't.
     */
    protected async xsltVariable(context: ExprContext, template: XNode, override: boolean) {
        const name = xmlGetAttribute(template, 'name');
        const select = xmlGetAttribute(template, 'select');

        let value: NodeValue;

        const nonAttributeChildren = template.childNodes.filter((n) => n.nodeType !== DOM_ATTRIBUTE_NODE);
        if (nonAttributeChildren.length > 0) {
            const fragment = domCreateDocumentFragment(template.ownerDocument);
            await this.xsltChildNodes(context, template, fragment);
            value = new NodeSetValue([fragment]);
        } else if (select) {
            value = this.xPath.xPathEval(select, context);
        } else {
            let parameterValue = '';
            const filteredParameter = this.options.parameters.filter((p) => p.name === name);
            if (filteredParameter.length > 0) {
                parameterValue = filteredParameter[0].value;
            }
            value = new StringValue(parameterValue);
        }

        if (override || !context.getVariable(name)) {
            context.setVariable(name, value);
        }
    }

    /**
     * Register accepted variables from used packages into the context.
     * Called after processing package use-package declarations.
     * @param context The expression context.
     */
    private async registerAcceptedVariables(context: ExprContext) {
        if (!this.currentPackage) {
            return;
        }

        // Iterate through all used packages
        this.currentPackage.usedPackages.forEach((usedPkg, packageKey) => {
            // Look at accepted components
            usedPkg.acceptedComponents.forEach((component, componentKey) => {
                if (component.type === 'variable' && component.name && component.isAccepted) {
                    // Process this variable node to get its value
                    this.xsltVariable(context, component.node, false);
                }
            });
        });
    }

    /**
     * Traverses the template node tree. Calls the main processing
     * function with the current input context for every child node of the
     * current template node.
     * @param context Normally the Expression Context.
     * @param template The XSL-T definition.
     * @param output If set, the output where the transformation should occur.
     */
    protected async xsltChildNodes(context: ExprContext, template: XNode, output?: XNode) {
        // Clone input context to keep variables declared here local to the
        // siblings of the children.
        const contextClone = context.clone();
        for (let i = 0; i < template.childNodes.length; ++i) {
            const child = template.childNodes[i];
            // Skip attribute nodes - they are stored in childNodes but should not be
            // processed as template content. Attributes belong to the element itself.
            if (child.nodeType === DOM_ATTRIBUTE_NODE) {
                continue;
            }
            await this.xsltProcessContext(contextClone, child, output);
        }
    }

    /**
     * Processes child nodes while skipping xsl:on-empty and xsl:on-non-empty.
     * Used by instructions that handle these conditionals explicitly.
     */
    protected async xsltChildNodesExcludingConditional(context: ExprContext, template: XNode, output?: XNode) {
        const contextClone = context.clone();
        for (let i = 0; i < template.childNodes.length; ++i) {
            const child = template.childNodes[i];
            if (child.nodeType === DOM_ATTRIBUTE_NODE) {
                continue;
            }
            if (
                child.nodeType === DOM_ELEMENT_NODE &&
                this.isXsltElement(child) &&
                (child.localName === 'on-empty' || child.localName === 'on-non-empty')
            ) {
                continue;
            }
            await this.xsltProcessContext(contextClone, child, output);
        }
    }

    private findConditionalChild(template: XNode, localName: 'on-empty' | 'on-non-empty'): XNode | null {
        for (const child of template.childNodes) {
            if (child.nodeType === DOM_ELEMENT_NODE && this.isXsltElement(child, localName)) {
                return child;
            }
        }
        return null;
    }

    /**
     * This logic is used in two different places:
     * - `xsltPassThrough`, if the template asks this library to write a text node;
     * - `xsltProcessContext`, `apply-templates` operation, when the current node is text.
     * 
     * Text nodes always require a parent, and they never have children.
     * @param context The Expression Context.
     * @param template The template, that contains the node value to be written.
     * @param output The output.
     */
    private commonLogicTextNode(context: ExprContext, template: XNode, output: XNode) {
        if (output) {
            // Check if this whitespace-only text node should be stripped based on
            // xsl:strip-space and xsl:preserve-space declarations
            if (this.shouldStripWhitespaceNode(template)) {
                return;
            }

            // Apply Text Value Templates for XSLT 3.0+
            let textValue = template.nodeValue;
            if (this.version && parseFloat(this.version) >= 3.0) {
                textValue = this.xsltTextValueTemplate(textValue, context);
            }

            let node = domCreateTextNode(this.outputDocument, textValue);
            // Set siblingPosition to preserve insertion order during serialization
            node.siblingPosition = output.childNodes.length;
            domAppendChild(output, node);
        }
    }

    /**
     * Passes template text to the output. The current template node does
     * not specify an XSL-T operation and therefore is appended to the
     * output with all its attributes. Then continues traversing the
     * template node tree.
     * @param context The Expression Context.
     * @param template The XSLT stylesheet or transformation.
     * @param output The output.
     */
    protected async xsltPassThrough(context: ExprContext, template: XNode, output: XNode) {
        switch (template.nodeType) {
            case DOM_TEXT_NODE:
                if (this.xsltPassText(template)) {
                    this.commonLogicTextNode(context, template, output);
                }

                break;
            case DOM_ELEMENT_NODE:
                let node: XNode;
                let elementContext = context;
                // Don't change context based on input document structure
                // The context should remain as provided, unless explicitly changed by XSLT instructions
                node = context.nodeList[context.position];

                let newNode: XNode;
                let qualifiedName = template.nodeName;
                let namespaceUri = template.namespaceUri;
                const templatePrefix = template.prefix || '';
                const aliasPrefix = this.namespaceAliases.get(templatePrefix);
                if (aliasPrefix) {
                    const localName = template.localName || template.nodeName;
                    if (aliasPrefix === '#default') {
                        qualifiedName = localName;
                        namespaceUri = this.resolveNamespaceUriForPrefix(template, null);
                    } else {
                        qualifiedName = `${aliasPrefix}:${localName}`;
                        namespaceUri = this.resolveNamespaceUriForPrefix(template, aliasPrefix);
                    }
                }

                newNode = domCreateElement(this.outputDocument, qualifiedName);
                
                // Set position based on current number of children in output
                // This preserves document order for literal elements in templates
                // (Issue #158: text nodes before block elements should stay before them)
                // We don't copy siblingPosition from input node because it's from a different document
                newNode.siblingPosition = (output || this.outputDocument).childNodes.length;

                domAppendChild(output || this.outputDocument, newNode);

                if (aliasPrefix) {
                    if (aliasPrefix === '#default') {
                        if (namespaceUri) {
                            domSetAttribute(newNode, 'xmlns', namespaceUri);
                        }
                    } else if (namespaceUri) {
                        domSetAttribute(newNode, `xmlns:${aliasPrefix}`, namespaceUri);
                    }
                } else if (namespaceUri) {
                    const prefix = templatePrefix || (qualifiedName.includes(':') ? qualifiedName.split(':')[0] : null);
                    const nsAttr = prefix ? `xmlns:${prefix}` : 'xmlns';
                    if (!this.isNamespaceDeclaredOnAncestor(output, nsAttr, namespaceUri)) {
                        domSetAttribute(newNode, nsAttr, namespaceUri);
                    }
                }

                // Apply attribute sets from use-attribute-sets attribute on literal elements
                const useAttributeSetsAttr = template.childNodes.find(
                    (a: XNode) =>
                        a?.nodeType === DOM_ATTRIBUTE_NODE && a.nodeName === 'use-attribute-sets'
                );
                if (useAttributeSetsAttr) {
                    await this.applyAttributeSets(elementContext, newNode, useAttributeSetsAttr.nodeValue);
                }

                await this.xsltChildNodes(elementContext, template, newNode);

                const templateAttributes = template.childNodes.filter(
                    (a: XNode) =>
                        a?.nodeType === DOM_ATTRIBUTE_NODE && a.nodeName !== 'use-attribute-sets'
                );
                for (const attribute of templateAttributes) {
                    const name = attribute.nodeName;
                    const value = this.xsltAttributeValue(attribute.nodeValue, elementContext);
                    domSetAttribute(newNode, name, value);

                    // If the attribute has a namespace prefix, ensure the xmlns declaration exists
                    if (attribute.prefix && attribute.namespaceUri &&
                        attribute.prefix !== 'xmlns' && !attribute.nodeName.startsWith('xmlns')) {
                        const nsAttr = `xmlns:${attribute.prefix}`;
                        if (!this.isNamespaceDeclaredOnAncestor(newNode, nsAttr, attribute.namespaceUri)) {
                            domSetAttribute(newNode, nsAttr, attribute.namespaceUri);
                        }
                    }
                }

                break;
            default:
                // This applies also to the DOCUMENT_NODE of the XSL stylesheet,
                // so we don't have to treat it specially.
                await this.xsltChildNodes(context, template, output);
        }
    }

    /**
     * Determines if a text node in the XSLT template document is to be
     * stripped according to XSLT whitespace stripping rules.
     * @see [XSLT], section 3.4.
     * @param template The XSLT template.
     * @returns TODO
     * @todo Whitespace stripping on the input document is
     * currently not implemented.
     */
    protected xsltPassText(template: XNode) {
        if (!template.nodeValue.match(/^\s*$/)) {
            return true;
        }

        let element = template.parentNode;
        if (this.isXsltElement(element, 'text')) {
            return true;
        }

        while (element && element.nodeType == DOM_ELEMENT_NODE) {
            const xmlspace = domGetAttributeValue(element, 'xml:space');
            if (xmlspace) {
                if (xmlspace == 'default') {
                    return false;
                }

                if (xmlspace == 'preserve') {
                    return true;
                }
            }

            element = element.parentNode;
        }

        return false;
    }

    protected findAttributeInContext(attributeName: string, context: ExprContext): XNode {
        return context.nodeList[context.position].childNodes.find(
            (a: XNode) => a.nodeType === DOM_ATTRIBUTE_NODE && a.nodeName === attributeName
        );
    }

    /**
     * Evaluates an XSL-T attribute value template. Attribute value
     * templates are attributes on XSL-T elements that contain XPath
     * expressions in braces {}. The XSL-T expressions are evaluated in
     * the current input context.
     * @param value TODO
     * @param context TODO
     * @returns TODO
     */
    protected xsltAttributeValue(value: any, context: ExprContext) {
        const parts = value.split('{');
        if (parts.length === 1) {
            return value;
        }

        let ret = '';
        for (let i = 0; i < parts.length; ++i) {
            const rp = parts[i].split('}');
            if (rp.length != 2) {
                // first literal part of the value
                ret += parts[i];
                continue;
            }

            const val = this.xPath.xPathEval(rp[0], context).stringValue();
            ret += val + rp[1];
        }

        return ret;
    }

    /**
     * Evaluates text value templates in XSLT 3.0. Text value templates
     * allow XPath expressions in braces {} within text nodes.
     * The expressions are evaluated in the current input context.
     * To include a literal brace, use {{ or }}.
     * @param value The text node value to process
     * @param context The expression context
     * @returns The processed text with expressions evaluated
     */
    protected xsltTextValueTemplate(value: string, context: ExprContext): string {
        if (!value) {
            return value;
        }

        let result = '';
        let i = 0;
        
        while (i < value.length) {
            const char = value[i];
            
            if (char === '{') {
                // Check for escaped {{
                if (i + 1 < value.length && value[i + 1] === '{') {
                    result += '{';
                    i += 2;
                    continue;
                }
                
                // Find matching closing brace
                let depth = 1;
                let j = i + 1;
                let expr = '';
                
                while (j < value.length && depth > 0) {
                    if (value[j] === '{') {
                        depth++;
                    } else if (value[j] === '}') {
                        depth--;
                        if (depth === 0) {
                            break;
                        }
                    }
                    expr += value[j];
                    j++;
                }
                
                if (depth === 0) {
                    // Evaluate the XPath expression
                    try {
                        const val = this.xPath.xPathEval(expr, context).stringValue();
                        result += val;
                    } catch (e) {
                        throw new Error(`Error evaluating text value template expression "${expr}": ${e.message}`);
                    }
                    i = j + 1;
                } else {
                    // Unmatched opening brace - treat as literal
                    result += char;
                    i++;
                }
            } else if (char === '}') {
                // Check for escaped }}
                if (i + 1 < value.length && value[i + 1] === '}') {
                    result += '}';
                    i += 2;
                    continue;
                }
                
                // Unmatched closing brace - treat as literal
                result += char;
                i++;
            } else {
                result += char;
                i++;
            }
        }
        
        return result;
    }

    /**
     * Evaluates an XPath expression in the current input context as a
     * match.
     * @see [XSLT] section 5.2, paragraph 1
     * @param match TODO
     * @param context The Expression Context.
     * @param axis The XPath axis. Used when the match does not start with the parent.
     * @returns {XNode[]} A list of the found nodes.
     */
    protected xsltMatch(match: string, context: ExprContext, axis?: string): XNode[] {
        const expression = this.xPath.xPathParse(match, axis);
        return this.matchResolver.expressionMatch(expression, context);
    }

    /**
     * Sets parameters defined by xsl:with-param child nodes of the
     * current template node, in the current input context. This happens
     * before the operation specified by the current template node is
     * executed.
     * @param context The Expression Context.
     * @param template The template node.
     */
    protected async xsltWithParam(context: ExprContext, template: XNode) {
        for (const childNode of template.childNodes) {
            if (childNode.nodeType === DOM_ELEMENT_NODE && this.isXsltElement(childNode, 'with-param')) {
                await this.xsltVariable(context, childNode, true);
            }
        }
    }

    /**
     * Recursively map all template nodes in a stylesheet to their metadata.
     * Used to track which stylesheet each template comes from for apply-imports.
     * @param stylesheetElement The stylesheet or transform element (or any parent element).
     * @param metadata The metadata for this stylesheet.
     */
    private mapTemplatesFromStylesheet(stylesheetElement: XNode, metadata: StylesheetMetadata) {
        for (const child of stylesheetElement.childNodes) {
            if (child.nodeType === DOM_ELEMENT_NODE) {
                if (this.isXsltElement(child, 'template')) {
                    // Map this template to its stylesheet metadata
                    this.templateSourceMap.set(child, metadata);
                } else if (this.isXsltElement(child, 'stylesheet') || this.isXsltElement(child, 'transform') || this.isXsltElement(child, 'package')) {
                    // Recursively process nested stylesheets and packages
                    this.mapTemplatesFromStylesheet(child, metadata);
                }
            }
        }
    }

    /**
     * Collect all attribute set definitions from the stylesheet.
     * Called at stylesheet initialization time.
     * @param stylesheetElement The stylesheet or transform element.
     */
    private collectAttributeSets(stylesheetElement: XNode) {
        for (const child of stylesheetElement.childNodes) {
            if (
                child.nodeType === DOM_ELEMENT_NODE &&
                this.isXsltElement(child, 'attribute-set')
            ) {
                const name = xmlGetAttribute(child, 'name');
                const attributes = child.childNodes.filter(
                    (n: XNode) =>
                        n.nodeType === DOM_ELEMENT_NODE && this.isXsltElement(n, 'attribute')
                );

                if (name) {
                    const existing = this.attributeSets.get(name);
                    if (existing && existing.length) {
                        // Merge attributes from multiple xsl:attribute-set declarations with the same name.
                        this.attributeSets.set(name, [...existing, ...attributes]);
                    } else {
                        this.attributeSets.set(name, attributes);
                    }
                }
            }
        }
    }

    /**
     * Collect all user-defined function definitions from the stylesheet.
     * Called at stylesheet initialization time.
     * @param stylesheetElement The stylesheet or transform element.
     * @param context The expression context.
     */
    private collectUserDefinedFunctions(stylesheetElement: XNode, context: ExprContext) {
        for (const child of stylesheetElement.childNodes) {
            if (
                child.nodeType === DOM_ELEMENT_NODE &&
                this.isXsltElement(child, 'function')
            ) {
                this.xsltFunction(context, child);
            }
        }
    }

    /**
     * Register user-defined functions in the expression context.
     * This makes them available to XPath expressions.
     * @param context The expression context.
     */
    private registerUserDefinedFunctionsInContext(context: ExprContext) {
        if (this.userDefinedFunctions.size === 0 && !this.hasAcceptedFunctions()) {
            return;
        }

        const functionsMap = new Map<string, {
            functionDef: XNode;
            executor: (ctx: ExprContext, functionDef: XNode, args: any[]) => any;
        }>();

        // Register user-defined functions from the current stylesheet
        this.userDefinedFunctions.forEach((functionDef, name) => {
            functionsMap.set(name, {
                functionDef,
                executor: (ctx: ExprContext, funcDef: XNode, args: any[]) => {
                    return this.executeUserDefinedFunctionSync(ctx, funcDef, args);
                }
            });
        });

        // Register functions from accepted components in used packages
        this.registerAcceptedFunctions(functionsMap);

        context.userDefinedFunctions = functionsMap;
    }

    /**
     * Check if there are any accepted functions in used packages.
     */
    private hasAcceptedFunctions(): boolean {
        if (!this.currentPackage) {
            return false;
        }

        let hasAccepted = false;
        this.currentPackage.usedPackages.forEach((usedPkg) => {
            usedPkg.acceptedComponents.forEach((component) => {
                if (component.type === 'function' && component.isAccepted) {
                    hasAccepted = true;
                }
            });
        });
        return hasAccepted;
    }

    /**
     * Register accepted functions from used packages.
     * @param functionsMap The map to register functions into.
     */
    private registerAcceptedFunctions(
        functionsMap: Map<string, {
            functionDef: XNode;
            executor: (ctx: ExprContext, functionDef: XNode, args: any[]) => any;
        }>
    ) {
        if (!this.currentPackage) {
            return;
        }

        // Iterate through all used packages
        this.currentPackage.usedPackages.forEach((usedPkg, packageKey) => {
            // Look at accepted components
            usedPkg.acceptedComponents.forEach((component, componentKey) => {
                if (component.type === 'function' && component.name && component.isAccepted) {
                    // Check for overrides - use the effective component
                    const effectiveComponent = this.getEffectiveComponent(component);
                    // Register this function
                    functionsMap.set(component.name, {
                        functionDef: effectiveComponent.node,
                        executor: (ctx: ExprContext, funcDef: XNode, args: any[]) => {
                            return this.executeUserDefinedFunctionSync(ctx, funcDef, args);
                        }
                    });
                }
            });
        });
    }

    /**
     * Apply one or more attribute sets to an element.
     * Parses space-separated attribute set names and applies them.
     * @param context The Expression Context.
     * @param element The element to apply attributes to.
     * @param setNames Space-separated attribute set names.
     */
    protected async applyAttributeSets(
        context: ExprContext,
        element: XNode,
        setNames: string
    ) {
        if (!setNames || !setNames.trim()) {
            return;
        }

        // Parse space-separated set names
        const names = setNames.trim().split(/\s+/);
        const processedSets = new Set<string>();

        for (const name of names) {
            await this.applyAttributeSet(context, element, name, processedSets);
        }
    }

    /**
     * Apply a single attribute set to an element.
     * Handles recursive attribute sets with cycle detection.
     * @param context The Expression Context.
     * @param element The element to apply attributes to.
     * @param setName The name of the attribute set to apply.
     * @param processedSets Set of already-processed attribute set names (for cycle detection).
     */
    private async applyAttributeSet(
        context: ExprContext,
        element: XNode,
        setName: string,
        processedSets: Set<string>
    ) {
        // Prevent infinite recursion
        if (processedSets.has(setName)) {
            return;
        }
        processedSets.add(setName);

        const attributeNodes = this.attributeSets.get(setName);
        if (!attributeNodes) {
            // Silently ignore missing attribute set (spec allows)
            return;
        }

        // Apply attributes from this set
        for (const attrNode of attributeNodes) {
            // First, apply any nested attribute sets referenced by the owning attribute-set
            let nestedSets: string | null = null;
            const ownerNode = (attrNode as any).parentNode as XNode | null;
            if (ownerNode) {
                nestedSets = xmlGetAttribute(ownerNode, 'use-attribute-sets');
            }
            if (nestedSets) {
                // XSLT allows a whitespace-separated list of attribute-set names
                for (const nestedName of nestedSets.trim().split(/\s+/)) {
                    if (nestedName) {
                        await this.applyAttributeSet(context, element, nestedName, processedSets);
                    }
                }
            }

            // Now apply the attribute itself
            const nameExpr = xmlGetAttribute(attrNode, 'name');
            const name = this.xsltAttributeValue(nameExpr, context);

            // Evaluate the attribute value by processing child nodes
            const documentFragment = domCreateDocumentFragment(this.outputDocument);
            await this.xsltChildNodes(context, attrNode, documentFragment);
            const value = xmlValueLegacyBehavior(documentFragment);

            domSetAttribute(element, name, value);
        }
    }

    /**
     * Test if an element is a supported extension.
     * Returns false for unrecognized elements in non-XSLT namespaces.
     * @param node The element to test.
     * @returns True if the element is supported, false if it's an unrecognized extension.
     */
    protected isExtensionElementSupported(node: XNode): boolean {
        if (node.nodeType !== DOM_ELEMENT_NODE) {
            // Only elements can be extension elements; everything else is always supported.
            return true;
        }

        const namespaceUri = node.namespaceUri;

        if (!namespaceUri) {
            // Unqualified elements (no namespace) are treated as literal result elements.
            return true;
        }

        // Elements in the XSLT namespace are XSLT instructions, not extension elements.
        if (this.isXsltElement(node)) {
            return true;
        }

        // Namespaced, non-XSLT elements are considered extension elements. If the
        // namespace is not in the supported set, mark as unsupported so fallback can run.
        if (!this.supportedExtensions.has(namespaceUri)) {
            return false;
        }

        // The element is in a supported extension namespace.
        return true;
    }

    /**
     * Get the fallback element from an extension element if it exists.
     * Searches for the first direct xsl:fallback child.
     * @param node The extension element.
     * @returns The fallback element, or null if not found.
     */
    protected getFallbackElement(node: XNode): XNode | null {
        for (const child of node.childNodes) {
            if (
                child.nodeType === DOM_ELEMENT_NODE &&
                this.isXsltElement(child, 'fallback')
            ) {
                return child;
            }
        }
        return null;
    }

    /**
     * Process an extension element with fallback support.
     * If a fallback is defined, executes it; otherwise treats element as literal.
     * @param context The Expression Context.
     * @param element The extension element.
     * @param output The output node.
     */
    protected async xsltExtensionElement(
        context: ExprContext,
        element: XNode,
        output?: XNode
    ) {
        // Check if there's a fallback
        const fallback = this.getFallbackElement(element);

        if (fallback) {
            // Execute fallback content
            await this.xsltChildNodes(context, fallback, output);
        } else {
            // No fallback: treat as literal result element
            // (Copy the element and its content to output)
            await this.xsltPassThrough(context, element, output);
        }
    }

    /**
     * Test if the given element is an XSLT element, optionally the one with the given name.
     * @param {XNode} element The element.
     * @param {string} opt_wantedName The name for comparison.
     * @returns True, if element is an XSL node. False otherwise.
     */
    protected isXsltElement(element: XNode, opt_wantedName?: string) {
        if (opt_wantedName && element.localName != opt_wantedName) return false;
        if (element.namespaceUri) return element.namespaceUri === 'http://www.w3.org/1999/XSL/Transform';
        return element.prefix === 'xsl'; // backwards compatibility with earlier versions of xslt-processor
    }
}
