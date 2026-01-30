[**xslt-processor v4.6.1**](../README.md)

***

[xslt-processor](../globals.md) / Xslt

# Class: Xslt

Defined in: [xslt/xslt.ts:123](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L123)

The main class for XSL-T processing. The implementation is NOT
complete; some xsl element are left out.

References:

[XSLT] XSL-T Specification
<http://www.w3.org/TR/1999/REC-xslt-19991116>.

[ECMA] ECMAScript Language Specification
<http://www.ecma-international.org/publications/standards/Ecma-262.htm>.

The XSL processor API has one entry point, the function
`xsltProcess()`. It receives as arguments the starting point in the
input document as an XPath expression context, the DOM root node of
the XSL-T stylesheet, and a DOM node that receives the output.

NOTE: Actually, XSL-T processing according to the specification is
defined as operation on text documents, not as operation on DOM
trees. So, strictly speaking, this implementation is not an XSL-T
processor, but the processing engine that needs to be complemented
by an XML parser and serializer in order to be complete. Those two
are found in the `dom` folder.

## Constructors

### Constructor

> **new Xslt**(`options`): `Xslt`

Defined in: [xslt/xslt.ts:229](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L229)

#### Parameters

##### options

`Partial`\<[`XsltOptions`](../type-aliases/XsltOptions.md)\> = `...`

#### Returns

`Xslt`

## Properties

### xPath

> **xPath**: [`XPath`](XPath.md)

Defined in: [xslt/xslt.ts:124](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L124)

***

### xmlParser

> **xmlParser**: [`XmlParser`](XmlParser.md)

Defined in: [xslt/xslt.ts:125](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L125)

***

### matchResolver

> **matchResolver**: `MatchResolver`

Defined in: [xslt/xslt.ts:126](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L126)

***

### options

> **options**: [`XsltOptions`](../type-aliases/XsltOptions.md)

Defined in: [xslt/xslt.ts:127](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L127)

***

### decimalFormatSettings

> **decimalFormatSettings**: `XsltDecimalFormatSettings`

Defined in: [xslt/xslt.ts:128](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L128)

***

### warningsCallback()

> **warningsCallback**: (...`args`) => `void`

Defined in: [xslt/xslt.ts:129](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L129)

#### Parameters

##### args

...`any`[]

#### Returns

`void`

***

### outputDocument

> **outputDocument**: `XDocument`

Defined in: [xslt/xslt.ts:131](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L131)

***

### outputMethod

> **outputMethod**: `"xml"` \| `"html"` \| `"text"` \| `"name"` \| `"xhtml"` \| `"json"` \| `"adaptive"`

Defined in: [xslt/xslt.ts:132](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L132)

***

### outputOmitXmlDeclaration

> **outputOmitXmlDeclaration**: `string`

Defined in: [xslt/xslt.ts:133](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L133)

***

### outputVersion

> **outputVersion**: `string`

Defined in: [xslt/xslt.ts:134](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L134)

***

### itemSeparator

> **itemSeparator**: `string`

Defined in: [xslt/xslt.ts:135](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L135)

***

### version

> **version**: `string`

Defined in: [xslt/xslt.ts:136](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L136)

***

### firstTemplateRan

> **firstTemplateRan**: `boolean`

Defined in: [xslt/xslt.ts:137](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L137)

***

### forwardsCompatible

> **forwardsCompatible**: `boolean`

Defined in: [xslt/xslt.ts:147](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L147)

Forwards-compatible processing mode (XSLT 1.0 Section 2.5).
When true, the processor is running a stylesheet with version > 1.0.
In this mode:
- Unknown top-level elements are silently ignored
- Unknown XSLT instructions use xsl:fallback if available, otherwise are ignored
- Unknown attributes on XSLT elements are ignored

***

### stripSpacePatterns

> **stripSpacePatterns**: `string`[]

Defined in: [xslt/xslt.ts:153](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L153)

List of element name patterns from xsl:strip-space declarations.
Whitespace-only text nodes inside matching elements will be stripped.

***

### preserveSpacePatterns

> **preserveSpacePatterns**: `string`[]

Defined in: [xslt/xslt.ts:160](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L160)

List of element name patterns from xsl:preserve-space declarations.
Whitespace-only text nodes inside matching elements will be preserved.
preserve-space takes precedence over strip-space for conflicting patterns.

***

### namespaceAliases

> **namespaceAliases**: `Map`\<`string`, `string`\>

Defined in: [xslt/xslt.ts:166](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L166)

Namespace aliases from xsl:namespace-alias declarations.
Maps stylesheet namespace prefixes to result namespace prefixes.

***

### supportedExtensions

> **supportedExtensions**: `Set`\<`string`\>

Defined in: [xslt/xslt.ts:173](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L173)

Set of supported extension element namespaces.
Processors can register custom extension namespaces here.
Currently only XSLT namespace is auto-registered.

***

### attributeSets

> **attributeSets**: `Map`\<`string`, `XNode`[]\>

Defined in: [xslt/xslt.ts:179](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L179)

Map of attribute sets defined in the stylesheet.
Keys are attribute set names, values are arrays of xsl:attribute nodes.

## Methods

### xsltProcess()

> **xsltProcess**(`xmlDoc`, `stylesheet`): `Promise`\<`string`\>

Defined in: [xslt/xslt.ts:283](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L283)

