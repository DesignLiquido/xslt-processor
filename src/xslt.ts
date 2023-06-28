// Copyright 2023 Design Liquido
// Copyright 2018 Johannes Wilm
// Copyright 2005 Google Inc.
// All Rights Reserved
//
//
// An XSL-T processor written in JavaScript. The implementation is NOT
// complete; some xsl element are left out.
//
// References:
//
// [XSLT] XSL-T Specification
// <http://www.w3.org/TR/1999/REC-xslt-19991116>.
//
// [ECMA] ECMAScript Language Specification
// <http://www.ecma-international.org/publications/standards/Ecma-262.htm>.
//
// The XSL processor API has one entry point, the function
// xsltProcessContext(). It receives as arguments the starting point in the
// input document as an XPath expression context, the DOM root node of
// the XSL-T stylesheet, and a DOM node that receives the output.
//
// NOTE: Actually, XSL-T processing according to the specification is
// defined as operation on text documents, not as operation on DOM
// trees. So, strictly speaking, this implementation is not an XSL-T
// processor, but the processing engine that needs to be complemented
// by an XML parser and serializer in order to be complete. Those two
// are found in the file xml.js.
//
//
// TODO(mesch): add jsdoc comments. Use more coherent naming. Finish
// remaining XSLT features.
//
//
// Original author: Steffen Meschkat <mesch@google.com>
import he from 'he';

import {
    xmlValue,
    xmlText,
    xmlOwnerDocument,
    domGetAttribute,
    domSetAttribute,
    domAppendChild,
    domCreateTextNode,
    domCreateElement,
    domCreateCDATASection,
    domCreateComment,
    domCreateDocumentFragment,
    namespaceMapAt
} from './dom/util';
import { XDocument, XNode } from './dom';
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

export class Xslt {
    xPath: XPath;

    constructor() {
        this.xPath = new XPath();
    }

    /**
     * The exported entry point of the XSL-T processor.
     * @param xmlDoc The input document root, as DOM node.
     * @param stylesheet The stylesheet document root, as DOM node.
     * @param parameters Additional parameters to be set as variables.
     * @returns the processed document, as XML text in a string.
     */
    xsltProcess(xmlDoc: XDocument, stylesheet: XDocument, parameters?: any) {
        const output = domCreateDocumentFragment(new XDocument());
        const expressionContext = new ExprContext(xmlDoc);
        if (parameters && typeof parameters === 'object') {
            for (const [key, value] of Object.entries(parameters)) {
                expressionContext.setVariable(key, new StringValue(value));
            }
        }
        // expressionContext.setVariable();
        this.xsltProcessContext(expressionContext, stylesheet, output, parameters);
        const ret = xmlText(output);
        return ret;
    }

    // The main entry point of the XSL-T processor, as explained above.
    //
    // @param input The input document root, as XPath ExprContext.
    // @param template The stylesheet document root, as DOM node.
    // @param the root of the generated output, as DOM node.

