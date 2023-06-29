// Copyright 2023 Design Liquido
// Copyright 2018 Johannes Wilm
// Copyright 2005 Google
//
// Original author: Steffen Meschkat <mesch@google.com>
//
// Miscellaneous utility and placeholder functions.
// Dummy implmentation for the logging functions. Replace by something
// useful when you want to debug.


import { FunctionCallExpr, BinaryExpr, UnaryMinusExpr, NumberExpr } from '../xpath/expressions';

// Throws an exception if false.
export function assert(b) {
    if (!b) {
        throw new Error('Assertion failed');
    }
}

// Applies the given function to each element of the array, preserving
// this, and passing the index.
export function mapExec(array, func) {
    for (let i = 0; i < array.length; ++i) {
        func.call(this, array[i], i);
    }
}

// Returns an array that contains the return value of the given
// function applied to every element of the input array.
export function mapExpr(array, func) {
    const ret = [];
    for (let i = 0; i < array.length; ++i) {
        ret.push(func(array[i]));
    }
    return ret;
}

// Reverses the given array in place.
export function reverseInplace(array) {
    for (let i = 0; i < array.length / 2; ++i) {
        const h = array[i];
        const ii = array.length - i - 1;
        array[i] = array[ii];
        array[ii] = h;
    }
}

// Shallow-copies an array to the end of another array
// Basically Array.concat, but works with other non-array collections
export function copyArray(dst, src) {
    if (!src) return;
    const dstLength = dst.length;
    for (let i = src.length - 1; i >= 0; --i) {
        dst[i + dstLength] = src[i];
    }
}

/**
 * This is an optimization for copying attribute lists in IE. IE includes many
 * extraneous properties in its DOM attribute lists, which take require
 * significant extra processing when evaluating attribute steps. With this
 * function, we ignore any such attributes that has an empty string value.
 */
export function copyArrayIgnoringAttributesWithoutValue(dst, src) {
    if (!src) return;
    for (let i = src.length - 1; i >= 0; --i) {
        // this test will pass so long as the attribute has a non-empty string
        // value, even if that value is "false", "0", "undefined", etc.
        if (src[i].nodeValue) {
            dst.push(src[i]);
        }
    }
}

/**
 * Escape the special regular expression characters when the regular expression
 * is specified as a string.
 *
 * Based on: http://simonwillison.net/2006/Jan/20/escape/
 */
const regExpSpecials = ['/', '.', '*', '+', '?', '|', '^', '$', '(', ')', '[', ']', '{', '}', '\\'];

const sRE = new RegExp(`(\\${regExpSpecials.join('|\\')})`, 'g');

export function regExpEscape(text: string) {
    return text.replace(sRE, '\\$1');
}

/**
 * Determines whether a predicate expression contains a "positional selector".
 * A positional selector filters nodes from the nodelist input based on their
 * position within that list. When such selectors are encountered, the
 * evaluation of the predicate cannot be depth-first, because the positional
 * selector may be based on the result of evaluating predicates that precede
 * it.
 */
export function predicateExprHasPositionalSelector(expr: any, isRecursiveCall?: any) {
    if (!expr) {
        return false;
    }
    if (!isRecursiveCall && exprReturnsNumberValue(expr)) {
        // this is a "proximity position"-based predicate
        return true;
    }
    if (expr instanceof FunctionCallExpr) {
        const value = (expr as any).name.value;
        return value == 'last' || value == 'position';
    }
    if (expr instanceof BinaryExpr) {
        return (
            predicateExprHasPositionalSelector(expr.expr1, true) || predicateExprHasPositionalSelector(expr.expr2, true)
        );
    }
    return false;
}

function exprReturnsNumberValue(expr) {
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

// (viat) given an XNode (see dom.js), returns an object mapping prefixes to their corresponding namespaces in its scope.
// default namespace is treated as if its prefix were the empty string.
export function namespaceMapAt(node: any) {
    const map = {
        // reserved namespaces https://www.w3.org/TR/REC-xml-names/#xmlReserved
        xmlns: 'http://www.w3.org/2000/xmlns/',
        xml: 'http://www.w3.org/XML/1998/namespace'
    };
    let n = node;
    while (n !== null) {
        for (let i = 0; i < n.attributes.length; i++) {
            if (n.attributes[i].nodeName.startsWith('xmlns:')) {
                const prefix = n.attributes[i].nodeName.split(':')[1];
                if (!(prefix in map)) map[prefix] = n.attributes[i].nodeValue;
            } else if (n.attributes[i].nodeName == 'xmlns') {
                if (!('' in map)) map[''] = n.attributes[i].nodeValue || null;
            }
        }
        n = n.parentNode;
    }
    return map;
}
