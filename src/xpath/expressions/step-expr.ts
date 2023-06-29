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
        const input = context.nodelist[context.position];
        let nodelist = [];
        let skipNodeTest = false;

        if (this.nodetest instanceof NodeTestAny) {
            skipNodeTest = true;
        }

        if (this.axis == xpathAxis.ANCESTOR_OR_SELF) {
            nodelist.push(input);
            for (let n = input.parentNode; n; n = n.parentNode) {
                nodelist.push(n);
            }
        } else if (this.axis == xpathAxis.ANCESTOR) {
            for (let n = input.parentNode; n; n = n.parentNode) {
                nodelist.push(n);
            }
        } else if (this.axis == xpathAxis.ATTRIBUTE) {
            if (this.nodetest.name != undefined) {
                // single-attribute step
                if (input.attributes) {
                    if (input.attributes instanceof Array) {
                        // probably evaluating on document created by xmlParse()
                        copyArray(nodelist, input.attributes);
                    } else {
                        if (this.nodetest.name == 'style') {
                            const value = input.getAttributeValue('style');
                            if (value && typeof value != 'string') {
                                // this is the case where indexing into the attributes array
                                // doesn't give us the attribute node in IE - we create our own
                                // node instead
                                nodelist.push(XNode.create(DOM_ATTRIBUTE_NODE, 'style', value.cssText, document));
                            } else {
                                nodelist.push(input.attributes[this.nodetest.name]);
                            }
                        } else {
                            nodelist.push(input.attributes[this.nodetest.name]);
                        }
                    }
                }
            } else {
                // all-attributes step
                if (context.ignoreAttributesWithoutValue) {
                    copyArrayIgnoringAttributesWithoutValue(nodelist, input.attributes);
                } else {
                    copyArray(nodelist, input.attributes);
                }
            }
        } else if (this.axis == xpathAxis.CHILD) {
            copyArray(nodelist, input.childNodes);
        } else if (this.axis == xpathAxis.DESCENDANT_OR_SELF) {
            if (this.nodetest.evaluate(context).booleanValue()) {
                nodelist.push(input);
            }
            let tagName = this.xPath.xPathExtractTagNameFromNodeTest(this.nodetest, context.ignoreNonElementNodesForNTA);
            this.xPath.xPathCollectDescendants(nodelist, input, tagName);
            if (tagName) skipNodeTest = true;
        } else if (this.axis == xpathAxis.DESCENDANT) {
            let tagName = this.xPath.xPathExtractTagNameFromNodeTest(this.nodetest, context.ignoreNonElementNodesForNTA);
            this.xPath.xPathCollectDescendants(nodelist, input, tagName);
            if (tagName) skipNodeTest = true;
        } else if (this.axis == xpathAxis.FOLLOWING) {
            for (let n = input; n; n = n.parentNode) {
                for (let nn = n.nextSibling; nn; nn = nn.nextSibling) {
                    nodelist.push(nn);
                    this.xPath.xPathCollectDescendants(nodelist, nn);
                }
            }
        } else if (this.axis == xpathAxis.FOLLOWING_SIBLING) {
            for (let n = input.nextSibling; n; n = n.nextSibling) {
                nodelist.push(n);
            }
        } else if (this.axis == xpathAxis.NAMESPACE) {
            throw 'not implemented: axis namespace';
        } else if (this.axis == xpathAxis.PARENT) {
            if (input.parentNode) {
                nodelist.push(input.parentNode);
            }
        } else if (this.axis == xpathAxis.PRECEDING) {
            for (let n = input; n; n = n.parentNode) {
                for (let nn = n.previousSibling; nn; nn = nn.previousSibling) {
                    nodelist.push(nn);
                    this.xPath.xPathCollectDescendantsReverse(nodelist, nn);
                }
            }
        } else if (this.axis == xpathAxis.PRECEDING_SIBLING) {
            for (let n = input.previousSibling; n; n = n.previousSibling) {
                nodelist.push(n);
            }
        } else if (this.axis == xpathAxis.SELF) {
            nodelist.push(input);
        } else {
            throw `ERROR -- NO SUCH AXIS: ${this.axis}`;
        }

        if (!skipNodeTest) {
            // process node test
            let nodelist0 = nodelist;
            nodelist = [];
            for (let i = 0; i < nodelist0.length; ++i) {
                if (this.nodetest.evaluate(context.clone(nodelist0, i)).booleanValue()) {
                    nodelist.push(nodelist0[i]);
                }
            }
        }

        // process predicates
        if (!context.returnOnFirstMatch) {
            for (let i = 0; i < this.predicate.length; ++i) {
                let nodelist0 = nodelist;
                nodelist = [];
                for (let ii = 0; ii < nodelist0.length; ++ii) {
                    let n = nodelist0[ii];
                    if (this.predicate[i].evaluate(context.clone(nodelist0, ii)).booleanValue()) {
                        nodelist.push(n);
                    }
                }
            }
        }

        return new NodeSetValue(nodelist);
    }
}