The exported entry point of the XSL-T processor.

#### Parameters

##### xmlDoc

`XDocument`

The input document root, as DOM node.

##### stylesheet

`XDocument`

The stylesheet document root, as DOM node.

#### Returns

`Promise`\<`string`\>

the processed document, as XML text in a string, JSON string if outputMethod is 'json', or text if outputMethod is 'text' or 'adaptive' (with text content).

***

### xsltProcessContext()

> `protected` **xsltProcessContext**(`context`, `template`, `output?`): `Promise`\<`void`\>

Defined in: [xslt/xslt.ts:334](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L334)

The main entry point of the XSL-T processor, as explained on the top of the file.

#### Parameters

##### context

[`ExprContext`](ExprContext.md)

The input document root, as XPath `ExprContext`.

##### template

`XNode`

The stylesheet document root, as DOM node.

##### output?

`XNode`

If set, the output where the transformation should occur.

#### Returns

`Promise`\<`void`\>

***

### xsltUnknownInstruction()

> `protected` **xsltUnknownInstruction**(`context`, `template`, `output?`): `Promise`\<`void`\>

Defined in: [xslt/xslt.ts:574](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L574)

Handle unknown XSLT instructions per XSLT 1.0 Section 2.5 (Forwards-Compatible Processing).

In forwards-compatible mode (version > 1.0):
- If the instruction has an xsl:fallback child, execute the fallback
- Otherwise, the instruction is silently ignored

In strict mode (version = 1.0):
- Unknown instructions are an error

#### Parameters

##### context

[`ExprContext`](ExprContext.md)

The Expression Context

##### template

`XNode`

The unknown XSLT instruction element

##### output?

`XNode`

The output node

#### Returns

`Promise`\<`void`\>

***

### xsltApplyTemplates()

> `protected` **xsltApplyTemplates**(`context`, `template`, `output?`): `Promise`\<`void`\>

Defined in: [xslt/xslt.ts:608](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L608)

Implements `xsl:apply-templates`.

#### Parameters

##### context

[`ExprContext`](ExprContext.md)

The Expression Context.

##### template

`XNode`

The template.

##### output?

`XNode`

The output. Only used if there's no corresponding output node already defined.

#### Returns

`Promise`\<`void`\>

***

### xsltApplyImports()

> `protected` **xsltApplyImports**(`context`, `template`, `output?`): `Promise`\<`void`\>

Defined in: [xslt/xslt.ts:893](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L893)

Implements `xsl:apply-imports`.
Applies templates from imported stylesheets with the same match pattern and mode.
This enables template overriding where a template in an importing stylesheet
can call the overridden template from the imported stylesheet.

#### Parameters

##### context

[`ExprContext`](ExprContext.md)

The Expression Context.

##### template

`XNode`

The apply-imports template node.

##### output?

`XNode`

The output node.

#### Returns

`Promise`\<`void`\>

***

### xsltAttribute()

> `protected` **xsltAttribute**(`context`, `template`, `output?`): `Promise`\<`void`\>

Defined in: [xslt/xslt.ts:965](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L965)

Implements `xsl:attribute`.

#### Parameters

##### context

[`ExprContext`](ExprContext.md)

The Expression Context.

##### template

`XNode`

The template.

##### output?

`XNode`

The output. Only used if there's no corresponding output node already defined.

#### Returns

`Promise`\<`void`\>

***

### xsltCallTemplate()

> `protected` **xsltCallTemplate**(`context`, `template`, `output?`): `Promise`\<`void`\>

Defined in: [xslt/xslt.ts:984](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L984)

Implements `xsl:call-template`.

#### Parameters

##### context

[`ExprContext`](ExprContext.md)

The Expression Context.

##### template

`XNode`

The template.

##### output?

`XNode`

The output, used when a fragment is passed by a previous step.

#### Returns

`Promise`\<`void`\>

***

### xsltChoose()

> `protected` **xsltChoose**(`context`, `template`, `output?`): `Promise`\<`void`\>

Defined in: [xslt/xslt.ts:1011](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L1011)

Implements `xsl:choose`, its child nodes `xsl:when`, and
`xsl:otherwise`.

#### Parameters

##### context

[`ExprContext`](ExprContext.md)

The Expression Context.

##### template

`XNode`

The template.

##### output?

`XNode`

The output. Only used if there's no corresponding output node already defined.

#### Returns

`Promise`\<`void`\>

***

### xsltCopy()

> `protected` **xsltCopy**(`destination`, `source`): `XNode`

Defined in: [xslt/xslt.ts:1036](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L1036)

Implements `xsl:copy` for all node types.

#### Parameters

##### destination

`XNode`

the node being copied to, part of output document.

##### source

`XNode`

the node being copied, part in input document.

#### Returns

`XNode`

If an element node was created, the element node. Otherwise, null.

***

### xsltComment()

> `protected` **xsltComment**(`context`, `template`, `output?`): `Promise`\<`void`\>

Defined in: [xslt/xslt.ts:1078](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L1078)

Implements `xsl:comment`.

#### Parameters

##### context

[`ExprContext`](ExprContext.md)

The Expression Context.

##### template

`XNode`

The template.

##### output?

`XNode`

The output. Only used if there's no corresponding output node already defined.

#### Returns

`Promise`\<`void`\>

***

