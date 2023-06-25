// XPath expressions. They are used as nodes in the parse tree and
// possess an evaluate() method to compute an XPath value given an XPath
// context. Expressions are returned from the parser. Teh set of
// expression classes closely mirrors the set of non terminal symbols
// in the grammar. Every non trivial nonterminal symbol has a
// corresponding expression class.
//
// The common expression interface consists of the following methods:
//
// evaluate(context) -- evaluates the expression, returns a value.
//
// toString(expr) -- returns the XPath text representation of the
// expression (defined in xsltdebug.js).
//
// parseTree(expr, indent) -- returns a parse tree representation of the
// expression (defined in xsltdebug.js).

import { StringValue } from "./string-value";

export class TokenExpr {
    value: any;

    constructor(m) {
        this.value = m;
    }

    evaluate() {
        return new StringValue(this.value);
    }
}
