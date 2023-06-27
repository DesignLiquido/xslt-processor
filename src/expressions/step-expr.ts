import { DOM_ATTRIBUTE_NODE } from "../constants";
import { XNode } from "../dom";
import { copyArray, copyArrayIgnoringAttributesWithoutValue, predicateExprHasPositionalSelector } from "../dom/util";
import { ExprContext } from "../xpath/expr-context";
import { xpathCollectDescendants, xpathCollectDescendantsReverse, xpathExtractTagNameFromNodeTest } from "../xpath/functions";
import { NodeSetValue } from "../xpath/node-set-value";
import { NodeTestAny } from "../xpath/node-test-any";
import { xpathAxis } from "../xpath/tokens";
import { Expression } from "./expression";

export class StepExpr extends Expression {
    axis: any;
    nodetest: any;
    predicate: any;
    hasPositionalPredicate: any;

    constructor(axis: any, nodetest: any, opt_predicate?: any) {
        super();
        this.axis = axis;
        this.nodetest = nodetest;
        this.predicate = opt_predicate || [];
        this.hasPositionalPredicate = false;
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

    evaluate(ctx: ExprContext) {
        const input = ctx.node;
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
                            const value = input.getAttribute('style');
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
                if (ctx.ignoreAttributesWithoutValue) {
                    copyArrayIgnoringAttributesWithoutValue(nodelist, input.attributes);
                } else {
                    copyArray(nodelist, input.attributes);
                }
            }
        } else if (this.axis == xpathAxis.CHILD) {
            copyArray(nodelist, input.childNodes);
        } else if (this.axis == xpathAxis.DESCENDANT_OR_SELF) {
            if (this.nodetest.evaluate(ctx).booleanValue()) {
                nodelist.push(input);
            }
            let tagName = xpathExtractTagNameFromNodeTest(this.nodetest, ctx.ignoreNonElementNodesForNTA);
            xpathCollectDescendants(nodelist, input, tagName);
            if (tagName) skipNodeTest = true;
        } else if (this.axis == xpathAxis.DESCENDANT) {
            let tagName = xpathExtractTagNameFromNodeTest(this.nodetest, ctx.ignoreNonElementNodesForNTA);
            xpathCollectDescendants(nodelist, input, tagName);
            if (tagName) skipNodeTest = true;
        } else if (this.axis == xpathAxis.FOLLOWING) {
            for (let n = input; n; n = n.parentNode) {
                for (let nn = n.nextSibling; nn; nn = nn.nextSibling) {
                    nodelist.push(nn);
                    xpathCollectDescendants(nodelist, nn);
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
                    xpathCollectDescendantsReverse(nodelist, nn);
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
                let n = nodelist0[i];
                if (this.nodetest.evaluate(ctx.clone(n, i, nodelist0)).booleanValue()) {
                    nodelist.push(n);
                }
            }
        }

        // process predicates
        if (!ctx.returnOnFirstMatch) {
            for (let i = 0; i < this.predicate.length; ++i) {
                let nodelist0 = nodelist;
                nodelist = [];
                for (let ii = 0; ii < nodelist0.length; ++ii) {
                    let n = nodelist0[ii];
                    if (this.predicate[i].evaluate(ctx.clone(n, ii, nodelist0)).booleanValue()) {
                        nodelist.push(n);
                    }
                }
            }
        }

        return new NodeSetValue(nodelist);
    }
}
