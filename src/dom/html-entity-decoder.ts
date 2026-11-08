/**
 * HTML Entity Decoder
 * Decodes HTML entities to their corresponding characters.
 * Replaces the 'he' dependency.
 */

// Common HTML entities mapping
const NAMED_ENTITIES: { [key: string]: string } = {
    'amp': '&',
    'lt': '<',
    'gt': '>',
    'quot': '"',
    'apos': "'",
    'nbsp': '\u00A0',
    'copy': '\u00A9',
    'reg': '\u00AE',
    'times': '\u00D7',
    'divide': '\u00F7',
    'euro': '\u20AC',
    'pound': '\u00A3',
    'yen': '\u00A5',
    'cent': '\u00A2',
    'sect': '\u00A7',
    'para': '\u00B6',
    'hellip': '\u2026',
    'middot': '\u00B7',
    'deg': '\u00B0'
};

/**
 * Decode HTML entities in a string
 * Supports:
 * - Named entities: &amp; &lt; &gt; &quot; &apos;
 * - Numeric entities: &#123; or &#xAB;
 */
export function htmlEntityDecode(text: string): string {
    if (!text) {
        return text;
    }

    // Decode in a single pass, so the output of one reference (e.g. the "&" from "&amp;")
    // is never re-read as the start of another one.
    return text.replace(
        /&(?:#(\d+)|#[xX]([0-9a-fA-F]+)|([a-zA-Z]+));/g,
        (match: string, decimal?: string, hex?: string, entity?: string) => {
            if (decimal) return String.fromCharCode(parseInt(decimal, 10));
            if (hex) return String.fromCharCode(parseInt(hex, 16));
            return NAMED_ENTITIES[entity!.toLowerCase()] || match;
        }
    );
}

/**
 * Encode text to HTML entities (basic implementation)
 */
export function htmlEntityEncode(text: string): string {
    if (!text) {
        return text;
    }

    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}
