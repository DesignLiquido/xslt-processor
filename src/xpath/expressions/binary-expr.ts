import { xmlValue } from "../../dom/util";
import { BooleanValue } from "../values/boolean-value";
import { NumberValue } from "../values/number-value";
import { Expression } from "./expression";

export class BinaryExpr extends Expression {
    expr1: any;
    expr2: any;
    op: any;

    constructor(expr1: any, op: any, expr2: any) {
        super();
        this.expr1 = expr1;
        this.expr2 = expr2;
        this.op = op;
    }

    evaluate(ctx) {
        let ret;
        switch (this.op.value) {
            case 'or':
                ret = new BooleanValue(
                    this.expr1.evaluate(ctx).booleanValue() || this.expr2.evaluate(ctx).booleanValue()
                );
                break;

            case 'and':
                ret = new BooleanValue(
                    this.expr1.evaluate(ctx).booleanValue() && this.expr2.evaluate(ctx).booleanValue()
                );
                break;

            case '+':
                ret = new NumberValue(this.expr1.evaluate(ctx).numberValue() + this.expr2.evaluate(ctx).numberValue());
                break;

            case '-':
                ret = new NumberValue(this.expr1.evaluate(ctx).numberValue() - this.expr2.evaluate(ctx).numberValue());
                break;

            case '*':
                ret = new NumberValue(this.expr1.evaluate(ctx).numberValue() * this.expr2.evaluate(ctx).numberValue());
                break;

            case 'mod':
                ret = new NumberValue(this.expr1.evaluate(ctx).numberValue() % this.expr2.evaluate(ctx).numberValue());
                break;

            case 'div':
                ret = new NumberValue(this.expr1.evaluate(ctx).numberValue() / this.expr2.evaluate(ctx).numberValue());
                break;

            case '=':
                ret = this.compare(ctx, (x1, x2) => x1 == x2);
                break;

            case '!=':
                ret = this.compare(ctx, (x1, x2) => x1 != x2);
                break;

            case '<':
                ret = this.compare(ctx, (x1, x2) => x1 < x2);
                break;

            case '<=':
                ret = this.compare(ctx, (x1, x2) => x1 <= x2);
                break;

            case '>':
                ret = this.compare(ctx, (x1, x2) => x1 > x2);
                break;

            case '>=':
                ret = this.compare(ctx, (x1, x2) => x1 >= x2);
                break;

            default:
                throw `BinaryExpr.evaluate: ${this.op.value}`;
        }
        return ret;
    }

    compare(ctx, cmp) {
        const v1 = this.expr1.evaluate(ctx);
        const v2 = this.expr2.evaluate(ctx);

        let ret;
        if (v1.type == 'node-set' && v2.type == 'node-set') {
            const n1 = v1.nodeSetValue();
            const n2 = v2.nodeSetValue();
            ret = false;
            for (let i1 = 0; i1 < n1.length; ++i1) {
                for (let i2 = 0; i2 < n2.length; ++i2) {
                    if (cmp(xmlValue(n1[i1]), xmlValue(n2[i2]))) {
                        ret = true;
                        // Break outer loop. Labels confuse the jscompiler and we
                        // don't use them.
                        i2 = n2.length;
                        i1 = n1.length;
                    }
                }
            }
        } else if (v1.type == 'node-set' || v2.type == 'node-set') {
            if (v1.type == 'number') {
                let s = v1.numberValue();
                let n = v2.nodeSetValue();

                ret = false;
                for (let i = 0; i < n.length; ++i) {
                    let nn = xmlValue(n[i]) - 0;
                    if (cmp(s, nn)) {
                        ret = true;
                        break;
                    }
                }
            } else if (v2.type == 'number') {
                let n = v1.nodeSetValue();
                let s = v2.numberValue();

                ret = false;
                for (let i = 0; i < n.length; ++i) {
                    let nn = xmlValue(n[i]) - 0;
                    if (cmp(nn, s)) {
                        ret = true;
                        break;
                    }
                }
            } else if (v1.type == 'string') {
                let s = v1.stringValue();
                let n = v2.nodeSetValue();

                ret = false;
                for (let i = 0; i < n.length; ++i) {
                    let nn = xmlValue(n[i]);
                    if (cmp(s, nn)) {
                        ret = true;
                        break;
                    }
                }
            } else if (v2.type == 'string') {
                let n = v1.nodeSetValue();
                let s = v2.stringValue();

                ret = false;
                for (let i = 0; i < n.length; ++i) {
                    let nn = xmlValue(n[i]);
                    if (cmp(nn, s)) {
                        ret = true;
                        break;
                    }
                }
            } else {
                ret = cmp(v1.booleanValue(), v2.booleanValue());
            }
        } else if (v1.type == 'boolean' || v2.type == 'boolean') {
            ret = cmp(v1.booleanValue(), v2.booleanValue());
        } else if (v1.type == 'number' || v2.type == 'number') {
            ret = cmp(v1.numberValue(), v2.numberValue());
        } else {
            ret = cmp(v1.stringValue(), v2.stringValue());
        }

        return new BooleanValue(ret);
    }
}