### xsltProcessingInstruction()

> `protected` **xsltProcessingInstruction**(`context`, `template`, `output?`): `Promise`\<`void`\>

Defined in: [xslt/xslt.ts:1093](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L1093)

Implements `xsl:processing-instruction`.

#### Parameters

##### context

[`ExprContext`](ExprContext.md)

The Expression Context.

##### template

`XNode`

The template.

##### output?

`XNode`

The output. Only used if there's no corresponding output node already defined.

#### Returns

`Promise`\<`void`\>

***

### xsltCopyOf()

> `protected` **xsltCopyOf**(`destination`, `source`): `void`

Defined in: [xslt/xslt.ts:1139](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L1139)

Implements `xsl:copy-of` for node-set values of the select
expression. Recurses down the source node tree, which is part of
the input document.

#### Parameters

##### destination

`XNode`

the node being copied to, part of output document.

##### source

`XNode`

the node being copied, part in input document.

#### Returns

`void`

***

### xsltDecimalFormat()

> `protected` **xsltDecimalFormat**(`context`, `template`): `void`

Defined in: [xslt/xslt.ts:1160](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L1160)

Implements `xsl:decimal-format`, registering the settings in this instance
and the current context.

#### Parameters

##### context

[`ExprContext`](ExprContext.md)

The Expression Context.

##### template

`XNode`

The template.

#### Returns

`void`

***

### xsltElement()

> `protected` **xsltElement**(`context`, `template`, `output?`): `Promise`\<`void`\>

Defined in: [xslt/xslt.ts:1193](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L1193)

Implements `xsl:element`.

#### Parameters

##### context

[`ExprContext`](ExprContext.md)

The Expression Context.

##### template

`XNode`

The template.

##### output?

`XNode`

#### Returns

`Promise`\<`void`\>

***

### xsltAccumulator()

> `protected` **xsltAccumulator**(`context`, `template`): `void`

Defined in: [xslt/xslt.ts:1222](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L1222)

Implements `xsl:accumulator` (XSLT 3.0).

Accumulators are a declarative way to compute values during template processing.
They consist of rules that are applied as elements are processed.

#### Parameters

##### context

[`ExprContext`](ExprContext.md)

The expression context

##### template

`XNode`

The xsl:accumulator element

#### Returns

`void`

***

### evaluateAccumulatorRules()

> `protected` **evaluateAccumulatorRules**(`context`, `node`): `void`

Defined in: [xslt/xslt.ts:1294](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L1294)

Evaluates all matching accumulator rules for a given node
and updates the accumulator state

#### Parameters

##### context

[`ExprContext`](ExprContext.md)

The expression context with current node

##### node

`XNode`

The current node being processed

#### Returns

`void`

***

### getAccumulatorValue()

> `protected` **getAccumulatorValue**(`accumulatorName`): `any`

Defined in: [xslt/xslt.ts:1344](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L1344)

Retrieves the current value of an accumulator
Used when accessing accumulators in templates via accumulator-after() or accumulator-before()

#### Parameters

##### accumulatorName

`string`

The name of the accumulator

#### Returns

`any`

The current value of the accumulator, or null if not found

***

### xsltForEach()

> `protected` **xsltForEach**(`context`, `template`, `output?`): `Promise`\<`void`\>

Defined in: [xslt/xslt.ts:1355](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L1355)

Implements `xsl:for-each`.

#### Parameters

##### context

[`ExprContext`](ExprContext.md)

The Expression Context.

##### template

`XNode`

The template.

##### output?

`XNode`

The output.

#### Returns

`Promise`\<`void`\>

***

### xsltForEachGroup()

> `protected` **xsltForEachGroup**(`context`, `template`, `output?`): `Promise`\<`void`\>

Defined in: [xslt/xslt.ts:1404](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L1404)

Implements `xsl:for-each-group` (XSLT 2.0).

Groups items from the select expression and processes each group.
Supports group-by and group-adjacent grouping methods.

#### Parameters

##### context

[`ExprContext`](ExprContext.md)

The Expression Context.

##### template

`XNode`

The template.

##### output?

`XNode`

The output.

#### Returns

`Promise`\<`void`\>

***

### xsltIterate()

> `protected` **xsltIterate**(`context`, `template`, `output?`): `Promise`\<`void`\>

Defined in: [xslt/xslt.ts:1622](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L1622)

Implements `xsl:iterate` (XSLT 3.0).

Iterates over a sequence, maintaining accumulators that are updated across iterations.
Each iteration can output content and update accumulator values.
After all iterations complete, optional xsl:on-completion is executed.

#### Parameters

##### context

[`ExprContext`](ExprContext.md)

The Expression Context.

##### template

`XNode`

The template.

##### output?

`XNode`

The output.

#### Returns

`Promise`\<`void`\>

***

### xsltTry()

> `protected` **xsltTry**(`context`, `template`, `output?`): `Promise`\<`void`\>

Defined in: [xslt/xslt.ts:1760](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L1760)

Implements `xsl:try`.

#### Parameters

##### context

[`ExprContext`](ExprContext.md)

The Expression Context.

##### template

`XNode`

The template.

##### output?

`XNode`

The output.

#### Returns

`Promise`\<`void`\>

***

### xsltEvaluate()

> `protected` **xsltEvaluate**(`context`, `template`, `output?`): `Promise`\<`void`\>

