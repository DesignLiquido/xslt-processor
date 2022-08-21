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
import he from "he"

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
    domCreateDocumentFragment
} from "./util.js"
import {
    xpathParse,
    ExprContext,
    StringValue,
    NodeSetValue,
    xpathSort,
    xpathEval
} from "./xpath.js"
import {
    XDocument,
    DOM_DOCUMENT_NODE,
    DOM_DOCUMENT_FRAGMENT_NODE,
    DOM_CDATA_SECTION_NODE,
    DOM_ELEMENT_NODE,
    DOM_TEXT_NODE,
    DOM_COMMENT_NODE,
    DOM_ATTRIBUTE_NODE
} from "./dom.js"

// The exported entry point of the XSL-T processor, as explained
// above.
//
// @param xmlDoc The input document root, as DOM node.
// @param template The stylesheet document root, as DOM node.
// @return the processed document, as XML text in a string.
export function xsltProcess(xmlDoc, stylesheet,parameters) {
    const output = domCreateDocumentFragment(new XDocument);
    const expressionContext = new ExprContext(xmlDoc);
    if(parameters && typeof(parameters)==='object') {
        for (const [key, value] of Object.entries(parameters)) {
           expressionContext.setVariable(key,new StringValue(value));
          }
    }
    expressionContext.setVariable()
    xsltProcessContext(expressionContext, stylesheet, output,parameters);
    const ret = xmlText(output);
    return ret;
}

// The main entry point of the XSL-T processor, as explained above.
//
// @param input The input document root, as XPath ExprContext.
// @param template The stylesheet document root, as DOM node.
// @param the root of the generated output, as DOM node.

