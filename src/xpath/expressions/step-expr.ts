import { DOM_ATTRIBUTE_NODE } from '../../constants';
import { XNode } from '../../dom';
import { ExprContext } from '../expr-context';
import { NodeSetValue } from '../values/node-set-value';
import { NodeTestAny } from '../node-tests/node-test-any';
import { xPathAxis } from '../tokens';
import { Expression } from './expression';
import { XPath } from '../xpath';
import { BinaryExpr } from './binary-expr';
import { FunctionCallExpr } from './function-call-expr';
import { NumberExpr } from './number-expr';
import { UnaryMinusExpr } from './unary-minus-expr';
import { copyArray, copyArrayIgnoringAttributesWithoutValue } from '../common-function';
import { PredicateExpr } from './predicate-expr';

export class StepExpr extends Expression {
    axis: any;
    nodeTest: any;
    predicate: any;
    hasPositionalPredicate: any;
    xPath: XPath;

    constructor(axis: any, nodeTest: any, xPath: XPath, opt_predicate?: any) {
        super();
        this.axis = axis;
        this.nodeTest = nodeTest;
        this.predicate = opt_predicate || [];
        this.hasPositionalPredicate = false;
        this.xPath = xPath;

        for (let i = 0; i < this.predicate.length; ++i) {
            if (this.predicateExprHasPositionalSelector(this.predicate[i].expr)) {
                this.hasPositionalPredicate = true;
                break;
            }
        }
    }

    /**
     * Determines whether a predicate expression contains a "positional selector".
     * A positional selector filters nodes from the nodeList input based on their
     * position within that list. When such selectors are encountered, the
     * evaluation of the predicate cannot be depth-first, because the positional
     * selector may be based on the result of evaluating predicates that precede
     * it.
     */
    private predicateExprHasPositionalSelector(expr: Expression, isRecursiveCall?: any) {
        if (!expr) {
            return false;
        }
        if (!isRecursiveCall && this.exprReturnsNumberValue(expr)) {
            // this is a "proximity position"-based predicate
            return true;
        }
        if (expr instanceof FunctionCallExpr) {
            const value = (expr as any).name.value;
            return value == 'last' || value == 'position';
        }
        if (expr instanceof BinaryExpr) {
            return (
                this.predicateExprHasPositionalSelector(expr.expr1, true) ||
                this.predicateExprHasPositionalSelector(expr.expr2, true)
            );
        }
        return false;
    }

    private exprReturnsNumberValue(expr) {
        if (expr instanceof FunctionCallExpr) {
            let isMember = {
                last: true,
                position: true,
                count: true,
                'string-length': true,
                number: true,
                sum: true,
                floor: true,
                ceiling: true,
                round: true
            };
            return isMember[(expr as any).name.value];
        }

        if (expr instanceof UnaryMinusExpr) {
            return true;
        }

        if (expr instanceof BinaryExpr) {
            let isMember = {
                '+': true,
                '-': true,
                '*': true,
                mod: true,
                div: true
            };
            return isMember[expr.op.value];
        }

        if (expr instanceof NumberExpr) {
            return true;
        }

        return false;
    }

    appendPredicate(predicateExpression: PredicateExpr) {
        this.predicate.push(predicateExpression);
        if (!this.hasPositionalPredicate) {
            this.hasPositionalPredicate = this.predicateExprHasPositionalSelector(predicateExpression.expression);
        }
    }