Defined in: [xslt/xslt.ts:1840](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L1840)

Implements `xsl:evaluate` (XSLT 3.0).
Dynamically evaluates an XPath expression constructed as a string.

#### Parameters

##### context

[`ExprContext`](ExprContext.md)

The Expression Context.

##### template

`XNode`

The template.

##### output?

`XNode`

The output.

#### Returns

`Promise`\<`void`\>

***

### xsltIf()

> `protected` **xsltIf**(`context`, `template`, `output?`): `Promise`\<`void`\>

Defined in: [xslt/xslt.ts:1909](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L1909)

Implements `xsl:if`.

#### Parameters

##### context

[`ExprContext`](ExprContext.md)

The Expression Context.

##### template

`XNode`

The template.

##### output?

`XNode`

The output.

#### Returns

`Promise`\<`void`\>

***

### xsltImportOrInclude()

> `protected` **xsltImportOrInclude**(`context`, `template`, `output`, `isImport`): `Promise`\<`void`\>

Defined in: [xslt/xslt.ts:1923](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L1923)

Common implementation for `<xsl:import>` and `<xsl:include>`.

#### Parameters

##### context

[`ExprContext`](ExprContext.md)

The Expression Context.

##### template

`XNode`

The template.

##### output

`XNode`

The output.

##### isImport

`boolean`

Whether this is an import (true) or include (false).

#### Returns

`Promise`\<`void`\>

***

### xsltImport()

> `protected` **xsltImport**(`context`, `template`, `output?`): `Promise`\<`void`\>

Defined in: [xslt/xslt.ts:1990](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L1990)

Implements `<xsl:import>`. For now the code is nearly identical to `<xsl:include>`, but there's
no precedence evaluation implemented yet.

#### Parameters

##### context

[`ExprContext`](ExprContext.md)

The Expression Context.

##### template

`XNode`

The template.

##### output?

`XNode`

The output.

#### Returns

`Promise`\<`void`\>

***

### xsltInclude()

> `protected` **xsltInclude**(`context`, `template`, `output?`): `Promise`\<`void`\>

Defined in: [xslt/xslt.ts:2000](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L2000)

Implements `xsl:include`.

#### Parameters

##### context

[`ExprContext`](ExprContext.md)

The Expression Context.

##### template

`XNode`

The template.

##### output?

`XNode`

The output.

#### Returns

`Promise`\<`void`\>

***

### xsltPackage()

> `protected` **xsltPackage**(`context`, `template`, `output?`): `Promise`\<`void`\>

Defined in: [xslt/xslt.ts:2011](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L2011)

Implements `<xsl:package>` (XSLT 3.0 Section 3.6).
Defines a package of XSLT components with controlled visibility.

#### Parameters

##### context

[`ExprContext`](ExprContext.md)

The Expression Context.

##### template

`XNode`

The xsl:package element.

##### output?

`XNode`

The output node.

#### Returns

`Promise`\<`void`\>

***

### xsltUsePackage()

> `protected` **xsltUsePackage**(`context`, `template`, `output?`): `Promise`\<`void`\>

Defined in: [xslt/xslt.ts:2059](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L2059)

Implements `<xsl:use-package>` (XSLT 3.0 Section 3.7).
Imports another package and makes its public components available.

#### Parameters

##### context

[`ExprContext`](ExprContext.md)

The Expression Context.

##### template

`XNode`

The xsl:use-package element.

##### output?

`XNode`

The output node.

#### Returns

`Promise`\<`void`\>

***

### xsltExpose()

> `protected` **xsltExpose**(`context`, `template`): `void`

Defined in: [xslt/xslt.ts:2105](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L2105)

Implements `<xsl:expose>` (XSLT 3.0 Section 3.8).
Marks a component as visible outside the package.

#### Parameters

##### context

[`ExprContext`](ExprContext.md)

The Expression Context.

##### template

`XNode`

The xsl:expose element.

#### Returns

`void`

***

### xsltAccept()

> `protected` **xsltAccept**(`context`, `template`): `void`

Defined in: [xslt/xslt.ts:2149](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L2149)

Implements `<xsl:accept>` (XSLT 3.0 Section 3.9).
Accepts and optionally overrides a component from a used package.

#### Parameters

##### context

[`ExprContext`](ExprContext.md)

The Expression Context.

##### template

`XNode`

The xsl:accept element.

#### Returns

`void`

***

### xsltStream()

> `protected` **xsltStream**(`context`, `template`, `output?`): `Promise`\<`void`\>

Defined in: [xslt/xslt.ts:2210](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L2210)

Implements `<xsl:stream>` (XSLT 3.0 Section 16).
Enables streaming processing of large documents.

#### Parameters

##### context

[`ExprContext`](ExprContext.md)

The Expression Context.

##### template

`XNode`

The xsl:stream element.

##### output?

`XNode`

The output node.

#### Returns

`Promise`\<`void`\>

***

### xsltFork()

> `protected` **xsltFork**(`context`, `template`, `output?`): `Promise`\<`void`\>

Defined in: [xslt/xslt.ts:2230](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L2230)

Implements `<xsl:fork>` (XSLT 3.0 Section 17).
Creates multiple independent output branches from the input stream.

#### Parameters

##### context

[`ExprContext`](ExprContext.md)

