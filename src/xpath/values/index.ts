// XPath expression values. They are what XPath expressions evaluate
// to. Strangely, the different value types are not specified in the
// XPath syntax, but only in the semantics, so they don't show up as
// nonterminals in the grammar. Yet, some expressions are required to
// evaluate to particular types, and not every type can be coerced
// into every other type. Although the types of XPath values are
// similar to the types present in JavaScript, the type coercion rules
// are a bit peculiar, so we explicitly model XPath types instead of
// mapping them onto JavaScript types. (See XPath spec.)
//
// The four types are:
//
//   - `StringValue`
//   - `NumberValue`
//   - `BooleanValue`
//   - `NodeSetValue`
//
// The common interface of the value classes consists of methods that
// implement the XPath type coercion rules:
//
//   - `stringValue()` -- returns the value as a JavaScript String;
//   - `numberValue()` -- returns the value as a JavaScript Number;
//   - `booleanValue()` -- returns the value as a JavaScript Boolean;
//   - `nodeSetValue()` -- returns the value as a JavaScript Array of DOM
//                       Node objects.

export * from './boolean-value';
export * from './node-set-value';
export * from './node-value';
export * from './number-value';
export * from './string-value';
export * from './map-value';
export * from './array-value';
