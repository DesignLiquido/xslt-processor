// Copyright 2023 Design Liquido
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