The Expression Context.

##### template

`XNode`

The xsl:fork element.

##### output?

`XNode`

The output node.

#### Returns

`Promise`\<`void`\>

***

### xsltMerge()

> `protected` **xsltMerge**(`context`, `template`, `output?`): `Promise`\<`void`\>

Defined in: [xslt/xslt.ts:2247](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L2247)

Implements `<xsl:merge>` (XSLT 3.0 Section 15).
Merges multiple sorted input sequences.

#### Parameters

##### context

[`ExprContext`](ExprContext.md)

The Expression Context.

##### template

`XNode`

The xsl:merge element.

##### output?

`XNode`

The output node.

#### Returns

`Promise`\<`void`\>

***

### xsltKey()

> `protected` **xsltKey**(`context`, `template`): `void`

Defined in: [xslt/xslt.ts:2265](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L2265)

Implements `xsl:key`.

#### Parameters

##### context

[`ExprContext`](ExprContext.md)

The Expression Context.

##### template

`XNode`

The template.

#### Returns

`void`

***

### xsltMessage()

> `protected` **xsltMessage**(`context`, `template`): `Promise`\<`void`\>

Defined in: [xslt/xslt.ts:2315](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L2315)

Implements `xsl:message`.
Outputs a message to the console. If terminate="yes", throws an error to stop processing.

#### Parameters

##### context

[`ExprContext`](ExprContext.md)

The Expression Context.

##### template

`XNode`

The `<xsl:message>` node.

#### Returns

`Promise`\<`void`\>

***

### xsltNamespaceAlias()

> `protected` **xsltNamespaceAlias**(`template`): `void`

Defined in: [xslt/xslt.ts:2339](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L2339)

Implements `xsl:namespace-alias`.
Declares that a namespace URI in the stylesheet should be replaced by a different
namespace URI in the output.

#### Parameters

##### template

`XNode`

The `<xsl:namespace-alias>` node.

#### Returns

`void`

***

### xsltNumber()

> `protected` **xsltNumber**(`context`, `template`, `output?`): `void`

Defined in: [xslt/xslt.ts:2359](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L2359)

Implements `xsl:number`.
Inserts a formatted number into the result tree.

#### Parameters

##### context

[`ExprContext`](ExprContext.md)

The Expression Context.

##### template

`XNode`

The `<xsl:number>` node.

##### output?

`XNode`

The output node.

#### Returns

`void`

***

### xsltNumberCount()

> `protected` **xsltNumberCount**(`context`, `level`, `count`, `from`): `number`[]

Defined in: [xslt/xslt.ts:2399](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L2399)

Counts nodes for xsl:number based on level, count, and from attributes.

#### Parameters

##### context

[`ExprContext`](ExprContext.md)

The Expression Context.

##### level

`string`

The counting level: 'single', 'multiple', or 'any'.

##### count

`string`

Pattern to match nodes to count.

##### from

`string`

Pattern to define counting boundary.

#### Returns

`number`[]

Array of count values (single element for 'single'/'any', multiple for 'multiple').

***

### nodeMatchesPattern()

> `protected` **nodeMatchesPattern**(`node`, `pattern`): `boolean`

Defined in: [xslt/xslt.ts:2495](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L2495)

Checks if a node matches a pattern (supports simple names and union patterns).

#### Parameters

##### node

`XNode`

The node to check.

##### pattern

`string`

The pattern (node name, wildcard, or union like "a|b|c").

#### Returns

`boolean`

True if the node matches.

***

### nodeMatchesSinglePattern()

> `protected` **nodeMatchesSinglePattern**(`node`, `pattern`): `boolean`

Defined in: [xslt/xslt.ts:2510](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L2510)

Checks if a node matches a single (non-union) pattern.

#### Parameters

##### node

`XNode`

The node to check.

##### pattern

`string`

The pattern (node name or wildcard).

#### Returns

`boolean`

True if the node matches.

***

### getAllPrecedingNodes()

> `protected` **getAllPrecedingNodes**(`node`, `fromPattern`): `XNode`[]

Defined in: [xslt/xslt.ts:2535](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L2535)

Gets all nodes preceding the given node in document order.

#### Parameters

##### node

`XNode`

The reference node.

##### fromPattern

`string` = `null`

Optional pattern to define counting boundary.

#### Returns

`XNode`[]

Array of preceding nodes.

***

### collectDescendants()

> `protected` **collectDescendants**(`node`, `result`): `void`

Defined in: [xslt/xslt.ts:2583](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L2583)

Collects all descendant nodes of a given node.

#### Parameters

##### node

`XNode`

The parent node.

##### result

`XNode`[]

The array to collect into.

#### Returns

`void`

***

### xsltFormatNumbers()

> `protected` **xsltFormatNumbers**(`numbers`, `format`, `groupingSeparator`, `groupingSize`): `string`

Defined in: [xslt/xslt.ts:2601](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L2601)

Formats an array of numbers according to the format string.
For level="multiple", numbers like [1, 2, 3] with format "1.1.1" produce "1.2.3".

#### Parameters

##### numbers

`number`[]

The numbers to format.

##### format

`string`

The format string (e.g., "1", "1.1", "1.a.i").

##### groupingSeparator

`string`

Optional grouping separator.

##### groupingSize

`string`

Optional grouping size.

#### Returns

`string`

