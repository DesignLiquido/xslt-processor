// Copyright 2023 Design Liquido
// Copyright 2018 Johannes Wilm
// Copyright 2005 Google Inc.
// All Rights Reserved
//
// TODO(mesch): add jsdoc comments. Use more coherent naming. Finish
// remaining XSLT features.
//
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
    xmlOwnerDocument,
    xmlTransformedText,
    xmlValue,
    xmlValue2
} from './dom';
import { ExprContext, XPath } from './xpath';

import {
    DOM_ATTRIBUTE_NODE,
    DOM_CDATA_SECTION_NODE,
    DOM_COMMENT_NODE,
    DOM_DOCUMENT_FRAGMENT_NODE,
    DOM_DOCUMENT_NODE,
    DOM_ELEMENT_NODE,
    DOM_TEXT_NODE
} from './constants';
import { Expression } from './xpath/expressions/expression';
import { StringValue, NodeSetValue } from './xpath/values';
import { LocationExpr } from './xpath/expressions';

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
    outputMethod: string;
    outputOmitXmlDeclaration: string;

    constructor() {
        this.xPath = new XPath();
        this.outputMethod = "xml";
        this.outputOmitXmlDeclaration = "no";
    }

    /**
     * The exported entry point of the XSL-T processor.
     * @param xmlDoc The input document root, as DOM node.
     * @param stylesheet The stylesheet document root, as DOM node.
     * @param parameters Additional parameters to be set as variables.
     * @returns the processed document, as XML text in a string.
     */
    xsltProcess(xmlDoc: XDocument, stylesheet: XDocument, parameters?: any) {
        const output = new XDocument();
        output.appendChild(XNode.clone(xmlDoc.childNodes[0], output));
        const expressionContext = new ExprContext([output]);

        if (parameters && typeof parameters === 'object') {
            for (const [key, value] of Object.entries(parameters)) {
                expressionContext.setVariable(key, new StringValue(value));
            }
        }

        this.xsltProcessContext(expressionContext, stylesheet, output, parameters);
        const ret = xmlTransformedText(output);
        return ret;
    }

    /**
     * The main entry point of the XSL-T processor, as explained on the top of the file.
     * @param context The input document root, as XPath ExprContext.
     * @param template The stylesheet document root, as DOM node.
     * @param output the root of the generated output, as DOM node.
     * @param _parameters Extra parameters.
     */
    protected xsltProcessContext(
        context: ExprContext,
        template: XNode,
        output: XNode,
        _parameters?: { [key: string]: any }
    ) {
        const outputDocument = xmlOwnerDocument(output);

        if (!this.isXsltElement(template)) {
            this.xsltPassThrough(context, template, output, outputDocument);
        } else {
            let name,
                top,
                nameExpr,
                node,
                select,
                value,
                nodes,
                sortContext,
                mode,
                templates,
                paramContext,
                commentData,
                commentNode,
                test,
                match,
                text;
            switch (template.localName) {
                case 'apply-imports':
                    throw `not implemented: ${template.localName}`;
                case 'apply-templates':
                    select = xmlGetAttribute(template, 'select');
                    if (select) {
                        nodes = this.xPath.xPathEval(select, context).nodeSetValue();
                    } else {
                        nodes = context.nodelist[context.position].childNodes;
                    }

                    sortContext = context.clone(nodes, 0);
                    this.xsltWithParam(sortContext, template);
                    this.xsltSort(sortContext, template);

                    mode = xmlGetAttribute(template, 'mode');
                    top = template.ownerDocument.documentElement;

                    templates = [];
                    for (let i = 0; i < top.childNodes.length; ++i) {
                        let c = top.childNodes[i];
                        let matchAttribute = c.getAttributeValue('match');

                        // Avoiding infinite loops.
                        if (matchAttribute && matchAttribute.startsWith('/')) {
                            continue;
                        }

                        if (
                            c.nodeType == DOM_ELEMENT_NODE &&
                            this.isXsltElement(c, 'template') &&
                            (!mode || c.getAttributeValue('mode') == mode)
                        ) {
                            templates.push(c);
                        }
                    }

                    for (let j = 0; j < sortContext.contextSize(); ++j) {
                        for (let i = 0; i < templates.length; ++i) {
                            this.xsltProcessContext(sortContext.clone(sortContext.nodelist, j), templates[i], output);
                        }
                    }
                    break;
                case 'attribute':
                    nameExpr = xmlGetAttribute(template, 'name');
                    name = this.xsltAttributeValue(nameExpr, context);
                    node = domCreateDocumentFragment(outputDocument);
                    this.xsltChildNodes(context, template, node);
                    value = xmlValue2(node);
                    domSetTransformedAttribute(output, name, value);
                    break;
                case 'attribute-set':
                    throw `not implemented: ${template.localName}`;
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
                    node = domCreateDocumentFragment(outputDocument);
                    this.xsltChildNodes(context, template, node);
                    commentData = xmlValue(node);
                    commentNode = domCreateComment(outputDocument, commentData);
                    output.appendChild(commentNode);
                    break;
                case 'copy':
                    node = this.xsltCopy(output, context.nodelist[context.position], outputDocument);
                    if (node) {
                        this.xsltChildNodes(context, template, node);
                    }
                    break;
                case 'copy-of':
                    select = xmlGetAttribute(template, 'select');
                    value = this.xPath.xPathEval(select, context);
                    if (value.type == 'node-set') {
                        nodes = value.nodeSetValue();
                        for (let i = 0; i < nodes.length; ++i) {
                            this.xsltCopyOf(output, nodes[i], outputDocument);
                        }
                    } else {
                        let node = domCreateTextNode(outputDocument, value.stringValue());
                        domAppendChild(output, node);
                    }
                    break;
                case 'decimal-format':
                    throw `not implemented: ${template.localName}`;
                case 'element':
                    nameExpr = xmlGetAttribute(template, 'name');
                    name = this.xsltAttributeValue(nameExpr, context);
                    node = domCreateElement(outputDocument, name);
                    // Adds context children reference to this new node,
                    // so then further transformations are also observed
                    // by this new node.
                    const contextNode = context.nodelist[context.position];
                    node.childNodes = contextNode.childNodes;
                    node.transformedNodeName = name;

                    domAppendTransformedChild(output, node);
                    this.xsltChildNodes(context, template, node);
                    break;
                case 'fallback':
                    throw `not implemented: ${template.localName}`;
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
                    throw `not implemented: ${template.localName}`;
                case 'include':
                    throw `not implemented: ${template.localName}`;
                case 'key':
                    throw `not implemented: ${template.localName}`;
                case 'message':
                    throw `not implemented: ${template.localName}`;
                case 'namespace-alias':
                    throw `not implemented: ${template.localName}`;
                case 'number':
                    throw `not implemented: ${template.localName}`;
                case 'otherwise':
                    throw `error if here: ${template.localName}`;
                case 'output':
                    this.outputMethod = xmlGetAttribute(template, 'method');
                    this.outputOmitXmlDeclaration = xmlGetAttribute(template, 'omit-xml-declaration');
                    break;
                case 'preserve-space':
                    throw `not implemented: ${template.localName}`;
                case 'processing-instruction':
                    throw `not implemented: ${template.localName}`;
                case 'sort':
                    // just ignore -- was handled by xsltSort()
                    break;
                case 'strip-space':
                    throw `not implemented: ${template.localName}`;
                case 'stylesheet':
                case 'transform':
                    this.xsltChildNodes(context, template, output);
                    break;
                case 'template':
                    match = xmlGetAttribute(template, 'match');
                    if (match && this.xsltMatch(match, context)) {
                        this.xsltChildNodes(context, template, output);
                    }
                    break;
                case 'text':
                    text = xmlValue(template);
                    node = domCreateTransformedTextNode(outputDocument, text);
                    const disableOutputEscaping = template.attributes.filter(a => a.nodeName === 'disable-output-escaping');
                    if (disableOutputEscaping.length > 0 && disableOutputEscaping[0].nodeValue === 'yes') {
                        node.escape = false;
                    }
                    output.appendTransformedChild(node);
                    break;
                case 'value-of':
                    select = xmlGetAttribute(template, 'select');
                    const attribute = this.xPath.xPathEval(select, context);
                    value = attribute.stringValue();
                    node = domCreateTransformedTextNode(outputDocument, value);
                    context.nodelist[context.position].appendTransformedChild(node);
                    break;
                case 'param':
                    this.xsltVariable(context, template, false);
                    break;
                case 'variable':
                    this.xsltVariable(context, template, true);
                    break;
                case 'when':
                    throw `error if here: ${template.localName}`;
                case 'with-param':
                    throw `error if here: ${template.localName}`;
                default:
                    throw `error if here: ${template.localName}`;
            }
        }
    }

    /**
     * Implements `xsl:copy` for all node types.
     * @param {XNode} destination the node being copied to, part of output document
     * @param {XNode} source the node being copied, part in input document
     * @param {XDocument} destinationDocument dstDocument
     * @returns {XNode|null} If an element node was created, the element node. Otherwise null.
     */
    protected xsltCopy(destination: any, source: any, destinationDocument: any): XNode {
        if (source.nodeType == DOM_ELEMENT_NODE) {
            let node = domCreateElement(destinationDocument, source.nodeName);
            node.transformedNodeName = source.nodeName;
            domAppendTransformedChild(destination, node);
            return node;
        }

        if (source.nodeType == DOM_TEXT_NODE) {
            let node = domCreateTransformedTextNode(destinationDocument, source.nodeValue);
            domAppendTransformedChild(destination, node);
        } else if (source.nodeType == DOM_CDATA_SECTION_NODE) {
            let node = domCreateCDATASection(destinationDocument, source.nodeValue);
            domAppendTransformedChild(destination, node);
        } else if (source.nodeType == DOM_COMMENT_NODE) {
            let node = domCreateComment(destinationDocument, source.nodeValue);
            domAppendTransformedChild(destination, node);
        } else if (source.nodeType == DOM_ATTRIBUTE_NODE) {
            domSetTransformedAttribute(destination, source.nodeName, source.nodeValue);
        }

        return null;
    }

    /**
     * Orders the current node list in the input context according to the
     * sort order specified by xsl:sort child nodes of the current
     * template node. This happens before the operation specified by the
     * current template node is executed.
     * @param context TODO
     * @param template TODO
     * @todo case-order is not implemented.
     */
    protected xsltSort(context: ExprContext, template: XNode) {
        const sort: any[] = [];

        for (const c of template.childNodes) {
            if (c.nodeType == DOM_ELEMENT_NODE && this.isXsltElement(c, 'sort')) {
                const select = xmlGetAttribute(c, 'select');
                const expr = this.xPath.xPathParse(select);
                const type = xmlGetAttribute(c, 'data-type') || 'text';
                const order = xmlGetAttribute(c, 'order') || 'ascending';
                sort.push({
                    expr,
                    type,
                    order
                });
            }
        }

        this.xPath.xPathSort(context, sort);
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
     * value. xsl:variable and xsl:with-param override; xsl:param doesn't.
     */
    protected xsltVariable(input: ExprContext, template: any, override: boolean) {
        const name = xmlGetAttribute(template, 'name');
        const select = xmlGetAttribute(template, 'select');

        let value;

        if (template.childNodes.length > 0) {
            const root = domCreateDocumentFragment(template.ownerDocument);
            this.xsltChildNodes(input, template, root);
            value = new NodeSetValue([root]);
        } else if (select) {
            value = this.xPath.xPathEval(select, input);
        } else {
            value = new StringValue('');
        }

        if (override || !input.getVariable(name)) {
            input.setVariable(name, value);
        }
    }

    // Implements xsl:chose and its child nodes xsl:when and
    // xsl:otherwise.

    protected xsltChoose(input: any, template: any, output: any) {
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
     * Implements `xsl:for-each`.
     * @param context TODO
     * @param template TODO
     * @param output TODO
     */
    protected xsltForEach(context: ExprContext, template: XNode, output: XNode) {
        const select = xmlGetAttribute(template, 'select');
        const nodes = this.xPath.xPathEval(select, context).nodeSetValue();
        const sortContext = context.clone(nodes, 0);
        this.xsltSort(sortContext, template);

        const nodesWithParent = sortContext.nodelist.filter((n) => n.parentNode !== null && n.parentNode !== undefined);
        if (nodesWithParent.length <= 0) {
            throw new Error('Nodes with no parents defined.');
        }

        const parent = nodesWithParent[0].parentNode;
        parent.childNodes = sortContext.nodelist;

        for (let i = 0; i < sortContext.contextSize(); ++i) {
            this.xsltChildNodes(sortContext.clone(sortContext.nodelist, i), template, output);
        }
        // TODO: group nodes by parent node.
        // const nodeGroups = this.groupBy(nodes, 'parentNode');

        /* for (let [group, _nodes] of Object.entries(nodeGroups)) {
            const sortContext = context.clone(_nodes, 0);
            this.xsltSort(sortContext, template);

            for (let i = 0; i < sortContext.contextSize(); ++i) {
                this.xsltChildNodes(sortContext.clone(sortContext.nodelist, i), template, output);
            }
        } */
    }

    protected groupBy(xs: any, key: any) {
        return xs.reduce((rv, x) => {
            (rv[x[key]] = rv[x[key]] || []).push(x);
            return rv;
        }, {});
    }

    /**
     * Traverses the template node tree. Calls the main processing
     * function with the current input context for every child node of the
     * current template node.
     * @param context Normally the Expression Context.
     * @param template The XSL-T definition.
     * @param output The XML output.
     */
    protected xsltChildNodes(context: ExprContext, template: any, output: XNode) {
        // Clone input context to keep variables declared here local to the
        // siblings of the children.
        const contextClone = context.clone();
        for (let i = 0; i < template.childNodes.length; ++i) {
            this.xsltProcessContext(contextClone, template.childNodes[i], output);
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
     * @param outputDocument The output document, if the case.
     */
    protected xsltPassThrough(context: ExprContext, template: any, output: XNode, outputDocument: XDocument) {
        if (template.nodeType == DOM_TEXT_NODE) {
            if (this.xsltPassText(template)) {
                const textNodeList = context.nodelist[context.position].transformedChildNodes.filter(
                    (n) => n.nodeType === DOM_TEXT_NODE
                );
                if (textNodeList.length > 0) {
                    let node = textNodeList[0];
                    node.transformedNodeValue = template.nodeValue;
                } else {
                    let node = domCreateTextNode(outputDocument, template.nodeValue);
                    domAppendTransformedChild(context.nodelist[context.position], node);
                }
            }
        } else if (template.nodeType == DOM_ELEMENT_NODE) {
            let node: XNode;
            if (context.nodelist[context.position].nodeName === '#document') {
                node = context.nodelist[context.position].firstChild;
            } else {
                node = context.nodelist[context.position];
            }

            node.transformedNodeName = template.nodeName;
            node.transformedLocalName = template.localName;

            for (const attribute of template.attributes.filter((a: any) => a)) {
                const name = attribute.nodeName;
                const value = this.xsltAttributeValue(attribute.nodeValue, context);
                domSetTransformedAttribute(node, name, value);
            }

            this.xsltChildNodes(context, template, node);
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
        if (parts.length == 1) {
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
     * Implements xsl:copy-of for node-set values of the select
     * expression. Recurses down the source node tree, which is part of
     * the input document.
     * @param {XNode} dst the node being copied to, part of output document
     * @param {XNode} src the node being copied, part in input document
     * @param {XDocument} dstDocument dstDocument
     */
    protected xsltCopyOf(dst: any, src: any, dstDocument: any) {
        if (src.nodeType == DOM_DOCUMENT_FRAGMENT_NODE || src.nodeType == DOM_DOCUMENT_NODE) {
            for (let i = 0; i < src.childNodes.length; ++i) {
                this.xsltCopyOf(dst, src.childNodes[i], dstDocument);
            }
        } else {
            const node = this.xsltCopy(dst, src, dstDocument);
            if (node) {
                // This was an element node -- recurse to attributes and
                // children.
                for (let i = 0; i < src.attributes.length; ++i) {
                    this.xsltCopyOf(node, src.attributes[i], dstDocument);
                }

                for (let i = 0; i < src.childNodes.length; ++i) {
                    this.xsltCopyOf(node, src.childNodes[i], dstDocument);
                }
            }
        }
    }

    /**
     * Evaluates an XPath expression in the current input context as a
     * match.
     * @see [XSLT] section 5.2, paragraph 1
     * @param match TODO
     * @param context TODO
     * @returns TODO
     */
    protected xsltMatch(match: string, context: ExprContext) {
        const expr = this.xPath.xPathParse(match);

        if (expr instanceof LocationExpr) {
            return this.xsltLocationExpressionMatch(match, expr, context);
        }

        // TODO: Other expressions
        return true;
    }

    private xsltLocationExpressionMatch(match: string, expression: LocationExpr, context: ExprContext) {
        if (expression === undefined || expression.steps === undefined || expression.steps.length <= 0) {
            throw new Error('Error resolving XSLT match: Location Expression should have steps.');
        }

        const firstStep = expression.steps[0];

        // Shortcut for the most common case.
        if (
            expression.steps &&
            !expression.absolute &&
            expression.steps.length == 1 &&
            firstStep.axis == 'child' &&
            firstStep.predicate.length === 0
        ) {
            return firstStep.nodetest.evaluate(context).booleanValue();
        }

        if (expression.absolute && firstStep.axis !== 'self') {
            // TODO: `xPathCollectDescendants()`?
            const levels = match.split('/');
            if (levels.length > 1) {
                return this.absoluteXsltMatch(levels, expression, context);
            }
        }

        return this.relativeXsltMatch(expression, context);
    }

    /**
     * Sets parameters defined by xsl:with-param child nodes of the
     * current template node, in the current input context. This happens
     * before the operation specified by the current template node is
     * executed.
     * @param input TODO
     * @param template TODO
     */
    protected xsltWithParam(input: any, template: any) {
        for (const c of template.childNodes) {
            if (c.nodeType === DOM_ELEMENT_NODE && this.isXsltElement(c, 'with-param')) {
                this.xsltVariable(input, c, true);
            }
        }
    }

    private absoluteXsltMatch(levels: string[], expr: Expression, context: ExprContext) {
        const result = expr.evaluate(context.clone([context.nodelist[context.position]], 0)).nodeSetValue();
        if (result.length > 0) {
            context.nodelist = result;
            return true;
        }

        return false;
    }

    private relativeXsltMatch(expr: Expression, context: ExprContext) {
        let node = context.nodelist[context.position];

        while (node) {
            const result = expr.evaluate(context.clone([node], 0)).nodeSetValue();
            for (let i = 0; i < result.length; ++i) {
                if (result[i] == context.nodelist[context.position]) {
                    /* if (context.node.nodeName === "#document") {
                        context.node = con
                    } */
                    return true;
                }
            }

            node = node.parentNode;
        }

        return false;
    }

    // Test if the given element is an XSLT element, optionally the one with the given name
    protected isXsltElement(element: any, opt_wantedName?: string) {
        if (opt_wantedName && element.localName != opt_wantedName) return false;
        if (element.namespaceURI) return element.namespaceURI === 'http://www.w3.org/1999/XSL/Transform';
        return element.prefix === 'xsl'; // backwards compatibility with earlier versions of xslt-processor
    }
}
