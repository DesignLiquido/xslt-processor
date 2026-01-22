// Copyright 2023-2024 Design Liquido
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
    domCreateTextNode,
    domGetAttributeValue,
    domSetAttribute,
    xmlGetAttribute,
    xmlTransformedText,
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
    DOM_TEXT_NODE
} from '../constants';

import { StringValue, NodeSetValue, NodeValue } from '../xpath/values';
import { XsltOptions } from './xslt-options';
import { XsltDecimalFormatSettings } from './xslt-decimal-format-settings';
import {
    collectAndExpandTemplates,
    selectBestTemplate,
    emitConflictWarning
} from './functions';
import { TemplatePriority } from './template-priority';

/**
 * The main class for XSL-T processing. The implementation is NOT
 * complete; some xsl element are left out.
 *
 * References:
 *
 * [XSLT] XSL-T Specification
 * <http://www.w3.org/TR/1999/REC-xslt-19991116>.
 *
 * [ECMA] ECMAScript Language Specification
 * <http://www.ecma-international.org/publications/standards/Ecma-262.htm>.
 *
 * The XSL processor API has one entry point, the function
 * `xsltProcess()`. It receives as arguments the starting point in the
 * input document as an XPath expression context, the DOM root node of
 * the XSL-T stylesheet, and a DOM node that receives the output.
 *
 * NOTE: Actually, XSL-T processing according to the specification is
 * defined as operation on text documents, not as operation on DOM
 * trees. So, strictly speaking, this implementation is not an XSL-T
 * processor, but the processing engine that needs to be complemented
 * by an XML parser and serializer in order to be complete. Those two
 * are found in the `dom` folder.
 */
export class Xslt {
    xPath: XPath;
    xmlParser: XmlParser;
    matchResolver: MatchResolver;
    options: XsltOptions;
    decimalFormatSettings: XsltDecimalFormatSettings;

    outputDocument: XDocument;
    outputMethod: 'xml' | 'html' | 'text' | 'name' | 'xhtml';
    outputOmitXmlDeclaration: string;
    version: string;
    firstTemplateRan: boolean;

    /**
     * List of element name patterns from xsl:strip-space declarations.
     * Whitespace-only text nodes inside matching elements will be stripped.
     */
    stripSpacePatterns: string[];

    /**
     * List of element name patterns from xsl:preserve-space declarations.
     * Whitespace-only text nodes inside matching elements will be preserved.
     * preserve-space takes precedence over strip-space for conflicting patterns.
     */
    preserveSpacePatterns: string[];