The formatted number string.

***

### parseFormatString()

> `protected` **parseFormatString**(`format`): `object`

Defined in: [xslt/xslt.ts:2644](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L2644)

Parses a format string into tokens and separators.
E.g., "1.a.i" -> tokens: ["1", "a", "i"], separators: [".", "."]

#### Parameters

##### format

`string`

The format string.

#### Returns

`object`

Object with tokens and separators arrays.

##### tokens

> **tokens**: `string`[]

##### separators

> **separators**: `string`[]

***

### xsltFormatNumber()

> `protected` **xsltFormatNumber**(`number`, `format`, `groupingSeparator`, `groupingSize`): `string`

Defined in: [xslt/xslt.ts:2701](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L2701)

Formats a number according to the format string.

#### Parameters

##### number

`number`

The number to format.

##### format

`string`

The format string (e.g., "1", "01", "a", "A", "i", "I").

##### groupingSeparator

`string`

Optional grouping separator.

##### groupingSize

`string`

Optional grouping size.

#### Returns

`string`

The formatted number string.

***

### numberToAlpha()

> `protected` **numberToAlpha**(`number`, `uppercase`): `string`

Defined in: [xslt/xslt.ts:2758](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L2758)

Converts a number to alphabetic representation.

#### Parameters

##### number

`number`

The number to convert.

##### uppercase

`boolean`

Whether to use uppercase letters.

#### Returns

`string`

The alphabetic representation.

***

### numberToRoman()

> `protected` **numberToRoman**(`number`): `string`

Defined in: [xslt/xslt.ts:2775](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L2775)

Converts a number to Roman numeral representation.

#### Parameters

##### number

`number`

The number to convert.

#### Returns

`string`

The Roman numeral string.

***

### applyGrouping()

> `protected` **applyGrouping**(`numStr`, `separator`, `size`): `string`

Defined in: [xslt/xslt.ts:2801](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L2801)

Applies grouping separators to a numeric string.

#### Parameters

##### numStr

`string`

The numeric string.

##### separator

`string`

The grouping separator.

##### size

`number`

The grouping size.

#### Returns

`string`

The grouped string.

***

### xsltSort()

> `protected` **xsltSort**(`context`, `template`): `void`

Defined in: [xslt/xslt.ts:2830](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L2830)

Orders the current node list in the input context according to the
sort order specified by xsl:sort child nodes of the current
template node. This happens before the operation specified by the
current template node is executed.

#### Parameters

##### context

[`ExprContext`](ExprContext.md)

The expression context.

##### template

`XNode`

The template node.

#### Returns

`void`

#### Todo

case-order is not implemented.

***

### xsltStripSpace()

> `protected` **xsltStripSpace**(`template`): `void`

Defined in: [xslt/xslt.ts:2855](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L2855)

Implements `xsl:strip-space`.
Collects element name patterns for which whitespace-only text nodes should be stripped.

#### Parameters

##### template

`XNode`

The `<xsl:strip-space>` node.

#### Returns

`void`

***

### xsltPreserveSpace()

> `protected` **xsltPreserveSpace**(`template`): `void`

Defined in: [xslt/xslt.ts:2870](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L2870)

Implements `xsl:preserve-space`.
Collects element name patterns for which whitespace-only text nodes should be preserved.
preserve-space takes precedence over strip-space for matching elements.

#### Parameters

##### template

`XNode`

The `<xsl:preserve-space>` node.

#### Returns

`void`

***

### shouldStripWhitespaceNode()

> `protected` **shouldStripWhitespaceNode**(`textNode`): `boolean`

Defined in: [xslt/xslt.ts:2885](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L2885)

Determines if a text node from the input document should be stripped.
This applies xsl:strip-space and xsl:preserve-space rules to whitespace-only text nodes.

#### Parameters

##### textNode

`XNode`

The text node to check.

#### Returns

`boolean`

True if the text node should be stripped (not included in output).

***

### matchesNamePattern()

> `protected` **matchesNamePattern**(`elementName`, `pattern`, `element`): `boolean`

Defined in: [xslt/xslt.ts:2945](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L2945)

Matches an element name against a strip-space/preserve-space pattern.
Supports:
- "*" matches any element
- "prefix:*" matches any element in a namespace
- "name" matches elements with that local name
- "prefix:name" matches elements with that QName

#### Parameters

##### elementName

`string`

The local name of the element.

##### pattern

`string`

The pattern to match against.

##### element

`XNode`

The element node (for namespace checking).

#### Returns

`boolean`

True if the element matches the pattern.

***

### xsltTemplate()

> `protected` **xsltTemplate**(`context`, `template`, `output?`): `Promise`\<`void`\>

Defined in: [xslt/xslt.ts:2978](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L2978)

Implements `xsl:template`.

#### Parameters

##### context

[`ExprContext`](ExprContext.md)

The Expression Context.

##### template

`XNode`

The `<xsl:template>` node.

##### output?

`XNode`

The output. In general, a fragment that will be used by 
              the caller.

#### Returns

`Promise`\<`void`\>

***

### xsltText()

> `protected` **xsltText**(`context`, `template`, `output?`): `void`

Defined in: [xslt/xslt.ts:3003](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L3003)

#### Parameters

##### context

[`ExprContext`](ExprContext.md)

##### template

`XNode`

##### output?

`XNode`

