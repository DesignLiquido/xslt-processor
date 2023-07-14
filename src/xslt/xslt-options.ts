import { XsltParameter } from "./xslt-parameter"

export type XsltOptions = {
    escape: boolean,
    selfClosingTags: boolean,
    parameters?: XsltParameter[]
}
