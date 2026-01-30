[**xslt-processor v4.6.1**](../README.md)

***

[xslt-processor](../globals.md) / ExprContext

# Class: ExprContext

Defined in: [xpath/expr-context.ts:48](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xpath/expr-context.ts#L48)

XPath expression evaluation context. An XPath context consists of a
DOM node, a list of DOM nodes that contains this node, a number
that represents the position of the single node in the list, and a
current set of variable bindings. (See XPath spec.)

  setVariable(name, expr) -- binds given XPath expression to the
  name.

  getVariable(name) -- what the name says.

  setNode(position) -- sets the context to the node at the given
  position. Needed to implement scoping rules for variables in
  XPath. (A variable is visible to all subsequent siblings, not
  only to its children.)

  set/isCaseInsensitive -- specifies whether node name tests should
  be case sensitive.  If you're executing xpaths against a regular
  HTML DOM, you probably don't want case-sensitivity, because
  browsers tend to disagree about whether elements & attributes
  should be upper/lower case.  If you're running xpaths in an
  XSLT instance, you probably DO want case sensitivity, as per the
  XSL spec.

  set/isReturnOnFirstMatch -- whether XPath evaluation should quit as soon
  as a result is found. This is an optimization that might make sense if you
  only care about the first result.

  set/isIgnoreNonElementNodesForNTA -- whether to ignore non-element nodes
  when evaluating the "node()" any node test. While technically this is
  contrary to the XPath spec, practically it can enhance performance
  significantly, and makes sense if you a) use "node()" when you mean "*",
  and b) use "//" when you mean "/descendant::* /".

## Constructors

### Constructor

> **new ExprContext**(`nodeList`, `xsltVersion`, `opt_position?`, `opt_decimalFormatSettings?`, `opt_variables?`, `opt_knownNamespaces?`, `opt_parent?`, `opt_caseInsensitive?`, `opt_ignoreAttributesWithoutValue?`, `opt_returnOnFirstMatch?`, `opt_ignoreNonElementNodesForNTA?`, `opt_warningsCallback?`): `ExprContext`

