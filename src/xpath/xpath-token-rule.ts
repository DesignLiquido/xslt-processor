export type XPathTokenRule = {
    label: string,
    prec?: number,
    re: RegExp,
    key?: any,
    left?: boolean
}