    /**
     * Namespace aliases from xsl:namespace-alias declarations.
     * Maps stylesheet namespace prefixes to result namespace prefixes.
     */
    namespaceAliases: Map<string, string>;

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
            parameters: options.parameters || []
        };
        this.outputMethod = 'xml';
        this.outputOmitXmlDeclaration = 'no';
        this.stripSpacePatterns = [];
        this.preserveSpacePatterns = [];
        this.namespaceAliases = new Map();
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
    }

    /**
     * The exported entry point of the XSL-T processor.
     * @param xmlDoc The input document root, as DOM node.
     * @param stylesheet The stylesheet document root, as DOM node.
     * @returns the processed document, as XML text in a string.
     */
    async xsltProcess(xmlDoc: XDocument, stylesheet: XDocument) {
        const outputDocument = new XDocument();
        this.outputDocument = outputDocument;
        const expressionContext = new ExprContext([xmlDoc]);

        if (this.options.parameters.length > 0) {
            for (const parameter of this.options.parameters) {
                expressionContext.setVariable(parameter.name, new StringValue(parameter.value));
            }
        }

        await this.xsltProcessContext(expressionContext, stylesheet, this.outputDocument);
        const transformedOutputXml: string = xmlTransformedText(outputDocument, {
            cData: this.options.cData,
            escape: this.options.escape,
            selfClosingTags: this.options.selfClosingTags,
            outputMethod: this.outputMethod
        });

        return transformedOutputXml;
    }

    /**
     * The main entry point of the XSL-T processor, as explained on the top of the file.
     * @param context The input document root, as XPath `ExprContext`.
     * @param template The stylesheet document root, as DOM node.
     * @param output If set, the output where the transformation should occur.
     */
    protected async xsltProcessContext(context: ExprContext, template: XNode, output?: XNode) {
        if (!this.isXsltElement(template)) {
            await this.xsltPassThrough(context, template, output);
        } else {
            let node: XNode,
                select: any,
                value: any,
                nodes: XNode[];
            switch (template.localName) {
                case 'apply-imports':
                    throw new Error(`not implemented: ${template.localName}`);
                case 'apply-templates':
                    await this.xsltApplyTemplates(context, template, output);
                    break;
                case 'attribute':
                    await this.xsltAttribute(context, template, output);
                    break;
                case 'attribute-set':
                    throw new Error(`not implemented: ${template.localName}`);
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
                case 'decimal-format':
                    this.xsltDecimalFormat(context, template);
                    break;
                case 'element':
                    await this.xsltElement(context, template, output);
                    break;
                case 'fallback':
                    throw new Error(`not implemented: ${template.localName}`);
                case 'for-each':
                    await this.xsltForEach(context, template, output);
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
                case 'message':
                    await this.xsltMessage(context, template);
                    break;
                case 'namespace-alias':
                    this.xsltNamespaceAlias(template);
                    break;
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
                    break;
                case 'param':
                    await this.xsltVariable(context, template, false);
                    break;
                case 'preserve-space':
                    this.xsltPreserveSpace(template);
                    break;
                case 'processing-instruction':
                    throw new Error(`not implemented: ${template.localName}`);
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
                    throw new Error(`error if here: ${template.localName}`);
            }
        }
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

        // TODO: Check why apply-templates was sorting and filing parameters
        // automatically.
        /* this.xsltWithParam(sortContext, template);
        this.xsltSort(sortContext, template); */

        const mode: string | null = xmlGetAttribute(template, 'mode');
        const top = template.ownerDocument.documentElement;

        // Collect all templates with their priority metadata
        const expandedTemplates: TemplatePriority[] = collectAndExpandTemplates(top, mode, this.xPath);

        const modifiedContext = context.clone(nodes);
        // Process nodes in document order, selecting the BEST matching template for each node.
        // This is the XSLT 3.0 compliant behavior - only ONE template executes per node.
        for (let j = 0; j < modifiedContext.contextSize(); ++j) {
            const currentNode = modifiedContext.nodeList[j];

            // If the current node is text, there's no need to test all the templates
            // against it. Just appending it to its parent is fine.
            if (currentNode.nodeType === DOM_TEXT_NODE) {
                const textNodeContext = context.clone(
                    [currentNode],
                    0
                );
                this.commonLogicTextNode(textNodeContext, currentNode, output);
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
                    this.xPath
                );

                // Emit warning if there's a conflict
                if (selection.hasConflict) {
                    emitConflictWarning(selection, currentNode);
                }

                // Execute ONLY the selected template (not all matching templates)
                // We directly execute the template children here, bypassing xsltTemplate's
                // own matching logic since we've already determined this is the best match.
                if (selection.selectedTemplate) {
                    await this.xsltChildNodes(clonedContext, selection.selectedTemplate, output);
                }
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
                domSetAttribute(node, 'xmlns', source.namespaceUri);
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

        // node.transformedNodeName = name;

        domAppendChild(output || this.outputDocument, node);
        // The element becomes the output node of the source node.
        // context.nodeList[context.position].outputNode = node;
        const clonedContext = context.clone(undefined, 0);
        await this.xsltChildNodes(clonedContext, template, node);
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
        if (nodes.length === 0) {
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
            await this.xsltChildNodes(sortContext.clone(sortContext.nodeList, i), template, output);
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
        const [major, minor] = process.versions.node.split('.').map(Number);
        if (major <= 17 && minor < 5) {
            throw new Error(`Your Node.js version does not support \`<${elementName}>\`. If possible, please update your Node.js version to at least version 17.5.0.`);
        }

        // We need to test here whether `window.fetch` is available or not.
        // If it is a browser environemnt, it should be.
        // Otherwise, we will need to import an equivalent library, like 'node-fetch'.
        if (!global.globalThis.fetch) {
            global.globalThis.fetch = fetch as any;
            global.globalThis.Headers = Headers as any;
            global.globalThis.Request = Request as any;
            global.globalThis.Response = Response as any;
        }

        const hrefAttributeFind = template.childNodes.filter(n => n.nodeName === 'href');
        if (hrefAttributeFind.length <= 0) {
            throw new Error(`<${elementName}> with no href attribute defined.`);
        }

        const hrefAttribute = hrefAttributeFind[0];

        const fetchTest = await global.globalThis.fetch(hrefAttribute.nodeValue);
        const fetchResponse = await fetchTest.text();
        const includedXslt = this.xmlParser.xmlParse(fetchResponse);
        await this.xsltChildNodes(context, includedXslt.childNodes[0], output);
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

        let number: number;

        if (value) {
            // If value attribute is present, evaluate it as an XPath expression
            const result = this.xPath.xPathEval(value, context);
            number = Math.round(result.numberValue());
        } else {
            // Otherwise, count nodes based on level, count, and from attributes
            number = this.xsltNumberCount(context, level, count, from);
        }

        // Format the number
        const formattedNumber = this.xsltFormatNumber(number, format, groupingSeparator, groupingSize);

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
     * @param from Pattern to start counting from.
     * @returns The count value.
     */
    protected xsltNumberCount(context: ExprContext, level: string, count: string | null, from: string | null): number {
        const currentNode = context.nodeList[context.position];

        // Default count pattern matches nodes with the same name and type as current node
        const countPattern = count || currentNode.nodeName;

        switch (level) {
            case 'single': {
                // Count preceding siblings (plus 1 for self) that match the count pattern
                let num = 1;
                let sibling = currentNode.previousSibling;
                while (sibling) {
                    if (sibling.nodeType === currentNode.nodeType) {
                        if (this.nodeMatchesPattern(sibling, countPattern)) {
                            num++;
                        }
                    }
                    sibling = sibling.previousSibling;
                }
                return num;
            }
            case 'multiple': {
                // For multiple level, we'd return a sequence - simplified to single value here
                // Full implementation would return array for hierarchical numbering
                let num = 1;
                let sibling = currentNode.previousSibling;
                while (sibling) {
                    if (sibling.nodeType === currentNode.nodeType) {
                        if (this.nodeMatchesPattern(sibling, countPattern)) {
                            num++;
                        }
                    }
                    sibling = sibling.previousSibling;
                }
                return num;
            }
            case 'any': {
                // Count all preceding nodes in document order that match
                let num = 1;
                const allNodes = this.getAllPrecedingNodes(currentNode);
                for (const node of allNodes) {
                    if (this.nodeMatchesPattern(node, countPattern)) {
                        num++;
                    }
                }
                return num;
            }
            default:
                return 1;
        }
    }

    /**
     * Checks if a node matches a simple name pattern.
     * @param node The node to check.
     * @param pattern The pattern (node name) to match.
     * @returns True if the node matches.
     */
    protected nodeMatchesPattern(node: XNode, pattern: string): boolean {
        if (pattern === '*') {
            return node.nodeType === DOM_ELEMENT_NODE;
        }
        return node.nodeName === pattern || node.localName === pattern;
    }

    /**
     * Gets all nodes preceding the given node in document order.
     * @param node The reference node.
     * @returns Array of preceding nodes.
     */
    protected getAllPrecedingNodes(node: XNode): XNode[] {
        const result: XNode[] = [];

        // Get preceding siblings
        let sibling = node.previousSibling;
        while (sibling) {
            result.push(sibling);
            // Add descendants of preceding siblings
            this.collectDescendants(sibling, result);
            sibling = sibling.previousSibling;
        }

        // Get ancestors' preceding siblings
        let parent = node.parentNode;
        while (parent) {
            let parentSibling = parent.previousSibling;
            while (parentSibling) {
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
            this.stripSpacePatterns.push(...patterns);
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
            this.preserveSpacePatterns.push(...patterns);
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
    protected matchesNamePattern(elementName: string, pattern: string, element: XNode): boolean {
        // Universal match
        if (pattern === '*') {
            return true;
        }

        // Handle patterns with namespace prefixes
        if (pattern.includes(':')) {
            const [prefix, localPart] = pattern.split(':');

            // Check if element has a matching prefix
            const elementPrefix = element.prefix || '';

            if (localPart === '*') {
                // prefix:* - match any element in that namespace
                return elementPrefix === prefix;
            } else {
                // prefix:name - match specific element in namespace
                return elementPrefix === prefix && elementName === localPart;
            }
        }

        // Simple name match (no namespace prefix in pattern)
        return elementName === pattern;
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
        const disableOutputEscaping = template.childNodes.filter(
            (a) => a.nodeType === DOM_ATTRIBUTE_NODE && a.nodeName === 'disable-output-escaping'
        );
        if (disableOutputEscaping.length > 0 && disableOutputEscaping[0].nodeValue === 'yes') {
            node.escape = false;
        }
        const destinationTextNode = output || this.outputDocument;
        destinationTextNode.appendChild(node);
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
        for (let stylesheetAttribute of template.childNodes.filter((n) => n.nodeType === DOM_ATTRIBUTE_NODE)) {
            switch (stylesheetAttribute.nodeName) {
                case 'version':
                    this.version = stylesheetAttribute.nodeValue;
                    if (!['1.0', '2.0', '3.0'].includes(this.version)) {
                        throw new Error(
                            `XSLT version not defined or invalid. Actual resolved version: ${this.version || '(none)'}.`
                        );
                    }
                    context.xsltVersion = this.version as any;
                    break;
                default:
                    if (stylesheetAttribute.prefix === 'xmlns') {
                        context.knownNamespaces[stylesheetAttribute.localName] = stylesheetAttribute.nodeValue;
                    }
                    break;
            }
        }

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
            const expandedTemplates = collectAndExpandTemplates(template, null, this.xPath);

            // Find all (template, matchedNodes) pairs by testing each template's pattern
            const matchCandidates: { priority: TemplatePriority; matchedNodes: XNode[] }[] = [];

            for (const t of expandedTemplates) {
                try {
                    // For initial template selection, evaluate patterns from document root
                    // without axis override to ensure consistent matching for all patterns
                    // For initial template selection, evaluate patterns from document root
                    // without axis override to ensure consistent matching for all patterns
                    const matchedNodes = this.xsltMatch(t.matchPattern, contextClone);
                    if (matchedNodes.length > 0) {
                        matchCandidates.push({ priority: t, matchedNodes });
                    }
                } catch (e) {
                    // If pattern parsing fails, skip this template
                    console.warn(`Failed to match pattern "${t.matchPattern}":`, e);
                }
            }

            if (matchCandidates.length > 0) {
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

                // Detect conflicts
                const winner = matchCandidates[0];
                const conflicts = matchCandidates.filter(t =>
                    t.priority.importPrecedence === winner.priority.importPrecedence &&
                    t.priority.effectivePriority === winner.priority.effectivePriority
                );

                if (conflicts.length > 1) {
                    const patterns = conflicts
                        .map(t => `"${t.priority.matchPattern}" (priority: ${t.priority.effectivePriority})`)
                        .join(', ');
                    console.warn(
                        `XSLT Warning: Ambiguous template match. ` +
                        `Multiple templates match with equal priority: ${patterns}. ` +
                        `Using the last one in document order.`
                    );
                }

                // Execute ONLY the selected template
                this.firstTemplateRan = true;
                contextClone.baseTemplateMatched = true;
                const templateContext = contextClone.clone(winner.matchedNodes, 0);
                await this.xsltChildNodes(templateContext, winner.priority.template, output);
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
                                    this.xPath
                                );

                                if (selection.selectedTemplate) {
                                    const templateContext = clonedContext.clone([currentNode], 0);
                                    templateContext.inApplyTemplates = true;
                                    await this.xsltChildNodes(templateContext, selection.selectedTemplate, output);
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
                                                        this.xPath
                                                    );
                                                    if (grandchildSelection.selectedTemplate) {
                                                        const grandchildTemplateContext = grandchildClonedContext.clone([grandchildNode], 0);
                                                        grandchildTemplateContext.inApplyTemplates = true;
                                                        await this.xsltChildNodes(grandchildTemplateContext, grandchildSelection.selectedTemplate, output);
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
            await this.xsltProcessContext(contextClone, template.childNodes[i], output);
        }
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

            let node = domCreateTextNode(this.outputDocument, template.nodeValue);
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
                newNode = domCreateElement(this.outputDocument, template.nodeName);
                newNode.siblingPosition = node.siblingPosition;

                domAppendChild(output || this.outputDocument, newNode);
                await this.xsltChildNodes(elementContext, template, newNode);

                const templateAttributes = template.childNodes.filter((a: XNode) => a?.nodeType === DOM_ATTRIBUTE_NODE);
                for (const attribute of templateAttributes) {
                    const name = attribute.nodeName;
                    const value = this.xsltAttributeValue(attribute.nodeValue, elementContext);
                    domSetAttribute(newNode, name, value);
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