Defined in: [xpath/expr-context.ts:129](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xpath/expr-context.ts#L129)

Constructor -- gets the node, its position, the node set it
belongs to, and a parent context as arguments. The parent context
is used to implement scoping rules for variables: if a variable
is not found in the current context, it is looked for in the
parent context, recursively. Except for node, all arguments have
default values: default position is 0, default node set is the
set that contains only the node, and the default parent is null.

Notice that position starts at 0 at the outside interface;
inside XPath expressions this shows up as position()=1.

#### Parameters

##### nodeList

`XNode`[]

TODO

##### xsltVersion

`"1.0"` | `"2.0"` | `"3.0"`

##### opt\_position?

`number`

TODO

##### opt\_decimalFormatSettings?

`XsltDecimalFormatSettings`

##### opt\_variables?

##### opt\_knownNamespaces?

##### opt\_parent?

`ExprContext`

TODO

##### opt\_caseInsensitive?

`any`

TODO

##### opt\_ignoreAttributesWithoutValue?

`any`

TODO

##### opt\_returnOnFirstMatch?

`any`

TODO

##### opt\_ignoreNonElementNodesForNTA?

`any`

TODO

##### opt\_warningsCallback?

(...`args`) => `void`

#### Returns

`ExprContext`

## Properties

### position

> **position**: `number`

Defined in: [xpath/expr-context.ts:49](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xpath/expr-context.ts#L49)

***

### nodeList

> **nodeList**: `XNode`[]

Defined in: [xpath/expr-context.ts:50](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xpath/expr-context.ts#L50)

***

### xsltVersion

> **xsltVersion**: `"1.0"` \| `"2.0"` \| `"3.0"`

Defined in: [xpath/expr-context.ts:51](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xpath/expr-context.ts#L51)

***

### variables

> **variables**: `object`

Defined in: [xpath/expr-context.ts:53](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xpath/expr-context.ts#L53)

#### Index Signature

\[`name`: `string`\]: `NodeValue`

***

### keys

> **keys**: `object`

Defined in: [xpath/expr-context.ts:54](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xpath/expr-context.ts#L54)

#### Index Signature

\[`name`: `string`\]: `object`

***

### knownNamespaces

> **knownNamespaces**: `object`

Defined in: [xpath/expr-context.ts:55](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xpath/expr-context.ts#L55)

#### Index Signature

\[`alias`: `string`\]: `string`

***

### systemProperties?

> `optional` **systemProperties**: `object`

Defined in: [xpath/expr-context.ts:61](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xpath/expr-context.ts#L61)

Custom system properties for system-property() function.
Overrides the default properties (xsl:version, xsl:vendor, xsl:vendor-url).

#### Index Signature

\[`name`: `string`\]: `string`

***

### documentLoader()?

> `optional` **documentLoader**: (`uri`) => `XNode`

Defined in: [xpath/expr-context.ts:67](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xpath/expr-context.ts#L67)

Document loader function for the document() function.
Takes a URI and returns an XNode document, or null if loading fails.

#### Parameters

##### uri

`string`

#### Returns

`XNode`

***

### unparsedEntities?

> `optional` **unparsedEntities**: `object`

Defined in: [xpath/expr-context.ts:73](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xpath/expr-context.ts#L73)

Unparsed entity URIs for the unparsed-entity-uri() function.
Maps entity names to their URIs (from DTD declarations).

#### Index Signature

\[`name`: `string`\]: `string`

***

### warningsCallback()?

> `optional` **warningsCallback**: (...`args`) => `void`

Defined in: [xpath/expr-context.ts:78](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xpath/expr-context.ts#L78)

Warning callback for non-fatal XPath/XSLT warnings.

#### Parameters

##### args

...`any`[]

#### Returns

`void`

***

### caseInsensitive

> **caseInsensitive**: `any`

Defined in: [xpath/expr-context.ts:80](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xpath/expr-context.ts#L80)

***

### ignoreAttributesWithoutValue

> **ignoreAttributesWithoutValue**: `any`

Defined in: [xpath/expr-context.ts:81](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xpath/expr-context.ts#L81)

***

### returnOnFirstMatch

> **returnOnFirstMatch**: `any`

Defined in: [xpath/expr-context.ts:82](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xpath/expr-context.ts#L82)

***

### ignoreNonElementNodesForNTA

> **ignoreNonElementNodesForNTA**: `any`

Defined in: [xpath/expr-context.ts:83](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xpath/expr-context.ts#L83)

***

### parent

> **parent**: `ExprContext`

Defined in: [xpath/expr-context.ts:85](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xpath/expr-context.ts#L85)

***

### root

> **root**: `XNode`

Defined in: [xpath/expr-context.ts:86](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xpath/expr-context.ts#L86)

***

### decimalFormatSettings

> **decimalFormatSettings**: `XsltDecimalFormatSettings`

Defined in: [xpath/expr-context.ts:87](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xpath/expr-context.ts#L87)

***

### inApplyTemplates

> **inApplyTemplates**: `boolean`

Defined in: [xpath/expr-context.ts:89](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xpath/expr-context.ts#L89)

***

### baseTemplateMatched

> **baseTemplateMatched**: `boolean`

Defined in: [xpath/expr-context.ts:90](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xpath/expr-context.ts#L90)

***

### regexGroups?

> `optional` **regexGroups**: `string`[]

Defined in: [xpath/expr-context.ts:96](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xpath/expr-context.ts#L96)

Regex groups from xsl:analyze-string for regex-group() function.
Index 0 is the full match, 1+ are captured groups.

***

### currentGroup?

> `optional` **currentGroup**: `XNode`[]

Defined in: [xpath/expr-context.ts:102](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xpath/expr-context.ts#L102)

Current group from xsl:for-each-group for current-group() function.
Contains the nodes/items in the current group being processed.

***

### currentGroupingKey?

> `optional` **currentGroupingKey**: `any`

Defined in: [xpath/expr-context.ts:108](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xpath/expr-context.ts#L108)

Current grouping key from xsl:for-each-group for current-grouping-key() function.
Contains the key value of the current group being processed.

## Methods

### clone()

> **clone**(`opt_nodeList?`, `opt_position?`): `ExprContext`

Defined in: [xpath/expr-context.ts:196](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xpath/expr-context.ts#L196)

clone() -- creates a new context with the current context as
parent. If passed as argument to clone(), the new context has a
different node, position, or node set. What is not passed is
inherited from the cloned context.

#### Parameters

##### opt\_nodeList?

`XNode`[]

TODO

##### opt\_position?

`number`

TODO

#### Returns

`ExprContext`

TODO

***

### setVariable()

> **setVariable**(`name?`, `value?`): `void`

Defined in: [xpath/expr-context.ts:213](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xpath/expr-context.ts#L213)

#### Parameters

##### name?

`string`

##### value?

`string` | `NodeValue`

#### Returns

`void`

***

### getVariable()

> **getVariable**(`name`): `NodeValue`

Defined in: [xpath/expr-context.ts:239](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xpath/expr-context.ts#L239)

#### Parameters

##### name

`string`

#### Returns

`NodeValue`

***

### getRegexGroup()

> **getRegexGroup**(`index`): `string`

Defined in: [xpath/expr-context.ts:257](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xpath/expr-context.ts#L257)

Gets a regex group from xsl:analyze-string context.
Searches up the parent chain for regexGroups.

#### Parameters

##### index

`number`

Group index (0 = full match, 1+ = captured groups)

#### Returns

`string`

The group value or empty string if not found

***

### setNode()

> **setNode**(`position`): `void`

Defined in: [xpath/expr-context.ts:269](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xpath/expr-context.ts#L269)

#### Parameters

##### position

`number`

#### Returns

`void`

***

### contextSize()

> **contextSize**(): `number`

Defined in: [xpath/expr-context.ts:273](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xpath/expr-context.ts#L273)

#### Returns

`number`

***

### isCaseInsensitive()

> **isCaseInsensitive**(): `any`

Defined in: [xpath/expr-context.ts:277](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xpath/expr-context.ts#L277)

#### Returns

`any`

***

### setCaseInsensitive()

> **setCaseInsensitive**(`caseInsensitive`): `any`

Defined in: [xpath/expr-context.ts:281](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xpath/expr-context.ts#L281)

#### Parameters

##### caseInsensitive

`any`

#### Returns

`any`

***

### isIgnoreAttributesWithoutValue()

> **isIgnoreAttributesWithoutValue**(): `any`

Defined in: [xpath/expr-context.ts:285](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xpath/expr-context.ts#L285)

#### Returns

`any`

***

### setIgnoreAttributesWithoutValue()

> **setIgnoreAttributesWithoutValue**(`ignore`): `any`

Defined in: [xpath/expr-context.ts:289](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xpath/expr-context.ts#L289)

#### Parameters

##### ignore

`any`

#### Returns

`any`

***

### isReturnOnFirstMatch()

> **isReturnOnFirstMatch**(): `any`

Defined in: [xpath/expr-context.ts:293](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xpath/expr-context.ts#L293)

#### Returns

`any`

***

### setReturnOnFirstMatch()

> **setReturnOnFirstMatch**(`returnOnFirstMatch`): `any`

Defined in: [xpath/expr-context.ts:297](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xpath/expr-context.ts#L297)

#### Parameters

##### returnOnFirstMatch

`any`

#### Returns

`any`

***

### isIgnoreNonElementNodesForNTA()

> **isIgnoreNonElementNodesForNTA**(): `any`

Defined in: [xpath/expr-context.ts:301](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xpath/expr-context.ts#L301)

#### Returns

`any`

***

### setIgnoreNonElementNodesForNTA()

> **setIgnoreNonElementNodesForNTA**(`ignoreNonElementNodesForNTA`): `any`

Defined in: [xpath/expr-context.ts:305](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xpath/expr-context.ts#L305)

#### Parameters

##### ignoreNonElementNodesForNTA

`any`

#### Returns

`any`