function xsltProcessContext(input, template, output, _parameters) {
    const outputDocument = xmlOwnerDocument(output);

    const nodename = template.nodeName.split(/:/);
    if (nodename.length == 1 || nodename[0] != 'xsl') {
        xsltPassThrough(input, template, output, outputDocument);
    } else {
        let name, top, nameexpr, node, select, value, nodes, sortContext, mode, templates, paramContext, commentData, commentNode, test, match, text;
        switch (nodename[1]) {
            case 'apply-imports':
                throw(`not implemented: ${nodename[1]}`);
            case 'apply-templates':
                select = xmlGetAttribute(template, 'select');
                if (select) {
                    nodes = xpathEval(select, input).nodeSetValue();
                } else {
                    nodes = input.node.childNodes;
                }

                sortContext = input.clone(nodes[0], 0, nodes);
                xsltWithParam(sortContext, template);
                xsltSort(sortContext, template);

                mode = xmlGetAttribute(template, 'mode');
                top = template.ownerDocument.documentElement;
                templates = [];
                for (let i = 0; i < top.childNodes.length; ++i) {
                    let c = top.childNodes[i];
                    if (c.nodeType == DOM_ELEMENT_NODE &&
                        c.nodeName == 'xsl:template' &&
                        (!mode || c.getAttribute('mode') == mode)
                    ) {
                        templates.push(c);
                    }
                }
                for (let j = 0; j < sortContext.contextSize(); ++j) {
                    const nj = sortContext.nodelist[j];
                    for (let i = 0; i < templates.length; ++i) {
                        xsltProcessContext(sortContext.clone(nj, j), templates[i], output);
                    }
                }
                break;
            case 'attribute':
                nameexpr = xmlGetAttribute(template, 'name');
                name = xsltAttributeValue(nameexpr, input);
                node = domCreateDocumentFragment(outputDocument);
                xsltChildNodes(input, template, node);
                value = xmlValue(node);
                domSetAttribute(output, name, value);
                break;
            case 'attribute-set':
                throw(`not implemented: ${nodename[1]}`);
            case 'call-template':
                name = xmlGetAttribute(template, 'name');
                top = template.ownerDocument.documentElement;

                paramContext = input.clone();
                xsltWithParam(paramContext, template);

                for (let i = 0; i < top.childNodes.length; ++i) {
                    let c = top.childNodes[i];
                    if (c.nodeType == DOM_ELEMENT_NODE &&
                        c.nodeName == 'xsl:template' &&
                        domGetAttribute(c, 'name') == name) {
                        xsltChildNodes(paramContext, c, output);
                        break;
                    }
                }
                break;
            case 'choose':
                xsltChoose(input, template, output);
                break;
            case 'comment':
                node = domCreateDocumentFragment(outputDocument);
                xsltChildNodes(input, template, node);
                commentData = xmlValue(node);
                commentNode = domCreateComment(outputDocument, commentData);
                output.appendChild(commentNode);
                break;
            case 'copy':
                node = xsltCopy(output, input.node, outputDocument);
                if (node) {
                    xsltChildNodes(input, template, node);
                }
                break;
            case 'copy-of':
                select = xmlGetAttribute(template, 'select');
                value = xpathEval(select, input);
                if (value.type == 'node-set') {
                    nodes = value.nodeSetValue();
                    for (let i = 0; i < nodes.length; ++i) {
                        xsltCopyOf(output, nodes[i], outputDocument);
                    }

                } else {
                    let node = domCreateTextNode(outputDocument, value.stringValue());
                    domAppendChild(output, node);
                }
                break;
            case 'decimal-format':
                throw(`not implemented: ${nodename[1]}`);
            case 'element':
                nameexpr = xmlGetAttribute(template, 'name');
                name = xsltAttributeValue(nameexpr, input);
                node = domCreateElement(outputDocument, name);
                domAppendChild(output, node);
                xsltChildNodes(input, template, node);
                break;
            case 'fallback':
                throw(`not implemented: ${nodename[1]}`);
            case 'for-each':
                xsltForEach(input, template, output);
                break;
            case 'if':
                test = xmlGetAttribute(template, 'test');
                if (xpathEval(test, input).booleanValue()) {
                    xsltChildNodes(input, template, output);
                }
                break;
            case 'import':
                throw(`not implemented: ${nodename[1]}`);
            case 'include':
                throw(`not implemented: ${nodename[1]}`);
            case 'key':
                throw(`not implemented: ${nodename[1]}`);
            case 'message':
                throw(`not implemented: ${nodename[1]}`);
            case 'namespace-alias':
                throw(`not implemented: ${nodename[1]}`);
            case 'number':
                throw(`not implemented: ${nodename[1]}`);
            case 'otherwise':
                throw(`error if here: ${nodename[1]}`);
            case 'output':
                // Ignored. -- Since we operate on the DOM, and all further use
                // of the output of the XSL transformation is determined by the
                // browser that we run in, this parameter is not applicable to
                // this implementation.
                break;
            case 'preserve-space':
                throw(`not implemented: ${nodename[1]}`);
            case 'processing-instruction':
                throw(`not implemented: ${nodename[1]}`);
            case 'sort':
                // just ignore -- was handled by xsltSort()
                break;
            case 'strip-space':
                throw(`not implemented: ${nodename[1]}`);
            case 'stylesheet':
            case 'transform':
                xsltChildNodes(input, template, output);
                break;
            case 'template':
                match = xmlGetAttribute(template, 'match');
                if (match && xsltMatch(match, input)) {
                    xsltChildNodes(input, template, output);
                }
                break;
            case 'text':
                text = xmlValue(template);
                node = domCreateTextNode(outputDocument, text);
                output.appendChild(node);
                break;
            case 'value-of':
                select = xmlGetAttribute(template, 'select');
                value = xpathEval(select, input).stringValue();
                node = domCreateTextNode(outputDocument, value);
                output.appendChild(node);
                break;
            case 'param':
                xsltVariable(input, template, false);
                break;
            case 'variable':
                xsltVariable(input, template, true);
                break;
            case 'when':
                throw(`error if here: ${nodename[1]}`);
            case 'with-param':
                throw(`error if here: ${nodename[1]}`);
            default:
                throw(`error if here: ${nodename[1]}`);
        }
    }
}


