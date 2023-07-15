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
