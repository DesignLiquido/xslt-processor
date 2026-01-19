// Re-export value types from xpath-legacy for backward compatibility
// These value types are independent of the XPath parser implementation
// and can be reused with the new XPath implementation.

export { NodeValue } from '../xpath-legacy/values/node-value';
export { StringValue } from '../xpath-legacy/values/string-value';
export { NumberValue } from '../xpath-legacy/values/number-value';
export { BooleanValue } from '../xpath-legacy/values/boolean-value';
export { NodeSetValue } from '../xpath-legacy/values/node-set-value';
