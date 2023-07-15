export * from './non-standard';
export * from './standard';

// Throws an exception if false.
export function assert(b: any) {
    if (!b) {
        throw new Error('Assertion failed');
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
