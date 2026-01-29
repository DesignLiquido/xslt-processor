import { XsltParameter } from "./xslt-parameter"

/**
 * According to https://www.w3schools.com/xml/ref_xsl_el_decimal-format.asp:
 *
 * @property {string} name: Optional. Specifies a name for this format.
 * @property {string} decimalSeparator: Optional. Specifies the decimal point character. Default is ".".
 * @property {string} groupingSeparator: Optional. Specifies the thousands separator character. Default is ",".
 * @property {string} infinity: Optional. Specifies the string used to represent infinity. Default is "Infinity".
 * @property {string} minusSign: Optional. Specifies the character to represent negative numbers. Default is "-".
 * @property {string} naN: Optional. Specifies the string used when the value is not a number". Default is "NaN".
 * @property {string} percent: Optional. Specifies the percentage sign character. Default is "%".
 * @property {string} perMille: Optional. Specifies the per thousand sign character. Default is "‰".
 * @property {string} zeroDigit: Optional. Specifies the digit zero character. Default is "0".
 * @property {string} digit: Optional. Specifies the character used to indicate a place where a digit is required. Default is #.
 * @property {string} patternSeparator: Optional. Specifies the character used to separate positive and negative subpatterns in a format pattern. Default is ";".
 */
export type XsltDecimalFormatSettings = {
   name?: string,
   decimalSeparator: string,
   groupingSeparator: string,
   infinity: string,
   minusSign: string,
   naN: string,
   percent: string,
   perMille: string,
   zeroDigit: string,
   digit: string,
   patternSeparator: string
}


export type XsltOptions = {
    cData: boolean,
    escape: boolean,
    selfClosingTags: boolean,
    outputMethod?: 'xml' | 'html' | 'text' | 'xhtml' | 'json' | 'adaptive',
    parameters?: XsltParameter[]
}
