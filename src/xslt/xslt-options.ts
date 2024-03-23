import { XsltParameter } from "./xslt-parameter"

export type XsltOptions = {
    cData: boolean,
    escape: boolean,
    selfClosingTags: boolean,
    parameters?: XsltParameter[]
}
