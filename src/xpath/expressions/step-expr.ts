import { DOM_ATTRIBUTE_NODE } from "../../constants";
import { XNode } from "../../dom";
import { copyArray, copyArrayIgnoringAttributesWithoutValue, predicateExprHasPositionalSelector } from "../../dom/util";
import { ExprContext } from "../expr-context";
import { NodeSetValue } from "../values/node-set-value";
import { NodeTestAny } from "../node-test-any";
import { xpathAxis } from "../tokens";
import { Expression } from "./expression";
import { XPath } from "../xpath";

export class StepExpr extends Expression {
    axis: any;
    nodetest: any;
    predicate: any;
    hasPositionalPredicate: any;
    xPath: XPath;

    constructor(axis: any, nodetest: any, xPath: XPath, opt_predicate?: any) {
        super();
        this.axis = axis;
        this.nodetest = nodetest;
        this.predicate = opt_predicate || [];
        this.hasPositionalPredicate = false;
        this.xPath = xPath;

        for (let i = 0; i < this.predicate.length; ++i) {
            if (predicateExprHasPositionalSelector(this.predicate[i].expr)) {
                this.hasPositionalPredicate = true;
                break;
            }
        }
    }

    appendPredicate(p) {
        this.predicate.push(p);
        if (!this.hasPositionalPredicate) {
            this.hasPositionalPredicate = predicateExprHasPositionalSelector(p.expr);
        }
    }

    evaluate(context: ExprContext) {
        const input = context.nodeList[context.position];
        let nodeList = [];
        let skipNodeTest = false;

        if (this.nodetest instanceof NodeTestAny) {
            skipNodeTest = true;
        }

        if (this.axis == xpathAxis.ANCESTOR_OR_SELF) {
            nodeList.push(input);
            for (let n = input.parentNode; n; n = n.parentNode) {
                nodeList.push(n);
            }
        } else if (this.axis == xpathAxis.ANCESTOR) {
            for (let n = input.parentNode; n; n = n.parentNode) {
                nodeList.push(n);
            }
        } else if (this.axis == xpathAxis.ATTRIBUTE) {
            if (this.nodetest.name != undefined) {
                // single-attribute step
                if (input.attributes) {
                    if (input.attributes instanceof Array) {
                        // probably evaluating on document created by xmlParse()
                        copyArray(nodeList, input.attributes);
                    } else {
                        if (this.nodetest.name == 'style') {
                            const value = input.getAttributeValue('style');
                            if (value && typeof value != 'string') {
                                // this is the case where indexing into the attributes array
                                // doesn't give us the attribute node in IE - we create our own
                                // node instead
                                nodeList.push(XNode.create(DOM_ATTRIBUTE_NODE, 'style', value.cssText, document));
                            } else {
                                nodeList.push(input.attributes[this.nodetest.name]);
                            }
                        } else {
                            nodeList.push(input.attributes[this.nodetest.name]);
                        }
                    }
                }
            } else {
                // all-attributes step
                if (context.ignoreAttributesWithoutValue) {
                    copyArrayIgnoringAttributesWithoutValue(nodeList, input.attributes);
                } else {
                    copyArray(nodeList, input.attributes);
                }
            }
        } else if (this.axis == xpathAxis.CHILD) {
            copyArray(nodeList, input.childNodes);
        } else if (this.axis == xpathAxis.DESCENDANT_OR_SELF) {
            if (this.nodetest.evaluate(context).booleanValue()) {
                nodeList.push(input);
            }
            let tagName = this.xPath.xPathExtractTagNameFromNodeTest(this.nodetest, context.ignoreNonElementNodesForNTA);
            this.xPath.xPathCollectDescendants(nodeList, input, tagName);
            if (tagName) skipNodeTest = true;
        } else if (this.axis == xpathAxis.DESCENDANT) {
            let tagName = this.xPath.xPathExtractTagNameFromNodeTest(this.nodetest, context.ignoreNonElementNodesForNTA);
            this.xPath.xPathCollectDescendants(nodeList, input, tagName);
            if (tagName) skipNodeTest = true;
        } else if (this.axis == xpathAxis.FOLLOWING) {
            for (let n = input; n; n = n.parentNode) {
                for (let nn = n.nextSibling; nn; nn = nn.nextSibling) {
                    nodeList.push(nn);
                    this.xPath.xPathCollectDescendants(nodeList, nn);
                }
            }
        } else if (this.axis == xpathAxis.FOLLOWING_SIBLING) {
            for (let n = input.nextSibling; n; n = n.nextSibling) {
                nodeList.push(n);
            }
        } else if (this.axis == xpathAxis.NAMESPACE) {
            throw new Error('not implemented: axis namespace');
        } else if (this.axis == xpathAxis.PARENT) {
            if (input.parentNode) {
                nodeList.push(input.parentNode);
            }
        } else if (this.axis == xpathAxis.PRECEDING) {
            for (let n = input; n; n = n.parentNode) {
                for (let nn = n.previousSibling; nn; nn = nn.previousSibling) {
                    nodeList.push(nn);
                    this.xPath.xPathCollectDescendantsReverse(nodeList, nn);
                }
            }
        } else if (this.axis == xpathAxis.PRECEDING_SIBLING) {
            for (let n = input.previousSibling; n; n = n.previousSibling) {
                nodeList.push(n);
            }
        } else if (this.axis == xpathAxis.SELF) {
            nodeList.push(input);
        } else {
            throw `ERROR -- NO SUCH AXIS: ${this.axis}`;
        }

        if (!skipNodeTest) {
            // process node test
            let nodeList0 = nodeList;
            nodeList = [];
            for (let i = 0; i < nodeList0.length; ++i) {
                if (this.nodetest.evaluate(context.clone(nodeList0, i)).booleanValue()) {
                    nodeList.push(nodeList0[i]);
                }
            }
        }

        // process predicates
        if (!context.returnOnFirstMatch) {
            for (let i = 0; i < this.predicate.length; ++i) {
                let nodeList0 = nodeList;
                nodeList = [];
                for (let ii = 0; ii < nodeList0.length; ++ii) {
                    let n = nodeList0[ii];
                    if (this.predicate[i].evaluate(context.clone(nodeList0, ii)).booleanValue()) {
                        nodeList.push(n);
                    }
                }
            }
        }

        return new NodeSetValue(nodeList);
    }
}
