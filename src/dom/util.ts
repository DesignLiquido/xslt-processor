// Copyright 2023-2026 Design Liquido
// Copyright 2018 Johannes Wilm
// Copyright 2005 Google
//
// Original author: Steffen Meschkat <mesch@google.com>
//
// Miscellaneous utility and placeholder functions.
// Dummy implmentation for the logging functions. Replace by something
// useful when you want to debug.

// Applies the given function to each element of the array, preserving
// this, and passing the index.
export function mapExec(array: any[], func: Function) {
    for (let i = 0; i < array.length; ++i) {
        func.call(this, array[i], i);
    }
}

// Returns an array that contains the return value of the given
// function applied to every element of the input array.
export function mapExpr(array: any[], func: Function) {
    const ret = [];
    for (let i = 0; i < array.length; ++i) {
        ret.push(func(array[i]));
    }
    return ret;
}

/**
 * Reverses the given array in place.
 * @param array The array to be reversed.
 */
export function reverseInPlace(array: any[]) {
    for (let i = 0; i < array.length / 2; ++i) {
        const h = array[i];
        const ii = array.length - i - 1;
        array[i] = array[ii];
        array[ii] = h;
    }
}

