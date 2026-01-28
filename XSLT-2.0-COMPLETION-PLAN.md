# XSLT 2.0 Completion Plan

This document outlines the plan to achieve XSLT 2.0 specification compliance for the xslt-processor project.

**Current Status**: ~55% XSLT 2.0 compliant (Phase 1 complete + xsl:sequence, xsl:analyze-string, xsl:for-each-group)
**Target**: 90%+ XSLT 2.0 compliant (excluding schema-aware features)
**Reference**: [W3C XSLT 2.0 Specification](https://www.w3.org/TR/xslt20/)
**XPath Reference**: [W3C XPath 2.0 Specification](https://www.w3.org/TR/xpath20/)
**Prerequisites**: XSLT 1.0 Complete (35/35 elements)

---

## Overview: What's New in XSLT 2.0

XSLT 2.0 (published 2007) introduces significant enhancements over XSLT 1.0:

### Major New Features
1. **User-defined functions** (`xsl:function`) - Write reusable XPath functions in XSLT
2. **Grouping** (`xsl:for-each-group`) - Powerful data grouping capabilities
3. **Regular expressions** (`xsl:analyze-string`) - Full regex support in XSLT
4. **Multiple output documents** (`xsl:result-document`) - Generate multiple files
5. **Sequences** (`xsl:sequence`) - First-class sequence support
6. **Temporary trees** - Variables can hold result trees directly
7. **Schema awareness** - Optional XML Schema validation (Basic vs Schema-Aware)

### XPath 2.0 Integration
- Sequences (ordered collections replacing node-sets)
- New type system with atomic types
- 100+ new functions
- For expressions, if/then/else, quantified expressions
- Type casting and instance-of testing

---

## Current Implementation Status

### What's Already Implemented

| Category | Status | Details |
|----------|--------|---------|
| Version detection | ✅ Complete | Routes `version="2.0"` correctly |
| XPath 2.0 parser | ✅ Complete | For/if/quantified expressions work |
| String regex functions | ✅ Complete | `matches()`, `replace()`, `tokenize()` |
| Sequence functions | ✅ Complete | `empty()`, `exists()`, `head()`, `tail()`, etc. |
| String functions | ✅ Complete | `upper-case()`, `lower-case()`, `ends-with()` |
| Forwards-compatible mode | ✅ Complete | Graceful handling of version > 1.0 |

### What's Missing

| Category | Status | Priority |
|----------|--------|----------|
| XSLT 2.0 elements (7 new) | ❌ Not started | HIGH |
| XSLT 2.0 element enhancements | ❌ Not started | MEDIUM |
| XPath 2.0 type constructors | ✅ **COMPLETE** | HIGH |
| XPath 2.0 date/time functions | ✅ Complete | MEDIUM |
| XPath 2.0 numeric functions | ✅ Complete | MEDIUM |

---

## Phase 1: Core XPath 2.0 Functions (Priority: HIGH)

### 1.1 Type Constructor Functions ✅ COMPLETE

**Spec Section**: XPath 2.0 Section 17 (Casting)

**Status**: ✅ **IMPLEMENTED** - All 32 type constructors registered in `BUILT_IN_FUNCTIONS`

These functions convert values to specific types:

| Function | Signature | Status |
|----------|-----------|--------|
| `xs:string` | `xs:string($arg as item()?) as xs:string` | ✅ |
| `xs:boolean` | `xs:boolean($arg as item()?) as xs:boolean` | ✅ |
| `xs:decimal` | `xs:decimal($arg as xs:anyAtomicType?) as xs:decimal` | ✅ |
| `xs:float` | `xs:float($arg as xs:anyAtomicType?) as xs:float` | ✅ |
| `xs:double` | `xs:double($arg as xs:anyAtomicType?) as xs:double` | ✅ |
| `xs:integer` | `xs:integer($arg as xs:anyAtomicType?) as xs:integer` | ✅ |
| `xs:date` | `xs:date($arg as xs:anyAtomicType?) as xs:date` | ✅ |
| `xs:time` | `xs:time($arg as xs:anyAtomicType?) as xs:time` | ✅ |
| `xs:dateTime` | `xs:dateTime($arg as xs:anyAtomicType?) as xs:dateTime` | ✅ |
| `xs:duration` | `xs:duration($arg as xs:anyAtomicType?) as xs:duration` | ✅ |
| `xs:anyURI` | `xs:anyURI($arg as xs:anyAtomicType?) as xs:anyURI` | ✅ |
| `xs:QName` | `xs:QName($arg as xs:anyAtomicType?) as xs:QName` | ✅ |
| `xs:untypedAtomic` | `xs:untypedAtomic($arg) as xs:untypedAtomic` | ✅ |
| `xs:gYearMonth` | `xs:gYearMonth($arg) as xs:gYearMonth` | ✅ |
| `xs:gYear` | `xs:gYear($arg) as xs:gYear` | ✅ |
| `xs:gMonthDay` | `xs:gMonthDay($arg) as xs:gMonthDay` | ✅ |
| `xs:gDay` | `xs:gDay($arg) as xs:gDay` | ✅ |
| `xs:gMonth` | `xs:gMonth($arg) as xs:gMonth` | ✅ |
| `xs:hexBinary` | `xs:hexBinary($arg) as xs:hexBinary` | ✅ |
| `xs:base64Binary` | `xs:base64Binary($arg) as xs:base64Binary` | ✅ |
| `xs:long` | `xs:long($arg) as xs:long` | ✅ |
| `xs:int` | `xs:int($arg) as xs:int` | ✅ |
| `xs:short` | `xs:short($arg) as xs:short` | ✅ |
| `xs:byte` | `xs:byte($arg) as xs:byte` | ✅ |
| `xs:nonPositiveInteger` | `xs:nonPositiveInteger($arg)` | ✅ |
| `xs:negativeInteger` | `xs:negativeInteger($arg)` | ✅ |
| `xs:nonNegativeInteger` | `xs:nonNegativeInteger($arg)` | ✅ |
| `xs:positiveInteger` | `xs:positiveInteger($arg)` | ✅ |
| `xs:unsignedLong` | `xs:unsignedLong($arg)` | ✅ |
| `xs:unsignedInt` | `xs:unsignedInt($arg)` | ✅ |
| `xs:unsignedShort` | `xs:unsignedShort($arg)` | ✅ |
| `xs:unsignedByte` | `xs:unsignedByte($arg)` | ✅ |

**Implementation**: `src/xpath/lib/src/expressions/function-call-expression.ts` (BUILT_IN_FUNCTIONS)
**Tests**: `src/xpath/lib/tests/type-constructors.test.ts` (39 tests)

---

### 1.2 Numeric Functions ✅ COMPLETE

**Spec Section**: XPath 2.0 Section 6.4

**Status**: ✅ **IMPLEMENTED** in `numeric-functions.ts` and `BUILT_IN_FUNCTIONS`

| Function | Signature | Status |
|----------|-----------|--------|
| `abs` | `fn:abs($arg as numeric?) as numeric?` | ✅ |
| `round-half-to-even` | `fn:round-half-to-even($arg, $precision?) as numeric?` | ✅ |
| `avg` | `fn:avg($arg as xs:anyAtomicType*) as xs:anyAtomicType?` | ✅ |
| `min` | `fn:min($arg, $collation?) as xs:anyAtomicType?` | ✅ |
| `max` | `fn:max($arg, $collation?) as xs:anyAtomicType?` | ✅ |

**Implementation**: `src/xpath/lib/src/functions/numeric-functions.ts`

---

### 1.3 Date/Time Functions ✅ COMPLETE

**Spec Section**: XPath 2.0 Section 10

**Status**: ✅ **IMPLEMENTED** in `datetime-functions.ts`

| Function | Signature | Status |
|----------|-----------|--------|
| `current-dateTime` | `fn:current-dateTime() as xs:dateTime` | ✅ |
| `current-date` | `fn:current-date() as xs:date` | ✅ |
| `current-time` | `fn:current-time() as xs:time` | ✅ |
| `implicit-timezone` | `fn:implicit-timezone() as xs:dayTimeDuration` | ✅ |
| `year-from-dateTime` | `fn:year-from-dateTime($arg) as xs:integer?` | ✅ |
| `month-from-dateTime` | `fn:month-from-dateTime($arg) as xs:integer?` | ✅ |
| `day-from-dateTime` | `fn:day-from-dateTime($arg) as xs:integer?` | ✅ |
| `hours-from-dateTime` | `fn:hours-from-dateTime($arg) as xs:integer?` | ✅ |
| `minutes-from-dateTime` | `fn:minutes-from-dateTime($arg) as xs:integer?` | ✅ |
| `seconds-from-dateTime` | `fn:seconds-from-dateTime($arg) as xs:decimal?` | ✅ |
| `timezone-from-dateTime` | `fn:timezone-from-dateTime($arg) as xs:dayTimeDuration?` | ✅ |
| `year-from-date` | `fn:year-from-date($arg) as xs:integer?` | ✅ |
| `month-from-date` | `fn:month-from-date($arg) as xs:integer?` | ✅ |
| `day-from-date` | `fn:day-from-date($arg) as xs:integer?` | ✅ |
| `hours-from-time` | `fn:hours-from-time($arg) as xs:integer?` | ✅ |
| `minutes-from-time` | `fn:minutes-from-time($arg) as xs:integer?` | ✅ |
| `seconds-from-time` | `fn:seconds-from-time($arg) as xs:decimal?` | ✅ |
| `timezone-from-time` | `fn:timezone-from-time($arg) as xs:dayTimeDuration?` | ✅ |
| `adjust-dateTime-to-timezone` | `fn:adjust-dateTime-to-timezone($arg, $tz?)` | ✅ |
| `adjust-date-to-timezone` | `fn:adjust-date-to-timezone($arg, $tz?)` | ✅ |
| `adjust-time-to-timezone` | `fn:adjust-time-to-timezone($arg, $tz?)` | ✅ |

**Implementation**: `src/xpath/lib/src/functions/datetime-functions.ts`

---

### 1.4 Duration Functions ✅ COMPLETE

**Spec Section**: XPath 2.0 Section 10.4

**Status**: ✅ **IMPLEMENTED** in `datetime-functions.ts`

| Function | Signature | Status |
|----------|-----------|--------|
| `years-from-duration` | `fn:years-from-duration($arg) as xs:integer?` | ✅ |
| `months-from-duration` | `fn:months-from-duration($arg) as xs:integer?` | ✅ |
| `days-from-duration` | `fn:days-from-duration($arg) as xs:integer?` | ✅ |
| `hours-from-duration` | `fn:hours-from-duration($arg) as xs:integer?` | ✅ |
| `minutes-from-duration` | `fn:minutes-from-duration($arg) as xs:integer?` | ✅ |
| `seconds-from-duration` | `fn:seconds-from-duration($arg) as xs:decimal?` | ✅ |

**Implementation**: `src/xpath/lib/src/functions/datetime-functions.ts`

---

### 1.5 QName Functions ✅ COMPLETE

**Spec Section**: XPath 2.0 Section 11

**Status**: ✅ **IMPLEMENTED** - All 7 QName functions registered in `BUILT_IN_FUNCTIONS`

| Function | Signature | Status |
|----------|-----------|--------|
| `QName` | `fn:QName($uri as xs:string?, $qname as xs:string) as xs:QName` | ✅ |
| `local-name-from-QName` | `fn:local-name-from-QName($arg as xs:QName?) as xs:NCName?` | ✅ |
| `namespace-uri-from-QName` | `fn:namespace-uri-from-QName($arg as xs:QName?) as xs:anyURI?` | ✅ |
| `prefix-from-QName` | `fn:prefix-from-QName($arg as xs:QName?) as xs:NCName?` | ✅ |
| `resolve-QName` | `fn:resolve-QName($qname, $element) as xs:QName?` | ✅ |
| `in-scope-prefixes` | `fn:in-scope-prefixes($element as element()) as xs:string*` | ✅ |
| `namespace-uri-for-prefix` | `fn:namespace-uri-for-prefix($prefix, $element) as xs:anyURI?` | ✅ |

**Implementation**: `src/xpath/lib/src/functions/qname-functions.ts`
**Registration**: `src/xpath/lib/src/expressions/function-call-expression.ts` (BUILT_IN_FUNCTIONS)
**Tests**: `src/xpath/lib/tests/qname-functions.test.ts` (28 tests)

---

### 1.6 URI Functions ✅ COMPLETE

**Spec Section**: XPath 2.0 Section 8

**Status**: ✅ **IMPLEMENTED** - All 4 URI functions registered in `BUILT_IN_FUNCTIONS`

| Function | Signature | Status |
|----------|-----------|--------|
| `resolve-uri` | `fn:resolve-uri($relative, $base?) as xs:anyURI?` | ✅ |
| `encode-for-uri` | `fn:encode-for-uri($uri as xs:string?) as xs:string` | ✅ |
| `iri-to-uri` | `fn:iri-to-uri($iri as xs:string?) as xs:string` | ✅ |
| `escape-html-uri` | `fn:escape-html-uri($uri as xs:string?) as xs:string` | ✅ |

**Implementation**: `src/xpath/lib/src/functions/uri-functions.ts`
**Registration**: `src/xpath/lib/src/expressions/function-call-expression.ts` (BUILT_IN_FUNCTIONS)
**Tests**: `src/xpath/lib/tests/uri-functions.test.ts` (22 tests)

---

### 1.7 Node Functions (XPath 2.0 Enhanced) ✅ COMPLETE

**Status**: ✅ **IMPLEMENTED** - All 4 enhanced node functions + additional functions registered in `BUILT_IN_FUNCTIONS`

| Function | Signature | Status |
|----------|-----------|--------|
| `root` | `fn:root($arg as node()?) as node()?` | ✅ |
| `base-uri` | `fn:base-uri($arg as node()?) as xs:anyURI?` | ✅ |
| `document-uri` | `fn:document-uri($arg as node()?) as xs:anyURI?` | ✅ |
| `nilled` | `fn:nilled($arg as node()?) as xs:boolean?` | ✅ |
| `node-name` | `fn:node-name($arg as node()?) as xs:QName?` | ✅ |
| `data` | `fn:data($arg as item()*) as xs:anyAtomicType*` | ✅ |
| `lang` | `fn:lang($testlang, $node?) as xs:boolean` | ✅ |

**Implementation**: `src/xpath/lib/src/functions/node-functions.ts`
**Registration**: `src/xpath/lib/src/expressions/function-call-expression.ts` (BUILT_IN_FUNCTIONS)
**Tests**: `src/xpath/lib/tests/node-functions.test.ts` (28 tests)

---

### 1.8 Data/Atomization Functions ✅ COMPLETE

**Status**: ✅ **IMPLEMENTED** - All cardinality functions registered in `BUILT_IN_FUNCTIONS`

| Function | Signature | Status | Notes |
|----------|-----------|--------|-------|
| `data` | `fn:data($arg as item()*) as xs:anyAtomicType*` | ✅ | In 1.7 |
| `string-join` | `fn:string-join($strings, $sep) as xs:string` | ✅ | Already implemented |
| `subsequence` | `fn:subsequence($src, $start, $length?) as item()*` | ✅ | Already implemented |
| `unordered` | `fn:unordered($src as item()*) as item()*` | ✅ | |
| `zero-or-one` | `fn:zero-or-one($arg as item()*) as item()?` | ✅ | Cardinality check |
| `one-or-more` | `fn:one-or-more($arg as item()*) as item()+` | ✅ | Cardinality check |
| `exactly-one` | `fn:exactly-one($arg as item()*) as item()` | ✅ | Cardinality check |

**Implementation**: `src/xpath/lib/src/functions/sequence-functions.ts`
**Registration**: `src/xpath/lib/src/expressions/function-call-expression.ts` (BUILT_IN_FUNCTIONS)
**Tests**: `src/xpath/lib/tests/cardinality-functions.test.ts` (16 tests)

---

## Phase 2: Core XSLT 2.0 Elements (Priority: HIGH)

### 2.1 xsl:sequence ✅ COMPLETE

**Spec Section**: XSLT 2.0 Section 11.3

**Purpose**: Construct a sequence from any items (nodes, atomic values, or mixed).

```xml
<xsl:sequence select="expression"/>
```

**Attributes**:
| Attribute | Required | Description |
|-----------|----------|-------------|
| `select` | No | XPath expression returning sequence |

**Implementation Notes**:
- Returns the result of evaluating `select` directly
- Does NOT create a document fragment (unlike `xsl:copy-of`)
- Essential for returning atomic values from templates
- When `select` is omitted, processes child content

**Status**: ✅ **IMPLEMENTED**

**Implementation**: `src/xslt/xslt.ts` (`xsltSequence` method)
**Tests**: `tests/xslt/sequence.test.ts` (9 tests)

---

### 2.2 xsl:analyze-string ✅ COMPLETE

**Spec Section**: XSLT 2.0 Section 15

**Purpose**: Process a string using regular expressions, with separate handling for matching and non-matching substrings.

```xml
<xsl:analyze-string select="string-expression" regex="pattern" flags="flags?">
    <xsl:matching-substring>
        <!-- Content for matches -->
    </xsl:matching-substring>
    <xsl:non-matching-substring>
        <!-- Content for non-matches -->
    </xsl:non-matching-substring>
</xsl:analyze-string>
```

**Attributes**:
| Attribute | Required | Description |
|-----------|----------|-------------|
| `select` | Yes | String to analyze |
| `regex` | Yes | Regular expression pattern |
| `flags` | No | Regex flags (s, m, i, x) |

**Child Elements**:
- `xsl:matching-substring` - Template for matched portions
- `xsl:non-matching-substring` - Template for unmatched portions
- `xsl:fallback` - For backwards compatibility

**Context Functions Available in Matching**:
- `regex-group(n)` - Returns the nth captured group (0 = full match, 1+ = capture groups)

**Status**: ✅ **IMPLEMENTED**

**Implementation**:
- `src/xslt/xslt.ts` (`xsltAnalyzeString` method)
- `src/xpath/lib/src/expressions/function-call-expression.ts` (`regex-group` function)
- `src/xpath/expr-context.ts` (`regexGroups` property, `getRegexGroup` method)
- `src/xpath/xpath.ts` (regex groups passed via `extensions`)

**Tests**: `tests/xslt/analyze-string.test.ts` (11 tests)

---

### 2.3 xsl:for-each-group ✅ COMPLETE

**Spec Section**: XSLT 2.0 Section 14

**Purpose**: Group items and process each group. Most powerful grouping mechanism in any XSLT version.

```xml
<xsl:for-each-group select="expression" group-by="key-expression">
    <!-- Process each group -->
</xsl:for-each-group>
```

**Grouping Methods** (mutually exclusive):

| Attribute | Description |
|-----------|-------------|
| `group-by` | Group by computed key value |
| `group-adjacent` | Group adjacent items with same key |
| `group-starting-with` | Start new group when pattern matches |
| `group-ending-with` | End group when pattern matches |

**Attributes**:
| Attribute | Required | Description |
|-----------|----------|-------------|
| `select` | Yes | Items to group |
| `group-by` | One of 4 | Key expression for grouping |
| `group-adjacent` | One of 4 | Key for adjacent grouping |
| `group-starting-with` | One of 4 | Pattern starting groups |
| `group-ending-with` | One of 4 | Pattern ending groups |
| `collation` | No | Collation URI for string comparison |

**Context Functions Available**:
- `current-group()` - Returns all items in current group
- `current-grouping-key()` - Returns the key of current group

**Status**: ✅ **IMPLEMENTED**

**Implementation**:
- `src/xslt/xslt.ts` (`xsltForEachGroup` method + grouping helper methods)
- `src/xpath/lib/src/expressions/function-call-expression.ts` (`current-group`, `current-grouping-key` functions)
- `src/xpath/expr-context.ts` (`currentGroup`, `currentGroupingKey` properties)
- `src/xpath/xpath.ts` (group context passed via `extensions`)

**Tests**: `tests/xslt/for-each-group.test.ts` (14 tests)

---

### 2.4 xsl:function

**Spec Section**: XSLT 2.0 Section 10.3

**Purpose**: Define reusable functions callable from XPath expressions.

```xml
<xsl:function name="my:double" as="xs:integer">
    <xsl:param name="n" as="xs:integer"/>
    <xsl:sequence select="$n * 2"/>
</xsl:function>
```

**Attributes**:
| Attribute | Required | Description |
|-----------|----------|-------------|
| `name` | Yes | QName of function (must be in non-null namespace) |
| `as` | No | Return type (SequenceType) |
| `override` | No | Whether to override functions from other modules |

**Child Elements**:
- `xsl:param` - Function parameters (positional, not named)

**Implementation Notes**:
- Functions must be in a non-null namespace (prevents conflict with XPath functions)
- Parameters are positional only (no named parameters like `xsl:call-template`)
- Must be a top-level element
- Can be recursive
- Body is a sequence constructor

**Status**: ❌ Not Implemented

---

### 2.5 xsl:result-document

**Spec Section**: XSLT 2.0 Section 19

**Purpose**: Create additional output documents (multiple file output).

```xml
<xsl:result-document href="output-file.xml" method="xml">
    <!-- Content for this document -->
</xsl:result-document>
```

**Attributes**:
| Attribute | Required | Description |
|-----------|----------|-------------|
| `href` | No | URI of output document |
| `format` | No | Named `xsl:output` to use |
| `method` | No | Output method (xml, html, text, xhtml) |
| `encoding` | No | Character encoding |
| `indent` | No | Whether to indent output |
| `... (output attributes)` | No | All `xsl:output` attributes supported |

**Implementation Notes**:
- In browser/Node.js context, needs callback mechanism for output handling
- Nested `xsl:result-document` is an error
- Cannot use inside `xsl:variable` with `as` attribute
- URI resolution relative to base output URI

**Status**: ❌ Not Implemented

---

### 2.6 xsl:perform-sort

**Spec Section**: XSLT 2.0 Section 13.2

**Purpose**: Sort a sequence without iterating over it (returns sorted sequence).

```xml
<xsl:perform-sort select="expression">
    <xsl:sort select="key" order="ascending|descending"/>
</xsl:perform-sort>
```

**Attributes**:
| Attribute | Required | Description |
|-----------|----------|-------------|
| `select` | No | Sequence to sort (or use sequence constructor) |

**Child Elements**:
- `xsl:sort` - Sort specifications (one or more)

**Status**: ❌ Not Implemented

---

### 2.7 xsl:namespace

**Spec Section**: XSLT 2.0 Section 11.6

**Purpose**: Create namespace nodes programmatically.

```xml
<xsl:namespace name="prefix" select="'http://example.com/ns'"/>
```

**Attributes**:
| Attribute | Required | Description |
|-----------|----------|-------------|
| `name` | Yes | Namespace prefix (or empty for default) |
| `select` | No | Namespace URI expression |

**Status**: ❌ Not Implemented

---

## Phase 3: XSLT 2.0 Element Enhancements (Priority: MEDIUM)

### 3.1 Enhanced xsl:template

**New Attributes**:
| Attribute | Description | Status |
|-----------|-------------|--------|
| `as` | Return type declaration | ❌ |

**New `mode` Features**:
- Multiple modes: `mode="mode1 mode2 mode3"`
- Default mode: `mode="#default"`
- All modes: `mode="#all"`

**Status**: ❌ Not Implemented

---

### 3.2 Enhanced xsl:apply-templates

**New Attributes**:
| Attribute | Description | Status |
|-----------|-------------|--------|
| `mode` | Now supports `#current`, `#default` | ⚠️ Partial |

**Status**: ⚠️ Partial (basic mode works, special values don't)

---

### 3.3 Enhanced xsl:variable / xsl:param

**New Attributes**:
| Attribute | Description | Status |
|-----------|-------------|--------|
| `as` | Type declaration | ❌ |
| `required` | (xsl:param only) Parameter is required | ❌ |
| `tunnel` | (xsl:param only) Tunnel parameter | ❌ |

**Temporary Trees**:
- Variables can now hold trees directly (no need for `node-set()` extension)
- Use `as="node()*"` to create temporary tree

**Status**: ❌ Not Implemented

---

### 3.4 Enhanced xsl:with-param

**New Attributes**:
| Attribute | Description | Status |
|-----------|-------------|--------|
| `as` | Type declaration | ❌ |
| `tunnel` | Pass as tunnel parameter | ❌ |

**Status**: ❌ Not Implemented

---

### 3.5 Enhanced xsl:output

**New Attributes**:
| Attribute | Description | Status |
|-----------|-------------|--------|
| `byte-order-mark` | Include BOM | ❌ |
| `escape-uri-attributes` | Escape URIs in HTML | ❌ |
| `include-content-type` | Include meta tag | ❌ |
| `normalization-form` | Unicode normalization | ❌ |
| `undeclare-prefixes` | Allow xmlns:prefix="" | ❌ |
| `use-character-maps` | Reference character maps | ❌ |

**New `method` Values**:
- `xhtml` - XHTML serialization

**Status**: ❌ Not Implemented

---

### 3.6 xsl:character-map

**Spec Section**: XSLT 2.0 Section 20.2

**Purpose**: Define character substitutions for serialization.

```xml
<xsl:character-map name="special-chars">
    <xsl:output-character character="&#xa0;" string="&amp;nbsp;"/>
</xsl:character-map>
```

**Status**: ❌ Not Implemented

---

### 3.7 xsl:import-schema

**Spec Section**: XSLT 2.0 Section 3.13

**Purpose**: Import XML Schema for schema-aware processing.

```xml
<xsl:import-schema namespace="http://example.com/ns" schema-location="schema.xsd"/>
```

**Note**: This is for "Schema-Aware" XSLT 2.0. Basic XSLT 2.0 does not require schema support.

**Status**: ❌ Not Implemented (LOW PRIORITY - Schema-Aware feature)

---

## Phase 4: Context Functions (Priority: HIGH)

These functions are available in specific XSLT 2.0 contexts:

### 4.1 Grouping Context Functions ✅ COMPLETE

| Function | Context | Description | Status |
|----------|---------|-------------|--------|
| `current-group()` | xsl:for-each-group | Items in current group | ✅ |
| `current-grouping-key()` | xsl:for-each-group | Key of current group | ✅ |

---

### 4.2 Regex Context Functions ✅ COMPLETE

| Function | Context | Description | Status |
|----------|---------|-------------|--------|
| `regex-group($n)` | xsl:matching-substring | Captured group N | ✅ |

---

### 4.3 Formatting Functions

| Function | Description | Status |
|----------|-------------|--------|
| `format-number` | Format number (enhanced) | ✅ (1.0 version) |
| `format-dateTime` | Format date/time | ❌ |
| `format-date` | Format date | ❌ |
| `format-time` | Format time | ❌ |
| `format-integer` | Format integer with words | ❌ |

---

## Phase 5: Advanced Features (Priority: LOW)

### 5.1 Multiple Modes

**Spec Section**: XSLT 2.0 Section 6.1

Support for:
- `mode="#all"` - Template matches all modes
- `mode="#default"` - Explicit default mode
- `mode="m1 m2 m3"` - Template matches multiple modes
- `mode="#current"` - Continue with current mode

**Status**: ❌ Not Implemented

---

### 5.2 Tunnel Parameters

**Spec Section**: XSLT 2.0 Section 10.1.1

Parameters passed implicitly through template calls:

```xml
<xsl:apply-templates>
    <xsl:with-param name="debug" tunnel="yes" select="true()"/>
</xsl:apply-templates>

<!-- Deep in the call chain -->
<xsl:template match="item">
    <xsl:param name="debug" tunnel="yes"/>
    <!-- $debug is available here without explicit passing -->
</xsl:template>
```

**Status**: ❌ Not Implemented

---

### 5.3 Attribute Value Templates in More Places

XSLT 2.0 allows AVTs in more attributes:
- `xsl:namespace/@name`
- `xsl:attribute/@separator`
- And others

**Status**: ⚠️ Partial (some AVTs work)

---

### 5.4 Default Collation

**Spec Section**: XSLT 2.0 Section 5.4.1

```xml
<xsl:stylesheet default-collation="http://www.w3.org/2005/xpath-functions/collation/codepoint">
```

**Status**: ❌ Not Implemented

---

## Phase 6: Test Coverage (Priority: HIGH)

### 6.1 Create XSLT 2.0 Test Suite

Create comprehensive tests in `tests/xslt/xslt-20/`:

| Test File | Coverage |
|-----------|----------|
| `sequence.test.ts` | xsl:sequence element |
| `analyze-string.test.ts` | xsl:analyze-string + regex-group() |
| `for-each-group.test.ts` | All grouping methods |
| `function.test.ts` | xsl:function definitions |
| `result-document.test.ts` | Multiple output |
| `perform-sort.test.ts` | Sequence sorting |
| `namespace.test.ts` | xsl:namespace element |
| `enhanced-elements.test.ts` | Type attributes, modes |

---

### 6.2 XPath 2.0 Function Tests

Create comprehensive tests in `tests/xpath/xpath-20/`:

| Test File | Coverage |
|-----------|----------|
| `type-constructors.test.ts` | xs:* functions |
| `date-time.test.ts` | Date/time functions |
| `duration.test.ts` | Duration functions |
| `qname.test.ts` | QName functions |
| `uri.test.ts` | URI functions |
| `sequences.test.ts` | Sequence manipulation |
| `cardinality.test.ts` | zero-or-one, exactly-one, etc. |

---

## Implementation Order Summary

### Immediate (Enables Most Features):
1. ✅ **xsl:sequence** (Phase 2.1) - Foundation for return values
2. ✅ **Type constructors** (Phase 1.1) - xs:string, xs:integer, etc.
3. ✅ **Date/time functions** (Phase 1.3) - Common requirement

### Short-term (High Value):
4. ✅ **xsl:analyze-string** (Phase 2.2) - Regex processing
5. ✅ **xsl:for-each-group** (Phase 2.3) - Powerful grouping
6. **xsl:function** (Phase 2.4) - User-defined functions

### Medium-term (Complete Feature Set):
7. **xsl:result-document** (Phase 2.5) - Multiple outputs
8. **xsl:perform-sort** (Phase 2.6) - Sequence sorting
9. **Enhanced elements** (Phase 3) - Type attributes

### Long-term (Polish):
10. **Tunnel parameters** (Phase 5.2)
11. **Multiple modes** (Phase 5.1)
12. **Character maps** (Phase 3.6)

---

## Estimated Work Breakdown

| Phase | Description | Complexity | Priority | Estimate |
|-------|-------------|------------|----------|----------|
| 1.1 | Type constructors | Medium | ✅ DONE | - |
| 1.2 | Numeric functions | Medium | ✅ DONE | - |
| 1.3 | Date/time functions | Medium | ✅ DONE | - |
| 1.4 | Duration functions | Medium | ✅ DONE | - |
| 1.5 | QName functions | Low | ✅ DONE | - |
| 1.6 | URI functions | Low | ✅ DONE | - |
| 1.7 | Node functions | Low | ✅ DONE | - |
| 1.8 | Cardinality functions | Low | ✅ DONE | - |
| 2.1 | xsl:sequence | Low | ✅ DONE | - |
| 2.2 | xsl:analyze-string | Medium | ✅ DONE | - |
| 2.3 | xsl:for-each-group | High | ✅ DONE | - |
| 2.4 | xsl:function | High | HIGH | 1.5 weeks |
| 2.5 | xsl:result-document | Medium | MEDIUM | 1 week |
| 2.6 | xsl:perform-sort | Low | MEDIUM | 3 days |
| 3.x | Element enhancements | Medium | MEDIUM | 1 week |
| 5.x | Advanced features | Medium | LOW | 2 weeks |
| 6.x | Test coverage | Medium | HIGH | Ongoing |

**Total Estimated**: 10-12 weeks for core XSLT 2.0 compliance

---

## Success Criteria

The XSLT 2.0 implementation will be considered complete when:

1. ❌ All 7 new XSLT 2.0 elements implemented
2. ❌ All XSLT 2.0 element enhancements implemented
3. ❌ Core XPath 2.0 functions (type constructors, dates) implemented
4. ❌ Grouping context functions (current-group, etc.) working
5. ❌ Regex context function (regex-group) working
6. ❌ Test coverage for all XSLT 2.0 features
7. ❌ Version-specific behavior tests pass

**Note**: Schema-aware features (xsl:import-schema, type validation) are NOT required for Basic XSLT 2.0 compliance.

---

## Appendix A: XSLT 2.0 New Element Reference

| # | Element | Purpose | Priority |
|---|---------|---------|----------|
| 1 | `xsl:analyze-string` | Regex string processing | HIGH |
| 2 | `xsl:character-map` | Output character mapping | LOW |
| 3 | `xsl:for-each-group` | Grouping items | HIGH |
| 4 | `xsl:function` | User-defined functions | HIGH |
| 5 | `xsl:import-schema` | Schema import | LOW (Schema-Aware) |
| 6 | `xsl:matching-substring` | Content for regex matches | HIGH |
| 7 | `xsl:namespace` | Create namespace nodes | MEDIUM |
| 8 | `xsl:next-match` | Continue to next matching template | MEDIUM |
| 9 | `xsl:non-matching-substring` | Content for regex non-matches | HIGH |
| 10 | `xsl:output-character` | Character map entry | LOW |
| 11 | `xsl:perform-sort` | Sort sequences | MEDIUM |
| 12 | `xsl:result-document` | Multiple output documents | MEDIUM |
| 13 | `xsl:sequence` | Construct sequences | HIGH |

**Summary**: 13 new elements in XSLT 2.0 (7 core + 6 supporting)

---

## Appendix B: XPath 2.0 Function Categories

| Category | Count | Status | Priority |
|----------|-------|--------|----------|
| String (regex) | 4 | ✅ Complete | - |
| String (other) | 6 | ✅ Complete | - |
| Sequence | 15 | ✅ Complete | - |
| Type constructors | 32 | ✅ Complete | - |
| Date/time | 20 | ✅ Complete | - |
| Duration | 6 | ✅ Complete | - |
| QName | 7 | ✅ Complete | - |
| URI | 4 | ✅ Complete | - |
| Node (enhanced) | 7 | ✅ Complete | - |
| Cardinality | 4 | ✅ Complete | - |
| Misc | 5 | ⚠️ Partial | LOW |

**Total XPath 2.0 Functions**: ~90 (vs ~25 in XPath 1.0)

---

## Appendix C: Files to Create/Modify

### New Files
| File | Purpose |
|------|---------|
| `src/xpath/lib/src/functions/type-constructors.ts` | xs:* type constructors |
| `src/xpath/lib/src/functions/date-functions-20.ts` | Date/time functions |
| `src/xpath/lib/src/functions/qname-functions.ts` | QName manipulation |
| `src/xpath/lib/src/functions/uri-functions.ts` | URI functions |
| `tests/xslt/xslt-20/*.test.ts` | XSLT 2.0 element tests |
| `tests/xpath/xpath-20/*.test.ts` | XPath 2.0 function tests |

### Files to Modify
| File | Changes |
|------|---------|
| `src/xslt/xslt.ts` | Add XSLT 2.0 element handlers |
| `src/xslt/functions.ts` | Add grouping/regex context functions |
| `src/xpath/xpath.ts` | Register XPath 2.0 functions |
| `src/xpath/lib/src/expressions/function-call-expression.ts` | Version-aware function lookup |

---

## References

- [W3C XSLT 2.0 Specification](https://www.w3.org/TR/xslt20/)
- [W3C XPath 2.0 Specification](https://www.w3.org/TR/xpath20/)
- [W3C XPath 2.0 Functions and Operators](https://www.w3.org/TR/xpath-functions/)
- [W3C XSLT 2.0 and XQuery 1.0 Serialization](https://www.w3.org/TR/xslt-xquery-serialization/)