// Sets parameters defined by xsl:with-param child nodes of the
// current template node, in the current input context. This happens
// before the operation specified by the current template node is
// executed.

function xsltWithParam(input, template) {
    for (const c of template.childNodes) {
        if (c.nodeType == DOM_ELEMENT_NODE && c.nodeName == 'xsl:with-param') {
            xsltVariable(input, c, true);
        }
    }
}


// Orders the current node list in the input context according to the
// sort order specified by xsl:sort child nodes of the current
// template node. This happens before the operation specified by the
// current template node is executed.
//
// TODO(mesch): case-order is not implemented.

function xsltSort(input, template) {
    const sort = [];

    for (const c of template.childNodes) {
        if (c.nodeType == DOM_ELEMENT_NODE && c.nodeName == 'xsl:sort') {
            const select = xmlGetAttribute(c, 'select');
            const expr = xpathParse(select);
            const type = xmlGetAttribute(c, 'data-type') || 'text';
            const order = xmlGetAttribute(c, 'order') || 'ascending';
            sort.push({
                expr,
                type,
                order
            });
        }
    }

    xpathSort(input, sort);
}


// Evaluates a variable or parameter and set it in the current input
// context. Implements xsl:variable, xsl:param, and xsl:with-param.
//
// @param override flag that defines if the value computed here
// overrides the one already in the input context if that is the
// case. I.e. decides if this is a default value or a local
// value. xsl:variable and xsl:with-param override; xsl:param doesn't.

function xsltVariable(input, template, override) {
    const name = xmlGetAttribute(template, 'name');
    const select = xmlGetAttribute(template, 'select');

    let value;

    if (template.childNodes.length > 0) {
        const root = domCreateDocumentFragment(template.ownerDocument);
        xsltChildNodes(input, template, root);
        value = new NodeSetValue([root]);

    } else if (select) {
        value = xpathEval(select, input);

    } else {
        value = new StringValue('');
    }

    if (override || !input.getVariable(name)) {
        input.setVariable(name, value);
    }
}


// Implements xsl:chose and its child nodes xsl:when and
// xsl:otherwise.

function xsltChoose(input, template, output) {
    for (const childNode of template.childNodes) {
        if (childNode.nodeType != DOM_ELEMENT_NODE) {
            continue;

        } else if (childNode.nodeName == 'xsl:when') {
            const test = xmlGetAttribute(childNode, 'test');
            if (xpathEval(test, input).booleanValue()) {
                xsltChildNodes(input, childNode, output);
                break;
            }

        } else if (childNode.nodeName == 'xsl:otherwise') {
            xsltChildNodes(input, childNode, output);
            break;
        }
    }
}


// Implements xsl:for-each.

function xsltForEach(input, template, output) {
    const select = xmlGetAttribute(template, 'select');
    const nodes = xpathEval(select, input).nodeSetValue();
    const sortContext = input.clone(nodes[0], 0, nodes);
    xsltSort(sortContext, template);
    for (let i = 0; i < sortContext.contextSize(); ++i) {
        const ni = sortContext.nodelist[i];
        xsltChildNodes(sortContext.clone(ni, i), template, output);
    }
}


// Traverses the template node tree. Calls the main processing
// function with the current input context for every child node of the
// current template node.

function xsltChildNodes(input, template, output) {
    // Clone input context to keep variables declared here local to the
    // siblings of the children.
    const context = input.clone();
    for (let i = 0; i < template.childNodes.length; ++i) {
        xsltProcessContext(context, template.childNodes[i], output);
    }
}


// Passes template text to the output. The current template node does
// not specify an XSL-T operation and therefore is appended to the
// output with all its attributes. Then continues traversing the
// template node tree.