    evaluate(context: ExprContext) {
        const node = context.nodeList[context.position];
        let nodeList = [];
        let skipNodeTest = false;

        if (this.nodeTest instanceof NodeTestAny) {
            skipNodeTest = true;
        }

        switch (this.axis) {
            case xPathAxis.ANCESTOR_OR_SELF:
                nodeList.push(node);
                for (let n = node.parentNode; n; n = n.parentNode) {
                    if (n.nodeType !== DOM_ATTRIBUTE_NODE) {
                        nodeList.push(n);
                    }
                }
                break;

            case xPathAxis.ANCESTOR:
                for (let n = node.parentNode; n; n = n.parentNode) {
                    if (n.nodeType !== DOM_ATTRIBUTE_NODE) {
                        nodeList.push(n);
                    }
                }
                break;

            case xPathAxis.ATTRIBUTE:
                const attributes = node.childNodes.filter(n => n.nodeType === DOM_ATTRIBUTE_NODE);
                if (this.nodeTest.name !== undefined) {
                    // single-attribute step
                    if (attributes) {
                        if (attributes instanceof Array) {
                            // probably evaluating on document created by xmlParse()
                            copyArray(nodeList, attributes);
                        } else {
                            // TODO: I think this `else` does't make any sense now.
                            // Before unifying attributes with child nodes, `node.attributes` was always an array.
                            if (this.nodeTest.name == 'style') {
                                const value = node.getAttributeValue('style');
                                if (value && typeof value != 'string') {
                                    // this is the case where indexing into the attributes array
                                    // doesn't give us the attribute node in IE - we create our own
                                    // node instead
                                    nodeList.push(XNode.create(DOM_ATTRIBUTE_NODE, 'style', value.cssText, document));
                                } else {
                                    nodeList.push(attributes[this.nodeTest.name]);
                                }
                            } else {
                                nodeList.push(attributes[this.nodeTest.name]);
                            }
                        }
                    }
                } else {
                    // all-attributes step
                    if (context.ignoreAttributesWithoutValue) {
                        copyArrayIgnoringAttributesWithoutValue(nodeList, attributes);
                    } else {
                        copyArray(nodeList, attributes);
                    }
                }

                break;

            case xPathAxis.CHILD:
                copyArray(nodeList, node.childNodes.filter(n => n.nodeType !== DOM_ATTRIBUTE_NODE));
                break;

            case xPathAxis.DESCENDANT_OR_SELF: {
                if (this.nodeTest.evaluate(context).booleanValue()) {
                    nodeList.push(node);
                }

                let tagName = this.xPath.xPathExtractTagNameFromNodeTest(
                    this.nodeTest,
                    context.ignoreNonElementNodesForNTA
                );

                this.xPath.xPathCollectDescendants(nodeList, node, tagName);
                if (tagName) skipNodeTest = true;

                break;
            }

            case xPathAxis.DESCENDANT: {
                let tagName = this.xPath.xPathExtractTagNameFromNodeTest(
                    this.nodeTest,
                    context.ignoreNonElementNodesForNTA
                );
                this.xPath.xPathCollectDescendants(nodeList, node, tagName);
                if (tagName) skipNodeTest = true;

                break;
            }

            case xPathAxis.FOLLOWING:
                for (let n = node; n; n = n.parentNode) {
                    for (let nn = n.nextSibling; nn; nn = nn.nextSibling) {
                        if (nn.nodeType !== DOM_ATTRIBUTE_NODE) {
                            nodeList.push(nn);
                        }

                        this.xPath.xPathCollectDescendants(nodeList, nn);
                    }
                }

                break;

            case xPathAxis.FOLLOWING_SIBLING:
                if (node.nodeType === DOM_ATTRIBUTE_NODE) {
                    break;
                }

                for (let n = node.nextSibling; n; n = n.nextSibling) {
                    if (n.nodeType !== DOM_ATTRIBUTE_NODE) {
                        nodeList.push(n);
                    }
                }

                break;

            case xPathAxis.NAMESPACE:
                throw new Error('not implemented: axis namespace');

            case xPathAxis.PARENT:
                if (node.parentNode) {
                    nodeList.push(node.parentNode);
                }

                break;

            case xPathAxis.PRECEDING:
                for (let n = node; n; n = n.parentNode) {
                    for (let nn = n.previousSibling; nn; nn = nn.previousSibling) {
                        if (nn.nodeType !== DOM_ATTRIBUTE_NODE) {
                            nodeList.push(nn);
                        }

                        this.xPath.xPathCollectDescendantsReverse(nodeList, nn);
                    }
                }

                break;

            case xPathAxis.PRECEDING_SIBLING:
                for (let n = node.previousSibling; n; n = n.previousSibling) {
                    if (n.nodeType !== DOM_ATTRIBUTE_NODE) {
                        nodeList.push(n);
                    }
                }

                break;

            case xPathAxis.SELF:
                nodeList.push(node);
                break;

            case xPathAxis.SELF_AND_SIBLINGS:
                for (const node of context.nodeList) {
                    if (node.nodeType !== DOM_ATTRIBUTE_NODE) {
                        nodeList.push(node);
                    }
                }

                break;

            default:
                throw new Error(`ERROR -- NO SUCH AXIS: ${this.axis}`);
        }

        if (!skipNodeTest) {
            // process node test
            let nodeList0 = nodeList;
            nodeList = [];
            for (let i = 0; i < nodeList0.length; ++i) {
                if (this.nodeTest.evaluate(context.clone(nodeList0, undefined, i)).booleanValue()) {
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
                    if (this.predicate[i].evaluate(context.clone(nodeList0, undefined, ii)).booleanValue()) {
                        nodeList.push(n);
                    }
                }
            }
        }

        return new NodeSetValue(nodeList);
    }
}
