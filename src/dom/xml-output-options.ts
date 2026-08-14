export type XmlOutputOptions = {
    cData: boolean;
    escape: boolean;
    selfClosingTags: boolean;
    outputMethod: 'xml' | 'html' | 'text' | 'name' | 'xhtml';
    outputVersion?: string;
    itemSeparator?: string;
    /**
     * Whether to pretty-print the output, corresponding to `xsl:output`'s
     * `indent` attribute. Only elements whose children are exclusively
     * elements, comments and/or processing instructions (i.e. no significant
     * text content) are indented, to avoid corrupting mixed content.
     */
    indent?: boolean;
}