#### Returns

`void`

***

### validateStylesheetAttributes()

> `protected` **validateStylesheetAttributes**(`stylesheetElement`, `context`): `void`

Defined in: [xslt/xslt.ts:3030](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L3030)

Validates XSLT stylesheet/transform attributes.
According to XSLT specification, validates:
- Required version attribute
- Valid version values (1.0, 2.0, 3.0)
- Valid namespace declarations
- Valid values for optional attributes (extension-element-prefixes, exclude-result-prefixes)

#### Parameters

##### stylesheetElement

`XNode`

The `<xsl:stylesheet>` or `<xsl:transform>` element to validate.

##### context

[`ExprContext`](ExprContext.md)

The Expression Context for namespace access.

#### Returns

`void`

***

### xsltTransformOrStylesheet()

> `protected` **xsltTransformOrStylesheet**(`context`, `template`, `output?`): `Promise`\<`void`\>

Defined in: [xslt/xslt.ts:3148](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L3148)

Implements `<xsl:stylesheet>` and `<xsl:transform>`, and its corresponding
validations.

#### Parameters

##### context

[`ExprContext`](ExprContext.md)

The Expression Context.

##### template

`XNode`

The `<xsl:stylesheet>` or `<xsl:transform>` node.

##### output?

`XNode`

The output. In general, a fragment that will be used by
              the caller.

#### Returns

`Promise`\<`void`\>

***

### xsltValueOf()

> `protected` **xsltValueOf**(`context`, `template`, `output?`): `void`

Defined in: [xslt/xslt.ts:3374](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L3374)

#### Parameters

##### context

[`ExprContext`](ExprContext.md)

##### template

`XNode`

##### output?

`XNode`

#### Returns

`void`

***

### xsltSequence()

> `protected` **xsltSequence**(`context`, `template`, `output?`): `Promise`\<`void`\>

Defined in: [xslt/xslt.ts:3414](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L3414)

Implements `xsl:sequence` (XSLT 2.0).

Constructs a sequence by evaluating the select expression or processing
child content. Unlike xsl:copy-of, xsl:sequence returns nodes by reference
and can return atomic values.

#### Parameters

##### context

[`ExprContext`](ExprContext.md)

The expression context.

##### template

`XNode`

The xsl:sequence element.

##### output?

`XNode`

The output node.

#### Returns

`Promise`\<`void`\>

***

### xsltAnalyzeString()

> `protected` **xsltAnalyzeString**(`context`, `template`, `output?`): `Promise`\<`void`\>

Defined in: [xslt/xslt.ts:3450](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L3450)

Implements `xsl:analyze-string` (XSLT 2.0).

Processes a string using a regular expression, with separate handling
for matching and non-matching substrings.

#### Parameters

##### context

[`ExprContext`](ExprContext.md)

The expression context.

##### template

`XNode`

The xsl:analyze-string element.

##### output?

`XNode`

The output node.

#### Returns

`Promise`\<`void`\>

***

### xsltVariable()

> `protected` **xsltVariable**(`context`, `template`, `override`): `Promise`\<`void`\>

Defined in: [xslt/xslt.ts:3574](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L3574)

Evaluates a variable or parameter and set it in the current input
context. Implements `xsl:variable`, `xsl:param`, and `xsl:with-param`.

#### Parameters

##### context

[`ExprContext`](ExprContext.md)

The expression context.

##### template

`XNode`

The template node.

##### override

`boolean`

flag that defines if the value computed here
overrides the one already in the input context if that is the
case. I.e. decides if this is a default value or a local
value. `xsl:variable` and `xsl:with-param` override; `xsl:param` doesn't.

#### Returns

`Promise`\<`void`\>

***

### xsltChildNodes()

> `protected` **xsltChildNodes**(`context`, `template`, `output?`): `Promise`\<`void`\>

Defined in: [xslt/xslt.ts:3609](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L3609)

Traverses the template node tree. Calls the main processing
function with the current input context for every child node of the
current template node.

#### Parameters

##### context

[`ExprContext`](ExprContext.md)

Normally the Expression Context.

##### template

`XNode`

The XSL-T definition.

##### output?

`XNode`

If set, the output where the transformation should occur.

#### Returns

`Promise`\<`void`\>

***

### xsltChildNodesExcludingConditional()

> `protected` **xsltChildNodesExcludingConditional**(`context`, `template`, `output?`): `Promise`\<`void`\>

Defined in: [xslt/xslt.ts:3628](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L3628)

Processes child nodes while skipping xsl:on-empty and xsl:on-non-empty.
Used by instructions that handle these conditionals explicitly.

#### Parameters

##### context

[`ExprContext`](ExprContext.md)

##### template

`XNode`

##### output?

`XNode`

#### Returns

`Promise`\<`void`\>

***

### xsltPassThrough()

> `protected` **xsltPassThrough**(`context`, `template`, `output`): `Promise`\<`void`\>

Defined in: [xslt/xslt.ts:3695](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L3695)

Passes template text to the output. The current template node does
not specify an XSL-T operation and therefore is appended to the
output with all its attributes. Then continues traversing the
template node tree.

#### Parameters

##### context

[`ExprContext`](ExprContext.md)

The Expression Context.

##### template

`XNode`

The XSLT stylesheet or transformation.

##### output

`XNode`

The output.

#### Returns

