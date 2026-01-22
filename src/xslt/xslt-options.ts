import { XsltParameter } from "./xslt-parameter"

export type XsltOptions = {
    cData: boolean,
    escape: boolean,
    selfClosingTags: boolean,
    outputMethod?: 'xml' | 'html' | 'text' | 'xhtml' | 'json',
    parameters?: XsltParameter[]
}