    xsltProcessContext(input: any, template: any, output: any, _parameters?: any) {
        const outputDocument = xmlOwnerDocument(output);

        if (!this.isXsltElement(template)) {
            this.xsltPassThrough(input, template, output, outputDocument);
        } else {
            let name,
                top,
                nameexpr,
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
                    select = this.xmlGetAttribute(template, 'select');
                    if (select) {
                        nodes = this.xPath.xPathEval(select, input).nodeSetValue();
                    } else {
                        nodes = input.node.childNodes;
                    }

                    sortContext = input.clone(nodes[0], 0, nodes);
                    this.xsltWithParam(sortContext, template);
                    this.xsltSort(sortContext, template);

                    mode = this.xmlGetAttribute(template, 'mode');
                    top = template.ownerDocument.documentElement;
                    templates = [];
                    for (let i = 0; i < top.childNodes.length; ++i) {
                        let c = top.childNodes[i];
                        if (
                            c.nodeType == DOM_ELEMENT_NODE &&
                            this.isXsltElement(c, 'template') &&
                            (!mode || c.getAttribute('mode') == mode)
                        ) {
                            templates.push(c);
                        }
                    }
                    for (let j = 0; j < sortContext.contextSize(); ++j) {
                        const nj = sortContext.nodelist[j];
                        for (let i = 0; i < templates.length; ++i) {
                            this.xsltProcessContext(sortContext.clone(nj, j), templates[i], output);
                        }
                    }
                    break;
                case 'attribute':
                    nameexpr = this.xmlGetAttribute(template, 'name');
                    name = this.xsltAttributeValue(nameexpr, input);
                    node = domCreateDocumentFragment(outputDocument);
                    this.xsltChildNodes(input, template, node);
                    value = xmlValue(node);
                    domSetAttribute(output, name, value);
                    break;
                case 'attribute-set':
                    throw `not implemented: ${template.localName}`;
                case 'call-template':
                    name = this.xmlGetAttribute(template, 'name');
                    top = template.ownerDocument.documentElement;

                    paramContext = input.clone();
                    this.xsltWithParam(paramContext, template);

                    for (let i = 0; i < top.childNodes.length; ++i) {
                        let c = top.childNodes[i];
                        if (
                            c.nodeType == DOM_ELEMENT_NODE &&
                            this.isXsltElement(c, 'template') &&
                            domGetAttribute(c, 'name') == name
                        ) {
                            this.xsltChildNodes(paramContext, c, output);
                            break;
                        }
                    }
                    break;
                case 'choose':
                    this.xsltChoose(input, template, output);
                    break;
                case 'comment':
                    node = domCreateDocumentFragment(outputDocument);
                    this.xsltChildNodes(input, template, node);
                    commentData = xmlValue(node);
                    commentNode = domCreateComment(outputDocument, commentData);
                    output.appendChild(commentNode);
                    break;
                case 'copy':
                    node = this.xsltCopy(output, input.node, outputDocument);
                    if (node) {
                        this.xsltChildNodes(input, template, node);
                    }
                    break;
                case 'copy-of':
                    select = this.xmlGetAttribute(template, 'select');
                    value = this.xPath.xPathEval(select, input);
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
                    nameexpr = this.xmlGetAttribute(template, 'name');
                    name = this.xsltAttributeValue(nameexpr, input);
                    node = domCreateElement(outputDocument, name);
                    domAppendChild(output, node);
                    this.xsltChildNodes(input, template, node);
                    break;
                case 'fallback':
                    throw `not implemented: ${template.localName}`;
                case 'for-each':
                    this.xsltForEach(input, template, output);
                    break;
                case 'if':
                    test = this.xmlGetAttribute(template, 'test');
                    if (this.xPath.xPathEval(test, input).booleanValue()) {
                        this.xsltChildNodes(input, template, output);
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
                    // Ignored. -- Since we operate on the DOM, and all further use
                    // of the output of the XSL transformation is determined by the
                    // browser that we run in, this parameter is not applicable to
                    // this implementation.
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
                    this.xsltChildNodes(input, template, output);
                    break;
                case 'template':
                    match = this.xmlGetAttribute(template, 'match');
                    if (match && this.xsltMatch(match, input)) {
                        this.xsltChildNodes(input, template, output);
                    }
                    break;
                case 'text':
                    text = xmlValue(template);
                    node = domCreateTextNode(outputDocument, text);
                    output.appendChild(node);
                    break;
                case 'value-of':
                    select = this.xmlGetAttribute(template, 'select');
                    value = this.xPath.xPathEval(select, input).stringValue();
                    node = domCreateTextNode(outputDocument, value);
                    output.appendChild(node);
                    break;
                case 'param':
                    this.xsltVariable(input, template, false);
                    break;
                case 'variable':
                    this.xsltVariable(input, template, true);
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

    // Sets parameters defined by xsl:with-param child nodes of the
    // current template node, in the current input context. This happens
    // before the operation specified by the current template node is
    // executed.

    xsltWithParam(input, template) {
        for (const c of template.childNodes) {
            if (c.nodeType == DOM_ELEMENT_NODE && this.isXsltElement(c, 'with-param')) {
                this.xsltVariable(input, c, true);
            }
        }
    }

    // Orders the current node list in the input context according to the
    // sort order specified by xsl:sort child nodes of the current
    // template node. This happens before the operation specified by the
    // current template node is executed.
    //
    // TODO(mesch): case-order is not implemented.

    xsltSort(input, template) {
        const sort = [];

        for (const c of template.childNodes) {
            if (c.nodeType == DOM_ELEMENT_NODE && this.isXsltElement(c, 'sort')) {
                const select = this.xmlGetAttribute(c, 'select');
                const expr = this.xPath.xPathParse(select);
                const type = this.xmlGetAttribute(c, 'data-type') || 'text';
                const order = this.xmlGetAttribute(c, 'order') || 'ascending';
                sort.push({
                    expr,
                    type,
                    order
                });
            }
        }

        this.xPath.xPathSort(input, sort);
    }

    // Evaluates a variable or parameter and set it in the current input
    // context. Implements xsl:variable, xsl:param, and xsl:with-param.
    //
    // @param override flag that defines if the value computed here
    // overrides the one already in the input context if that is the
    // case. I.e. decides if this is a default value or a local
    // value. xsl:variable and xsl:with-param override; xsl:param doesn't.

    xsltVariable(input, template, override) {
        const name = this.xmlGetAttribute(template, 'name');
        const select = this.xmlGetAttribute(template, 'select');

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

    xsltChoose(input, template, output) {
        for (const childNode of template.childNodes) {
            if (childNode.nodeType != DOM_ELEMENT_NODE) {
                continue;
            } else if (this.isXsltElement(childNode, 'when')) {
                const test = this.xmlGetAttribute(childNode, 'test');
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

    // Implements xsl:for-each.

    xsltForEach(input, template, output) {
        const select = this.xmlGetAttribute(template, 'select');
        const nodes = this.xPath.xPathEval(select, input).nodeSetValue();
        const sortContext = input.clone(nodes[0], 0, nodes);
        this.xsltSort(sortContext, template);
        for (let i = 0; i < sortContext.contextSize(); ++i) {
            const ni = sortContext.nodelist[i];
            this.xsltChildNodes(sortContext.clone(ni, i), template, output);
        }
    }

    /**
     * Traverses the template node tree. Calls the main processing
     * function with the current input context for every child node of the
     * current template node.
     * @param input Normally the Expression Context.
     * @param template The XSL-T definition.
     * @param output The XML output.
     */
    xsltChildNodes(input: ExprContext, template: any, output: any) {
        // Clone input context to keep variables declared here local to the
        // siblings of the children.
        const context = input.clone();
        for (let i = 0; i < template.childNodes.length; ++i) {
            this.xsltProcessContext(context, template.childNodes[i], output);
        }
    }

    /**
     * Passes template text to the output. The current template node does
     * not specify an XSL-T operation and therefore is appended to the
     * output with all its attributes. Then continues traversing the
     * template node tree.
     * @param input In general the Expression Context.
     * @param template The XSLT stylesheet or transformation.
     * @param output The output.
     * @param outputDocument The output document, if the case.
     */
    xsltPassThrough(input: any, template: any, output: any, outputDocument: any) {
        if (template.nodeType == DOM_TEXT_NODE) {
            if (this.xsltPassText(template)) {
                let node = domCreateTextNode(outputDocument, template.nodeValue);
                domAppendChild(output, node);
            }
        } else if (template.nodeType == DOM_ELEMENT_NODE) {
            let node = domCreateElement(outputDocument, template.nodeName);

            for (const a of template.attributes) {
                if (a) {
                    const name = a.nodeName;
                    const value = this.xsltAttributeValue(a.nodeValue, input);
                    domSetAttribute(node, name, value);
                }
            }

            domAppendChild(output, node);
            this.xsltChildNodes(input, template, node);
        } else {
            // This applies also to the DOCUMENT_NODE of the XSL stylesheet,
            // so we don't have to treat it specially.
            this.xsltChildNodes(input, template, output);
        }
    }

    // Determines if a text node in the XSLT template document is to be
    // stripped according to XSLT whitespace stipping rules.
    //
    // See [XSLT], section 3.4.
    //
    // TODO(mesch): Whitespace stripping on the input document is
    // currently not implemented.

    xsltPassText(template: XNode) {
        if (!template.nodeValue.match(/^\s*$/)) {
            return true;
        }

        let element = template.parentNode;
        if (this.isXsltElement(element, 'text')) {
            return true;
        }

        while (element && element.nodeType == DOM_ELEMENT_NODE) {
            const xmlspace = domGetAttribute(element, 'xml:space');
            if (xmlspace) {
                if (xmlspace == 'default') {
                    return false;
                } else if (xmlspace == 'preserve') {
                    return true;
                }
            }

            element = element.parentNode;
        }

        return false;
    }

    // Evaluates an XSL-T attribute value template. Attribute value
    // templates are attributes on XSL-T elements that contain XPath
    // expressions in braces {}. The XSL-T expressions are evaluated in
    // the current input context.

    xsltAttributeValue(value, context) {
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

    // Wrapper function to access attribute values of template element
    // nodes. Currently this calls he.decode because in some DOM
    // implementations the return value of node.getAttributeValue()
    // contains unresolved XML entities, although the DOM spec requires
    // that entity references are resolved by te DOM.
    xmlGetAttribute(node: XNode, name: string) {
        // TODO(mesch): This should not be necessary if the DOM is working
        // correctly. The DOM is responsible for resolving entities, not the
        // application.
        const value = domGetAttribute(node, name);
        if (value) {
            return he.decode(value);
        }

        return value;
    }

    // Implements xsl:copy-of for node-set values of the select
    // expression. Recurses down the source node tree, which is part of
    // the input document.
    //
    // @param {Node} dst the node being copied to, part of output document,
    // @param {Node} src the node being copied, part in input document,
    // @param {Document} dstDocument

    xsltCopyOf(dst, src, dstDocument) {
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

    // Implements xsl:copy for all node types.
    //
    // @param {Node} dst the node being copied to, part of output document,
    // @param {Node} src the node being copied, part in input document,
    // @param {Document} dstDocument
    // @return {Node|Null} If an element node was created, the element
    // node. Otherwise null.

    xsltCopy(dst, src, dstDocument) {
        if (src.nodeType == DOM_ELEMENT_NODE) {
            let node = domCreateElement(dstDocument, src.nodeName);
            domAppendChild(dst, node);
            return node;
        }

        if (src.nodeType == DOM_TEXT_NODE) {
            let node = domCreateTextNode(dstDocument, src.nodeValue);
            domAppendChild(dst, node);
        } else if (src.nodeType == DOM_CDATA_SECTION_NODE) {
            let node = domCreateCDATASection(dstDocument, src.nodeValue);
            domAppendChild(dst, node);
        } else if (src.nodeType == DOM_COMMENT_NODE) {
            let node = domCreateComment(dstDocument, src.nodeValue);
            domAppendChild(dst, node);
        } else if (src.nodeType == DOM_ATTRIBUTE_NODE) {
            domSetAttribute(dst, src.nodeName, src.nodeValue);
        }

        return null;
    }

    // Evaluates an XPath expression in the current input context as a
    // match (see [XSLT] section 5.2, paragraph 1).
    xsltMatch(match: string, context: ExprContext) {
        const expr = this.xPath.xPathParse(match);

        if (expr.steps.length <= 0) {
            throw new Error("Error resolving XSLT match: Location Expression should have steps.");
        }

        const firstStep = expr.steps[0];

        // Shortcut for the most common case.
        if (
            expr.steps &&
            !expr.absolute &&
            expr.steps.length == 1 &&
            firstStep.axis == 'child' &&
            firstStep.predicate.length === 0
        ) {
            return firstStep.nodetest.evaluate(context).booleanValue();
        }

        if (expr.absolute && firstStep.axis !== 'self') {
            // TODO: `xPathCollectDescendants()`?
            const levels = match.split('/');
            if (levels.length > 1) {
                return this.absoluteXsltMatch(levels, expr, context);
            }
        }

        return this.relativeXsltMatch(expr, context);
    }

    absoluteXsltMatch(levels: string[], expr: Expression, context: ExprContext) {
        // TODO: Not sure if this logic will be needed.
        /* levels.shift();
        const filteredChildren = this.selectChildNodes(levels, [context.node]);
        if (filteredChildren.length <= 0) {
            return false;
        } */

        const result = expr.evaluate(context.clone(context.node, 0, [context.node])).nodeSetValue();
        if (result.length > 0) {
            if (result.length === 1) {
                context.node = result[0];
            }

            context.nodelist = result;
            return true;
        }
        // TODO: Not sure if this logic will be needed.
        /* for (let i = 0; i < filteredChildren.length; ++i) {
            for (let j = 0; j < result.length; ++j) {
                if (filteredChildren[i] == result[j]) {
                    return true;
                }
            }
        } */

        return false;
    }

    // TODO: Not sure if this logic will be needed.
    private selectChildNodes(levels: string[], nodes: XNode[]) {
        const currentLevel = levels.shift();
        let currentNodes = [];
        for (let node of nodes) {
            let filteredChildren = node.childNodes.filter((c) => c.nodeName === currentLevel);
            currentNodes = currentNodes.concat(filteredChildren);
        }

        if (levels.length === 0) {
            return currentNodes;
        }

        return this.selectChildNodes(levels, currentNodes);
    }

    relativeXsltMatch(expr: Expression, context: ExprContext) {
        let node = context.node;

        while (node) {
            const result = expr.evaluate(context.clone(node, 0, [node])).nodeSetValue();
            for (let i = 0; i < result.length; ++i) {
                if (result[i] == context.node) {
                    return true;
                }
            }

            node = node.parentNode;
        }

        return false;
    }

    // Test if the given element is an XSLT element, optionally the one with the given name
    isXsltElement(element: any, opt_wantedName?: string) {
        if (opt_wantedName && element.localName != opt_wantedName) return false;
        if (element.namespaceURI) return element.namespaceURI == 'http://www.w3.org/1999/XSL/Transform';
        return element.prefix == 'xsl'; // backwards compatibility with earlier versions of xslt-processor
    }
}
