export type XmlOutputOptions = {
    cData: boolean;
    escape: boolean;
    selfClosingTags: boolean;
    outputMethod: 'xml' | 'html' | 'text' | 'name' | 'xhtml';
    outputVersion?: string;
    itemSeparator?: string;
}