`Promise`\<`void`\>

***

### xsltPassText()

> `protected` **xsltPassText**(`template`): `boolean`

Defined in: [xslt/xslt.ts:3761](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L3761)

Determines if a text node in the XSLT template document is to be
stripped according to XSLT whitespace stripping rules.

#### Parameters

##### template

`XNode`

The XSLT template.

#### Returns

`boolean`

TODO

#### See

[XSLT], section 3.4.

#### Todo

Whitespace stripping on the input document is
currently not implemented.

***

### findAttributeInContext()

> `protected` **findAttributeInContext**(`attributeName`, `context`): `XNode`

Defined in: [xslt/xslt.ts:3789](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L3789)

#### Parameters

##### attributeName

`string`

##### context

[`ExprContext`](ExprContext.md)

#### Returns

`XNode`

***

### xsltAttributeValue()

> `protected` **xsltAttributeValue**(`value`, `context`): `any`

Defined in: [xslt/xslt.ts:3804](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L3804)

Evaluates an XSL-T attribute value template. Attribute value
templates are attributes on XSL-T elements that contain XPath
expressions in braces {}. The XSL-T expressions are evaluated in
the current input context.

#### Parameters

##### value

`any`

TODO

##### context

[`ExprContext`](ExprContext.md)

TODO

#### Returns

`any`

TODO

***

### xsltTextValueTemplate()

> `protected` **xsltTextValueTemplate**(`value`, `context`): `string`

Defined in: [xslt/xslt.ts:3835](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L3835)

Evaluates text value templates in XSLT 3.0. Text value templates
allow XPath expressions in braces {} within text nodes.
The expressions are evaluated in the current input context.
To include a literal brace, use {{ or }}.

#### Parameters

##### value

`string`

The text node value to process

##### context

[`ExprContext`](ExprContext.md)

The expression context

#### Returns

`string`

The processed text with expressions evaluated

***

### xsltMatch()

> `protected` **xsltMatch**(`match`, `context`, `axis?`): `XNode`[]

Defined in: [xslt/xslt.ts:3915](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L3915)

Evaluates an XPath expression in the current input context as a
match.

#### Parameters

##### match

`string`

TODO

##### context

[`ExprContext`](ExprContext.md)

The Expression Context.

##### axis?

`string`

The XPath axis. Used when the match does not start with the parent.

#### Returns

`XNode`[]

A list of the found nodes.

#### See

[XSLT] section 5.2, paragraph 1

***

### xsltWithParam()

> `protected` **xsltWithParam**(`context`, `template`): `Promise`\<`void`\>

Defined in: [xslt/xslt.ts:3928](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L3928)

Sets parameters defined by xsl:with-param child nodes of the
current template node, in the current input context. This happens
before the operation specified by the current template node is
executed.

#### Parameters

##### context

[`ExprContext`](ExprContext.md)

The Expression Context.

##### template

`XNode`

The template node.

#### Returns

`Promise`\<`void`\>

***

### applyAttributeSets()

> `protected` **applyAttributeSets**(`context`, `element`, `setNames`): `Promise`\<`void`\>

Defined in: [xslt/xslt.ts:3993](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L3993)

Apply one or more attribute sets to an element.
Parses space-separated attribute set names and applies them.

#### Parameters

##### context

[`ExprContext`](ExprContext.md)

The Expression Context.

##### element

`XNode`

The element to apply attributes to.

##### setNames

`string`

Space-separated attribute set names.

#### Returns

`Promise`\<`void`\>

***

### isExtensionElementSupported()

> `protected` **isExtensionElementSupported**(`node`): `boolean`

Defined in: [xslt/xslt.ts:4073](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L4073)

Test if an element is a supported extension.
Returns false for unrecognized elements in non-XSLT namespaces.

#### Parameters

##### node

`XNode`

The element to test.

#### Returns

`boolean`

True if the element is supported, false if it's an unrecognized extension.

***

### getFallbackElement()

> `protected` **getFallbackElement**(`node`): `XNode`

Defined in: [xslt/xslt.ts:4107](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L4107)

Get the fallback element from an extension element if it exists.
Searches for the first direct xsl:fallback child.

#### Parameters

##### node

`XNode`

The extension element.

#### Returns

`XNode`

The fallback element, or null if not found.

***

### xsltExtensionElement()

> `protected` **xsltExtensionElement**(`context`, `element`, `output?`): `Promise`\<`void`\>

Defined in: [xslt/xslt.ts:4126](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L4126)

Process an extension element with fallback support.
If a fallback is defined, executes it; otherwise treats element as literal.

#### Parameters

##### context

[`ExprContext`](ExprContext.md)

The Expression Context.

##### element

`XNode`

The extension element.

##### output?

`XNode`

The output node.

#### Returns

`Promise`\<`void`\>

***

### isXsltElement()

> `protected` **isXsltElement**(`element`, `opt_wantedName?`): `boolean`

Defined in: [xslt/xslt.ts:4150](https://github.com/DesignLiquido/xslt-processor/blob/main/src/xslt/xslt.ts#L4150)

Test if the given element is an XSLT element, optionally the one with the given name.

#### Parameters

##### element

`XNode`

The element.

##### opt\_wantedName?

`string`

The name for comparison.

#### Returns

`boolean`

True, if element is an XSL node. False otherwise.
