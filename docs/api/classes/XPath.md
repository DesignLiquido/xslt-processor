[**xslt-processor v4.6.1**](../README.md)

***

[xslt-processor](../globals.md) / XPath

# Class: XPath

Defined in: [xpath/xpath.ts:21](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xpath/xpath.ts#L21)

XPath class that uses the new lexer/parser implementation
while maintaining API compatibility with the old implementation.

## Constructors

### Constructor

> **new XPath**(): `XPath`

Defined in: [xpath/xpath.ts:27](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xpath/xpath.ts#L27)

#### Returns

`XPath`

## Methods

### xPathParse()

> **xPathParse**(`expression`, `axis?`, `version?`): `Expression`

Defined in: [xpath/xpath.ts:53](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xpath/xpath.ts#L53)

Parse an XPath expression and return an Expression object.

#### Parameters

##### expression

`string`

The XPath expression string.

##### axis?

`string`

Optional axis override for relative paths.

##### version?

`XPathVersion` = `'1.0'`

Optional XPath version (defaults to 1.0).

#### Returns

`Expression`

***

### xPathEval()

> **xPathEval**(`select`, `context`): `NodeValue`

Defined in: [xpath/xpath.ts:77](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xpath/xpath.ts#L77)

Parse and evaluate an XPath expression.

#### Parameters

##### select

`string`

The XPath expression string.

##### context

[`ExprContext`](ExprContext.md)

The expression context.

#### Returns

`NodeValue`

***

### xPathSort()

> **xPathSort**(`context`, `sort`): `void`

Defined in: [xpath/xpath.ts:91](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xpath/xpath.ts#L91)

Sort nodes in context according to sort specifications.

#### Parameters

##### context

[`ExprContext`](ExprContext.md)

The expression context with nodes to sort.

##### sort

`any`[]

Array of sort specifications.

#### Returns

`void`

***

### clearCache()

> **clearCache**(): `void`

Defined in: [xpath/xpath.ts:183](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xpath/xpath.ts#L183)

Clear parse cache (useful for testing or memory management).

#### Returns

`void`
