// Copyright 2023 Design Liquido
// Copyright 2018 Johannes Wilm
// Copyright 2005 Google Inc.
// All Rights Reserved
//
// TODO(mesch): add jsdoc comments. Use more coherent naming. Finish
// remaining XSLT features.
//
// Original author: Steffen Meschkat <mesch@google.com>

import {
    XDocument,
    XNode,
    domAppendChild,
    domAppendTransformedChild,
    domCreateCDATASection,
    domCreateComment,
    domCreateDocumentFragment,
    domCreateElement,
    domCreateTextNode,
    domCreateTransformedTextNode,
    domGetAttributeValue,
    domSetTransformedAttribute,
    xmlGetAttribute,
    xmlTransformedText,
    xmlValue,
    xmlValue2
} from '../dom';
import { ExprContext, XPath } from '../xpath';

import {
    DOM_ATTRIBUTE_NODE,
    DOM_CDATA_SECTION_NODE,
    DOM_COMMENT_NODE,
    DOM_DOCUMENT_FRAGMENT_NODE,
    DOM_DOCUMENT_NODE,
    DOM_ELEMENT_NODE,
    DOM_TEXT_NODE
} from '../constants';

import { StringValue, NodeSetValue } from '../xpath/values';
import { XsltOptions } from './xslt-options';
import { XsltDecimalFormatSettings } from './xslt-decimal-format-settings';
import { MatchResolver } from '../xpath/match-resolver';

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
 * xsltProcessContext(). It receives as arguments the starting point in the
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
    matchResolver: MatchResolver;
    options: XsltOptions;
    decimalFormatSettings: XsltDecimalFormatSettings;

    outputDocument: XDocument;
    outputMethod: 'xml' | 'html' | 'text' | 'name';
    outputOmitXmlDeclaration: string;
    version: string;

    constructor(
        options: Partial<XsltOptions> = {
            escape: true,
            selfClosingTags: true,
            parameters: []
        }
    ) {
        this.xPath = new XPath();
        this.matchResolver = new MatchResolver();
        this.options = {
            escape: options.escape === true,
            selfClosingTags: options.selfClosingTags === true,
            parameters: options.parameters || []
        };
        this.outputMethod = 'xml';
        this.outputOmitXmlDeclaration = 'no';
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
    }

    /**
     * The exported entry point of the XSL-T processor.
     * @param xmlDoc The input document root, as DOM node.
     * @param stylesheet The stylesheet document root, as DOM node.
     * @returns the processed document, as XML text in a string.
     */
    xsltProcess(xmlDoc: XDocument, stylesheet: XDocument) {
        const outputDocument = new XDocument();
        this.outputDocument = outputDocument;
        const expressionContext = new ExprContext([xmlDoc], [outputDocument]);

        if (this.options.parameters.length > 0) {
            for (const parameter of this.options.parameters) {
                expressionContext.setVariable(parameter.name, new StringValue(parameter.value));
            }
        }

        this.xsltProcessContext(expressionContext, stylesheet);
        const transformedOutputXml = xmlTransformedText(outputDocument, {
            cData: false,
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
    protected xsltProcessContext(context: ExprContext, template: XNode, output?: XNode) {
        if (!this.isXsltElement(template)) {
            this.xsltPassThrough(context, template, output);
        } else {
            let name: any,
                top: any,
                nameExpr: any,
                node: any,
                select: any,
                value: any,
                nodes: any,
                mode: any,
                templates: any,
                paramContext: any,
                commentData: any,
                commentNode: any,
                test: any,
                match: any,
                text: any;
            switch (template.localName) {
                case 'apply-imports':
                    throw new Error(`not implemented: ${template.localName}`);
                case 'apply-templates':
                    select = xmlGetAttribute(template, 'select');
                    if (select) {
                        nodes = this.xPath.xPathEval(select, context).nodeSetValue();
                    } else {
                        nodes = context.nodeList[context.position].childNodes;
                    }

                    // TODO: Check why apply-templates was sorting and filing parameters
                    // automatically.
                    /* this.xsltWithParam(sortContext, template);
                    this.xsltSort(sortContext, template); */

                    mode = xmlGetAttribute(template, 'mode');
                    top = template.ownerDocument.documentElement;

                    templates = [];
                    for (let element of top.childNodes.filter(
                        (c: XNode) => c.nodeType == DOM_ELEMENT_NODE && this.isXsltElement(c, 'template')
                    )) {
                        // Actual template should be executed.
                        // `<xsl:apply-templates>` should have an ancestor `<xsl:template>`
                        // for comparison.
                        const templateAncestor = template.getAncestorByLocalName('template');
                        if (templateAncestor === undefined) {
                            continue;
                        }

                        if (templateAncestor.id === element.id) {
                            continue;
                        }

                        if (!mode || element.getAttributeValue('mode') === mode) {
                            templates.push(element);
                        }
                    }

                    const modifiedContext = context.clone(nodes);
                    for (let i = 0; i < templates.length; ++i) {
                        for (let j = 0; j < modifiedContext.contextSize(); ++j) {
                            // If the current node is text, there's no need to test all the templates
                            // against it. Just appending it to its parent is fine.
                            if (modifiedContext.nodeList[j].nodeType === DOM_TEXT_NODE) {
                                const textNodeContext = context.clone([modifiedContext.nodeList[j]], undefined, 0, undefined);
                                // TODO: verify if it is okay to pass the own text node as template.
                                this.commonLogicTextNode(textNodeContext, modifiedContext.nodeList[j]);
                            } else {
                                const clonedContext = modifiedContext.clone(
                                    [modifiedContext.nodeList[j]],
                                    undefined,
                                    // [modifiedContext.nodeList[j].outputNode],
                                    0,
                                    undefined
                                    // 0
                                );
                                clonedContext.inApplyTemplates = true;
                                // The output depth should be restarted, since
                                // another template is being applied from this point.
                                clonedContext.outputDepth = 0;
                                this.xsltProcessContext(clonedContext, templates[i], output);
                            }
                        }
                    }

                    break;
                case 'attribute':
                    nameExpr = xmlGetAttribute(template, 'name');
                    name = this.xsltAttributeValue(nameExpr, context);

                    const documentFragment = domCreateDocumentFragment(this.outputDocument);
                    this.xsltChildNodes(context, template, documentFragment);
                    value = xmlValue2(documentFragment);
                    if (output !== null && output !== undefined) {
                        domSetTransformedAttribute(output, name, value);
                    } else {
                        let sourceNode = context.nodeList[context.position];
                        let parentSourceNode = sourceNode.parentNode;
                        let outputNode = sourceNode.outputNode;

                        // At this point, the output node should exist.
                        // If not, a new node is created.
                        if (outputNode === null || outputNode === undefined) {
                            outputNode = new XNode(
                                sourceNode.nodeType,
                                sourceNode.nodeName,
                                sourceNode.nodeValue,
                                context.outputNodeList[context.outputPosition],
                                sourceNode.namespaceUri
                            );
                            sourceNode.outputNode = outputNode;
                        }

                        // Corner case:
                        // It can happen here that we don't have the root node set.
                        // In this case we need to append a copy of the root
                        // source node to receive the attribute.
                        if (outputNode.localName === "#document") {
                            const sourceRootNode = context.root.childNodes[0];
                            const newRootNode = domCreateElement(this.outputDocument, sourceRootNode.nodeName);
                            newRootNode.transformedNodeName = sourceRootNode.nodeName;
                            newRootNode.transformedLocalName = sourceRootNode.localName;
                            domAppendTransformedChild(outputNode, newRootNode);
                            outputNode = newRootNode;
                            parentSourceNode = newRootNode;
                        }

                        // Some operations start by the tag attributes, and not by the tag itself.
                        // When this is the case, the output node is not set yet, so
                        // we add the transformed attributes into the original tag.
                        if (parentSourceNode && parentSourceNode.outputNode) {
                            domSetTransformedAttribute(parentSourceNode.outputNode, name, value);
                        } else {
                            domSetTransformedAttribute(parentSourceNode, name, value);
                        }
                    }

                    break;
                case 'attribute-set':
                    throw new Error(`not implemented: ${template.localName}`);
                case 'call-template':
                    name = xmlGetAttribute(template, 'name');
                    top = template.ownerDocument.documentElement;

                    paramContext = context.clone();
                    this.xsltWithParam(paramContext, template);

                    for (let i = 0; i < top.childNodes.length; ++i) {
                        let c = top.childNodes[i];
                        if (
                            c.nodeType == DOM_ELEMENT_NODE &&
                            this.isXsltElement(c, 'template') &&
                            domGetAttributeValue(c, 'name') == name
                        ) {
                            this.xsltChildNodes(paramContext, c, output);
                            break;
                        }
                    }
                    break;
                case 'choose':
                    this.xsltChoose(context, template, output);
                    break;
                case 'comment':
                    node = domCreateDocumentFragment(this.outputDocument);
                    this.xsltChildNodes(context, template, node);
                    commentData = xmlValue(node);
                    commentNode = domCreateComment(this.outputDocument, commentData);
                    output.appendChild(commentNode);
                    break;
                case 'copy':
                    const destinationCopyNode = output || context.outputNodeList[context.outputPosition];
                    node = this.xsltCopy(destinationCopyNode, context.nodeList[context.position]);
                    if (node) {
                        this.xsltChildNodes(context, template, node);
                    }
                    break;
                case 'copy-of':
                    select = xmlGetAttribute(template, 'select');
                    value = this.xPath.xPathEval(select, context);
                    const destinationNode = output || context.outputNodeList[context.outputPosition];
                    if (value.type === 'node-set') {
                        nodes = value.nodeSetValue();
                        for (let i = 0; i < nodes.length; ++i) {
                            this.xsltCopyOf(destinationNode, nodes[i]);
                        }
                    } else {
                        let node = domCreateTextNode(this.outputDocument, value.stringValue());
                        domAppendChild(destinationNode, node);
                    }
                    break;
                case 'decimal-format':
                    name = xmlGetAttribute(template, 'name');
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
                    break;
                case 'element':
                    nameExpr = xmlGetAttribute(template, 'name');
                    name = this.xsltAttributeValue(nameExpr, context);
                    node = domCreateElement(this.outputDocument, name);

                    node.transformedNodeName = name;

                    domAppendTransformedChild(context.outputNodeList[context.outputPosition], node);
                    const clonedContext = context.clone(undefined, [node], undefined, 0);
                    this.xsltChildNodes(clonedContext, template, node);
                    break;
                case 'fallback':
                    throw new Error(`not implemented: ${template.localName}`);
                case 'for-each':
                    this.xsltForEach(context, template, output);
                    break;
                case 'if':
                    test = xmlGetAttribute(template, 'test');
                    if (this.xPath.xPathEval(test, context).booleanValue()) {
                        this.xsltChildNodes(context, template, output);
                    }
                    break;
                case 'import':
                    throw new Error(`not implemented: ${template.localName}`);
                case 'include':
                    throw new Error(`not implemented: ${template.localName}`);
                case 'key':
                    throw new Error(`not implemented: ${template.localName}`);
                case 'message':
                    throw new Error(`not implemented: ${template.localName}`);
                case 'namespace-alias':
                    throw new Error(`not implemented: ${template.localName}`);
                case 'number':
                    throw new Error(`not implemented: ${template.localName}`);
                case 'otherwise':
                    throw `error if here: ${template.localName}`;
                case 'output':
                    this.outputMethod = (xmlGetAttribute(template, 'method') as 'xml' | 'html' | 'text' | 'name');
                    this.outputOmitXmlDeclaration = xmlGetAttribute(template, 'omit-xml-declaration');
                    break;
                case 'param':
                    this.xsltVariable(context, template, false);
                    break;
                case 'preserve-space':
                    throw new Error(`not implemented: ${template.localName}`);
                case 'processing-instruction':
                    throw new Error(`not implemented: ${template.localName}`);
                case 'sort':
                    this.xsltSort(context, template);
                    break;
                case 'strip-space':
                    throw new Error(`not implemented: ${template.localName}`);
                case 'stylesheet':
                case 'transform':
                    this.xsltTransformOrStylesheet(template, context, output);
                    break;
                case 'template':
                    // If `<xsl:template>` is executed outside `<xsl:apply-templates>`,
                    // only one match is accepted per level (or per context here).
                    if (!context.inApplyTemplates && context.baseTemplateMatched) {
                        break;
                    }

                    match = xmlGetAttribute(template, 'match');
                    if (!match) break;

                    // XPath doesn't have an axis to select "self and siblings", and
                    // the default axis is "child", so to select the correct children
                    // in relative path, we force a 'self-and-siblings' axis.
                    nodes = this.xsltMatch(match, context, 'self-and-siblings');
                    if (nodes.length > 0) {
                        if (!context.inApplyTemplates) {
                            context.baseTemplateMatched = true;
                        }

                        const templateContext = context.clone(nodes, undefined, 0);
                        this.xsltChildNodes(templateContext, template, output);
                    }
                    break;
                case 'text':
                    text = xmlValue(template);
                    node = domCreateTransformedTextNode(this.outputDocument, text);
                    const disableOutputEscaping = template.attributes.filter(
                        (a) => a.nodeName === 'disable-output-escaping'
                    );
                    if (disableOutputEscaping.length > 0 && disableOutputEscaping[0].nodeValue === 'yes') {
                        node.escape = false;
                    }
                    const destinationTextNode = output || context.outputNodeList[context.outputPosition];
                    destinationTextNode.appendTransformedChild(node);
                    break;
                case 'value-of':
                    select = xmlGetAttribute(template, 'select');
                    const attribute = this.xPath.xPathEval(select, context);
                    value = attribute.stringValue();
                    node = domCreateTransformedTextNode(this.outputDocument, value);
                    node.siblingPosition = context.nodeList[context.position].siblingPosition;
                    if (output !== null && output !== undefined) {
                        output.appendTransformedChild(node);
                    } else {
                        context.outputNodeList[context.outputPosition].appendTransformedChild(node);
                    }

                    break;
                case 'variable':
                    this.xsltVariable(context, template, true);
                    break;
                case 'when':
                    throw new Error(`error if here: ${template.localName}`);
                case 'with-param':
                    throw new Error(`error if here: ${template.localName}`);
                default:
                    throw new Error(`error if here: ${template.localName}`);
            }
        }
    }

    /**
     * Implements xsl:choose and its child nodes xsl:when and
     * xsl:otherwise.
     * @param input The Expression Context.
     * @param template The template.
     * @param output The output.
     */
    protected xsltChoose(input: ExprContext, template: any, output: any) {
        for (const childNode of template.childNodes) {
            if (childNode.nodeType !== DOM_ELEMENT_NODE) {
                continue;
            }

            if (this.isXsltElement(childNode, 'when')) {
                const test = xmlGetAttribute(childNode, 'test');
                if (this.xPath.xPathEval(test, input).booleanValue()) {
                    this.xsltChildNodes(input, childNode, output);
                    break;
                }
            } else if (this.isXsltElement(childNode, 'otherwise')) {
                this.xsltChildNodes(input, childNode, output);
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
            node.transformedNodeName = source.nodeName;
            if (source.namespaceUri !== null && source.namespaceUri !== undefined) {
                domSetTransformedAttribute(node, 'xmlns', source.namespaceUri);
            }
            domAppendTransformedChild(destination, node);
            return node;
        }

        if (source.nodeType == DOM_TEXT_NODE) {
            let node = domCreateTransformedTextNode(this.outputDocument, source.nodeValue);
            domAppendTransformedChild(destination, node);
        } else if (source.nodeType == DOM_CDATA_SECTION_NODE) {
            let node = domCreateCDATASection(this.outputDocument, source.nodeValue);
            domAppendTransformedChild(destination, node);
        } else if (source.nodeType == DOM_COMMENT_NODE) {
            let node = domCreateComment(this.outputDocument, source.nodeValue);
            domAppendTransformedChild(destination, node);
        } else if (source.nodeType == DOM_ATTRIBUTE_NODE) {
            domSetTransformedAttribute(destination, source.nodeName, source.nodeValue);
        }

        return null;
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
                // This was an element node -- recurse to attributes and
                // children.
                for (let i = 0; i < source.attributes.length; ++i) {
                    this.xsltCopyOf(node, source.attributes[i]);
                }

                for (let i = 0; i < source.childNodes.length; ++i) {
                    this.xsltCopyOf(node, source.childNodes[i]);
                }
            }
        }
    }

    /**
     * Implements `xsl:for-each`.
     * @param input The Expression Context.
     * @param template The template.
     * @param output The output.
     */
    protected xsltForEach(context: ExprContext, template: XNode, output: XNode) {
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

        // TODO: Removed for now because sortContext can select attributes,
        // and attributes are separated from child nodes.
        /* const parent = nodesWithParent[0].parentNode;
        parent.childNodes = sortContext.nodeList; */

        for (let i = 0; i < sortContext.contextSize(); ++i) {
            this.xsltChildNodes(sortContext.clone(sortContext.nodeList, undefined, i), template, output);
        }
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
     * Implements `<xsl:stylesheet>` and `<xsl:transform>`, and its corresponding
     * validations.
     * @param template The `<xsl:stylesheet>` or `<xsl:transform>` node.
     * @param context The Expression Context.
     * @param output The output XML.
     */
    protected xsltTransformOrStylesheet(template: XNode, context: ExprContext, output: XNode): void {
        for (let stylesheetAttribute of template.attributes) {
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

        this.xsltChildNodes(context, template, output);
    }

    /**
     * Evaluates a variable or parameter and set it in the current input
     * context. Implements `xsl:variable`, `xsl:param`, and `xsl:with-param`.
     *
     * @param input TODO
     * @param template TODO
     * @param override flag that defines if the value computed here
     * overrides the one already in the input context if that is the
     * case. I.e. decides if this is a default value or a local
     * value. `xsl:variable` and `xsl:with-param` override; `xsl:param` doesn't.
     */
    protected xsltVariable(input: ExprContext, template: any, override: boolean) {
        const name = xmlGetAttribute(template, 'name');
        const select = xmlGetAttribute(template, 'select');

        let value: any;

        if (template.childNodes.length > 0) {
            const root = domCreateDocumentFragment(template.ownerDocument);
            this.xsltChildNodes(input, template, root);
            value = new NodeSetValue([root]);
        } else if (select) {
            value = this.xPath.xPathEval(select, input);
        } else {
            let parameterValue = '';
            const filteredParameter = this.options.parameters.filter((p) => p.name === name);
            if (filteredParameter.length > 0) {
                parameterValue = filteredParameter[0].value;
            }
            value = new StringValue(parameterValue);
        }

        if (override || !input.getVariable(name)) {
            input.setVariable(name, value);
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
    protected xsltChildNodes(context: ExprContext, template: XNode, output?: XNode) {
        // Clone input context to keep variables declared here local to the
        // siblings of the children.
        const contextClone = context.clone();
        for (let i = 0; i < template.childNodes.length; ++i) {
            this.xsltProcessContext(contextClone, template.childNodes[i], output);
        }
    }

    /**
     * This logic is used in two different places:
     * - `xsltPassThrough`, if the template asks this library to write a text node;
     * - `xsltProcessContext`, `apply-templates` operation, when the current node is text.
     * @param context The Expression Context.
     * @param template The template, that contains the node value to be written.
     */
    private commonLogicTextNode(context: ExprContext, template: XNode) {
        const textNodeList = context.outputNodeList[context.outputPosition].transformedChildNodes.filter(
            (n) => n.nodeType === DOM_TEXT_NODE
        );

        if (textNodeList.length > 0) {
            let node = textNodeList[0];
            node.transformedNodeValue = template.nodeValue;
        } else {
            let node = domCreateTransformedTextNode(this.outputDocument, template.nodeValue);
            node.transformedParentNode = context.outputNodeList[context.outputPosition];
            domAppendTransformedChild(context.outputNodeList[context.outputPosition], node);
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
    protected xsltPassThrough(context: ExprContext, template: XNode, output: XNode) {
        if (template.nodeType == DOM_TEXT_NODE) {
            if (this.xsltPassText(template)) {
                this.commonLogicTextNode(context, template);
            }
        } else if (template.nodeType == DOM_ELEMENT_NODE) {
            let node: XNode;
            let elementContext = context;
            if (context.nodeList[context.position].nodeName === '#document') {
                node = context.nodeList[context.position].childNodes.find(c => c.nodeName !== '#dtd-section');
                elementContext = context.clone([node]);
            } else {
                node = context.nodeList[context.position];
            }

            let newNode: XNode;
            if (node.outputNode === undefined || node.outputNode === null || context.outputDepth > 0) {
                newNode = domCreateElement(this.outputDocument, template.nodeName);
                newNode.siblingPosition = node.siblingPosition;
                if (context.outputDepth === 0) {
                    node.outputNode = newNode;
                }
            } else {
                newNode = node.outputNode;
            }

            newNode.transformedNodeName = template.nodeName;
            newNode.transformedLocalName = template.localName;

            // The node can have transformed attributes from previous transformations.
            for (const previouslyTransformedAttribute of node.transformedAttributes) {
                const name = previouslyTransformedAttribute.transformedNodeName;
                const value = previouslyTransformedAttribute.transformedNodeValue;
                domSetTransformedAttribute(newNode, name, value);
            }

            const templateAttributes = template.attributes.filter((a: any) => a);
            for (const attribute of templateAttributes) {
                const name = attribute.nodeName;
                const value = this.xsltAttributeValue(attribute.nodeValue, elementContext);
                domSetTransformedAttribute(newNode, name, value);
            }

            const outputNode = context.outputNodeList[context.outputPosition];
            domAppendTransformedChild(outputNode, newNode);
            const clonedContext = elementContext.cloneByOutput(
                outputNode.transformedChildNodes,
                outputNode.transformedChildNodes.length - 1,
                ++elementContext.outputDepth
            );
            this.xsltChildNodes(clonedContext, template);
        } else {
            // This applies also to the DOCUMENT_NODE of the XSL stylesheet,
            // so we don't have to treat it specially.
            this.xsltChildNodes(context, template, output);
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

    protected xsltAttribute(attributeName: string, context: ExprContext): XNode {
        return context.nodeList[context.position].attributes.find(a => a.nodeName === attributeName);
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
     * @param input TODO
     * @param template TODO
     */
    protected xsltWithParam(input: ExprContext, template: any) {
        for (const c of template.childNodes) {
            if (c.nodeType === DOM_ELEMENT_NODE && this.isXsltElement(c, 'with-param')) {
                this.xsltVariable(input, c, true);
            }
        }
    }

    // Test if the given element is an XSLT element, optionally the one with the given name
    protected isXsltElement(element: any, opt_wantedName?: string) {
        if (opt_wantedName && element.localName != opt_wantedName) return false;
        if (element.namespaceUri) return element.namespaceUri === 'http://www.w3.org/1999/XSL/Transform';
        return element.prefix === 'xsl'; // backwards compatibility with earlier versions of xslt-processor
    }
}