function xsltPassThrough(input, template, output, outputDocument) {
    if (template.nodeType == DOM_TEXT_NODE) {
        if (xsltPassText(template)) {
            let node = domCreateTextNode(outputDocument, template.nodeValue);
            domAppendChild(output, node);
        }

    } else if (template.nodeType == DOM_ELEMENT_NODE) {
        let node = domCreateElement(outputDocument, template.nodeName);

        for (const a of template.attributes) {
            if (a) {
                const name = a.nodeName;
                const value = xsltAttributeValue(a.nodeValue, input);
                domSetAttribute(node, name, value);
            }
        }

        domAppendChild(output, node);
        xsltChildNodes(input, template, node);
    } else {
        // This applies also to the DOCUMENT_NODE of the XSL stylesheet,
        // so we don't have to treat it specially.
        xsltChildNodes(input, template, output);
    }
}

// Determines if a text node in the XSLT template document is to be
// stripped according to XSLT whitespace stipping rules.
//
// See [XSLT], section 3.4.
//
// TODO(mesch): Whitespace stripping on the input document is
// currently not implemented.

function xsltPassText(template) {
    if (!template.nodeValue.match(/^\s*$/)) {
        return true;
    }

    let element = template.parentNode;
    if (element.nodeName == 'xsl:text') {
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

function xsltAttributeValue(value, context) {
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

        const val = xpathEval(rp[0], context).stringValue();
        ret += val + rp[1];
    }

    return ret;
}


// Wrapper function to access attribute values of template element
// nodes. Currently this calls he.decode because in some DOM
// implementations the return value of node.getAttributeValue()
// contains unresolved XML entities, although the DOM spec requires
// that entity references are resolved by te DOM.
function xmlGetAttribute(node, name) {
    // TODO(mesch): This should not be necessary if the DOM is working
    // correctly. The DOM is responsible for resolving entities, not the
    // application.
    const value = domGetAttribute(node, name);
    if (value) {
        return he.decode(value);
    } else {
        return value;
    }
}


// Implements xsl:copy-of for node-set values of the select
// expression. Recurses down the source node tree, which is part of
// the input document.
//
// @param {Node} dst the node being copied to, part of output document,
// @param {Node} src the node being copied, part in input document,
// @param {Document} dstDocument

function xsltCopyOf(dst, src, dstDocument) {
    if (src.nodeType == DOM_DOCUMENT_FRAGMENT_NODE ||
        src.nodeType == DOM_DOCUMENT_NODE) {
        for (let i = 0; i < src.childNodes.length; ++i) {
            xsltCopyOf(dst, src.childNodes[i], dstDocument);
        }
    } else {
        const node = xsltCopy(dst, src, dstDocument);
        if (node) {
            // This was an element node -- recurse to attributes and
            // children.
            for (let i = 0; i < src.attributes.length; ++i) {
                xsltCopyOf(node, src.attributes[i], dstDocument);
            }

            for (let i = 0; i < src.childNodes.length; ++i) {
                xsltCopyOf(node, src.childNodes[i], dstDocument);
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

function xsltCopy(dst, src, dstDocument) {
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
function xsltMatch(match, context) {
    const expr = xpathParse(match);
    let ret;
    // Shortcut for the most common case.
    if (expr.steps && !expr.absolute && expr.steps.length == 1 &&
        expr.steps[0].axis == 'child' && expr.steps[0].predicate.length == 0) {
        ret = expr.steps[0].nodetest.evaluate(context).booleanValue();

    } else {

        ret = false;
        let node = context.node;

        while (!ret && node) {
            const result = expr.evaluate(context.clone(node, 0, [node])).nodeSetValue();
            for (let i = 0; i < result.length; ++i) {
                if (result[i] == context.node) {
                    ret = true;
                    break;
                }
            }
            node = node.parentNode;
        }
    }
    return ret;
}
