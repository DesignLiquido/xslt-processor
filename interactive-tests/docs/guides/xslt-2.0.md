# XSLT 2.0 Implementation Guide

This document provides comprehensive documentation for the XSLT 2.0 specification implementation in xslt-processor.

**Status**: ✅ 90%+ XSLT 2.0 Compliant (excluding schema-aware features)  
**Reference**: [W3C XSLT 2.0 Specification](https://www.w3.org/TR/xslt20/)  
**XPath Reference**: [W3C XPath 2.0 Specification](https://www.w3.org/TR/xpath20/)  
**Prerequisites**: XSLT 1.0 Complete

---

## Overview

XSLT 2.0 (published 2007) is a major upgrade from XSLT 1.0, introducing:

- **Grouping** (`xsl:for-each-group`) - Powerful data grouping capabilities
- **Regular expressions** (`xsl:analyze-string`) - Full regex support in XSLT
- **Multiple output documents** (`xsl:result-document`) - Generate multiple files
- **Sequences** (`xsl:sequence`) - First-class sequence support
- **Temporary trees** - Variables can hold result trees directly
- **Schema awareness** - Optional XML Schema validation (Basic vs Schema-Aware)

### XPath 2.0 Integration

- Sequences (ordered collections replacing node-sets)
- New type system with atomic types
- 100+ new functions
- For expressions, if/then/else, quantified expressions
- Type casting and instance-of testing

---

## Current Implementation Status

### What's Implemented

| Category | Status | Details |
|----------|--------|---------|
| Version detection | ✅ Complete | Routes `version="2.0"` correctly |
| XPath 2.0 parser | ✅ Complete | For/if/quantified expressions work |
| String regex functions | ✅ Complete | `matches()`, `replace()`, `tokenize()` |
| Sequence functions | ✅ Complete | `empty()`, `exists()`, `head()`, `tail()`, etc. |
| String functions | ✅ Complete | `upper-case()`, `lower-case()`, `ends-with()` |
| Forwards-compatible mode | ✅ Complete | Graceful handling of version > 1.0 |
| Type constructors | ✅ Complete | All 32 xs:* type constructors |
| Date/time functions | ✅ Complete | Full date/time manipulation |
| QName functions | ✅ Complete | All 7 QName functions |
| URI functions | ✅ Complete | resolve-uri, encode-for-uri, etc. |

### What's Partially Implemented

| Category | Status | Priority |
|----------|--------|----------|
| `xsl:function` | ❌ Not started | MEDIUM |
| `xsl:result-document` | ❌ Not started | LOW |
| `xsl:perform-sort` | ❌ Not started | LOW |
| `xsl:namespace` | ❌ Not started | LOW |

---

## XSLT 2.0 Elements Reference

### xsl:sequence ✅

Construct a sequence from any items (nodes, atomic values, or mixed).

```xml
<xsl:sequence select="expression"/>
```

**Attributes**:

| Attribute | Required | Description |
|-----------|----------|-------------|
| `select` | No | XPath expression returning sequence |

**Example**:

```xml
<xsl:template name="get-numbers">
  <xsl:sequence select="1 to 10"/>
</xsl:template>
```

**Key Points**:
- Returns the result of evaluating `select` directly
- Does NOT create a document fragment (unlike `xsl:copy-of`)
- Essential for returning atomic values from templates

---

### xsl:analyze-string ✅

Process a string using regular expressions, with separate handling for matching and non-matching substrings.

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

**Context Functions**:
- `regex-group(n)` - Returns the nth captured group (0 = full match, 1+ = capture groups)

**Example**:

```xml
<xsl:analyze-string select="'hello123world456'" regex="[0-9]+">
  <xsl:matching-substring>
    <number><xsl:value-of select="."/></number>
  </xsl:matching-substring>
  <xsl:non-matching-substring>
    <text><xsl:value-of select="."/></text>
  </xsl:non-matching-substring>
</xsl:analyze-string>
<!-- Output: <text>hello</text><number>123</number><text>world</text><number>456</number> -->
```

---

### xsl:for-each-group ✅

Group items and process each group. The most powerful grouping mechanism in any XSLT version.

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

**Context Functions**:
- `current-group()` - Returns all items in current group
- `current-grouping-key()` - Returns the key of current group

**Example: Group by Category**:

```xml
<xsl:for-each-group select="//product" group-by="@category">
  <category name="{current-grouping-key()}">
    <xsl:for-each select="current-group()">
      <product><xsl:value-of select="@name"/></product>
    </xsl:for-each>
  </category>
</xsl:for-each-group>
```

**Example: Group Adjacent**:

```xml
<!-- Group consecutive items with same type -->
<xsl:for-each-group select="item" group-adjacent="@type">
  <group type="{current-grouping-key()}">
    <xsl:copy-of select="current-group()"/>
  </group>
</xsl:for-each-group>
```

---

### xsl:function ❌ (Not Yet Implemented)

Define reusable functions callable from XPath expressions.

```xml
<xsl:function name="my:double" as="xs:integer">
  <xsl:param name="n" as="xs:integer"/>
  <xsl:sequence select="$n * 2"/>
</xsl:function>

<!-- Usage in XPath -->
<xsl:value-of select="my:double(5)"/>
<!-- Output: 10 -->
```

**Attributes**:

| Attribute | Required | Description |
|-----------|----------|-------------|
| `name` | Yes | QName of function (must be in non-null namespace) |
| `as` | No | Return type (SequenceType) |
| `override` | No | Whether to override functions from other modules |

---

### xsl:result-document ❌ (Not Yet Implemented)

Create additional output documents (multiple file output).

```xml
<xsl:result-document href="chapter{position()}.html" method="html">
  <html>
    <body><xsl:apply-templates/></body>
  </html>
</xsl:result-document>
```

---

## XPath 2.0 Functions Reference

### Type Constructor Functions ✅

All 32 type constructors are implemented:

| Function | Description |
|----------|-------------|
| `xs:string` | Convert to string |
| `xs:boolean` | Convert to boolean |
| `xs:decimal` | Convert to decimal |
| `xs:float` | Convert to float |
| `xs:double` | Convert to double |
| `xs:integer` | Convert to integer |
| `xs:date` | Convert to date |
| `xs:time` | Convert to time |
| `xs:dateTime` | Convert to dateTime |
| `xs:duration` | Convert to duration |
| `xs:anyURI` | Convert to URI |
| `xs:QName` | Convert to QName |

**Example**:

```xml
<xsl:value-of select="xs:integer('42') * 2"/>
<!-- Output: 84 -->

<xsl:value-of select="xs:date('2024-01-15') + xs:dayTimeDuration('P7D')"/>
<!-- Output: 2024-01-22 -->
```

---

### Numeric Functions ✅

| Function | Signature | Description |
|----------|-----------|-------------|
| `abs` | `fn:abs($arg as numeric?)` | Absolute value |
| `round-half-to-even` | `fn:round-half-to-even($arg, $precision?)` | Banker's rounding |
| `avg` | `fn:avg($arg as xs:anyAtomicType*)` | Average of sequence |
| `min` | `fn:min($arg, $collation?)` | Minimum value |
| `max` | `fn:max($arg, $collation?)` | Maximum value |

---

### Date/Time Functions ✅

All date/time component extraction and timezone functions are implemented:

| Function | Description |
|----------|-------------|
| `current-dateTime()` | Current date and time |
| `current-date()` | Current date |
| `current-time()` | Current time |
| `year-from-dateTime()` | Extract year component |
| `month-from-dateTime()` | Extract month component |
| `day-from-dateTime()` | Extract day component |
| `hours-from-dateTime()` | Extract hours component |
| `minutes-from-dateTime()` | Extract minutes component |
| `seconds-from-dateTime()` | Extract seconds component |
| `adjust-dateTime-to-timezone()` | Adjust timezone |

**Example**:

```xml
<xsl:value-of select="year-from-date(xs:date('2024-06-15'))"/>
<!-- Output: 2024 -->

<xsl:value-of select="format-date(current-date(), '[MNn] [D], [Y]')"/>
<!-- Output: June 15, 2024 -->
```

---

### Duration Functions ✅

| Function | Signature | Description |
|----------|-----------|-------------|
| `years-from-duration` | `fn:years-from-duration($arg)` | Extract years |
| `months-from-duration` | `fn:months-from-duration($arg)` | Extract months |
| `days-from-duration` | `fn:days-from-duration($arg)` | Extract days |
| `hours-from-duration` | `fn:hours-from-duration($arg)` | Extract hours |
| `minutes-from-duration` | `fn:minutes-from-duration($arg)` | Extract minutes |
| `seconds-from-duration` | `fn:seconds-from-duration($arg)` | Extract seconds |

---

### QName Functions ✅

| Function | Description |
|----------|-------------|
| `QName($uri, $qname)` | Construct a QName |
| `local-name-from-QName($arg)` | Get local name part |
| `namespace-uri-from-QName($arg)` | Get namespace URI |
| `prefix-from-QName($arg)` | Get prefix |
| `resolve-QName($qname, $element)` | Resolve QName in context |
| `in-scope-prefixes($element)` | Get all in-scope prefixes |
| `namespace-uri-for-prefix($prefix, $element)` | Get namespace for prefix |

---

### URI Functions ✅

| Function | Description |
|----------|-------------|
| `resolve-uri($relative, $base?)` | Resolve relative URI |
| `encode-for-uri($uri)` | Percent-encode for URI |
| `iri-to-uri($iri)` | Convert IRI to URI |
| `escape-html-uri($uri)` | Escape for HTML attribute |

---

### Node Functions (Enhanced) ✅

| Function | Description |
|----------|-------------|
| `root($arg?)` | Get document root |
| `base-uri($arg?)` | Get base URI |
| `document-uri($arg?)` | Get document URI |
| `nilled($arg?)` | Check if element is nilled |
| `node-name($arg?)` | Get node name as QName |
| `data($arg)` | Atomize to typed values |
| `lang($testlang, $node?)` | Test language |

---

### Cardinality Functions ✅

| Function | Description |
|----------|-------------|
| `unordered($src)` | Return items in implementation-defined order |
| `zero-or-one($arg)` | Assert 0 or 1 items |
| `one-or-more($arg)` | Assert 1 or more items |
| `exactly-one($arg)` | Assert exactly 1 item |

---

## Regular Expression Functions

### matches() ✅

Test if a string matches a regular expression.

```xml
<xsl:if test="matches($email, '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')">
  <valid-email/>
</xsl:if>
```

### replace() ✅

Replace matches in a string.

```xml
<xsl:value-of select="replace('hello world', 'world', 'XSLT')"/>
<!-- Output: hello XSLT -->

<!-- With capture groups -->
<xsl:value-of select="replace('John Smith', '(\w+) (\w+)', '$2, $1')"/>
<!-- Output: Smith, John -->
```

### tokenize() ✅

Split a string using a regular expression.

```xml
<xsl:for-each select="tokenize('apple,banana,cherry', ',')">
  <fruit><xsl:value-of select="."/></fruit>
</xsl:for-each>
```

---

## Sequence Operations

### Sequence Construction

```xml
<!-- Comma-separated values form a sequence -->
<xsl:variable name="numbers" select="1, 2, 3, 4, 5"/>

<!-- Range expression -->
<xsl:variable name="range" select="1 to 10"/>

<!-- Empty sequence -->
<xsl:variable name="empty" select="()"/>
```

### Sequence Functions

| Function | Description |
|----------|-------------|
| `empty($arg)` | Test if sequence is empty |
| `exists($arg)` | Test if sequence is non-empty |
| `head($arg)` | First item in sequence |
| `tail($arg)` | All items except first |
| `insert-before($target, $position, $inserts)` | Insert items |
| `remove($target, $position)` | Remove item at position |
| `reverse($arg)` | Reverse sequence order |
| `subsequence($src, $start, $length?)` | Extract subsequence |
| `distinct-values($arg)` | Remove duplicates |
| `index-of($seq, $search)` | Find positions of value |

---

## API Usage

### Using xsl:for-each-group

```typescript
import { Xslt, XmlParser } from 'xslt-processor';

const xslt = new Xslt();
const parser = new XmlParser();

const xml = parser.xmlParse(`
  <products>
    <product category="electronics" name="Phone"/>
    <product category="books" name="XSLT Guide"/>
    <product category="electronics" name="Laptop"/>
    <product category="books" name="XPath Manual"/>
  </products>
`);

const xsl = parser.xmlParse(`
  <xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:template match="products">
      <categories>
        <xsl:for-each-group select="product" group-by="@category">
          <category name="{current-grouping-key()}" count="{count(current-group())}">
            <xsl:for-each select="current-group()">
              <item><xsl:value-of select="@name"/></item>
            </xsl:for-each>
          </category>
        </xsl:for-each-group>
      </categories>
    </xsl:template>
  </xsl:stylesheet>
`);

const result = await xslt.xsltProcess(xml, xsl);
```

### Using xsl:analyze-string

```typescript
const xsl = parser.xmlParse(`
  <xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:template match="text">
      <parsed>
        <xsl:analyze-string select="." regex="\\d+">
          <xsl:matching-substring>
            <number><xsl:value-of select="."/></number>
          </xsl:matching-substring>
          <xsl:non-matching-substring>
            <text><xsl:value-of select="."/></text>
          </xsl:non-matching-substring>
        </xsl:analyze-string>
      </parsed>
    </xsl:template>
  </xsl:stylesheet>
`);
```

---

## Best Practices

### 1. Use Sequences Instead of Node-Sets

```xml
<!-- XSLT 2.0 sequences are more flexible -->
<xsl:variable name="values" select="1, 'text', xs:date('2024-01-01')"/>
```

### 2. Leverage Regular Expressions

```xml
<!-- Complex string parsing made simple -->
<xsl:analyze-string select="$phone" regex="(\d{3})-(\d{3})-(\d{4})">
  <xsl:matching-substring>
    <area-code><xsl:value-of select="regex-group(1)"/></area-code>
    <exchange><xsl:value-of select="regex-group(2)"/></exchange>
    <number><xsl:value-of select="regex-group(3)"/></number>
  </xsl:matching-substring>
</xsl:analyze-string>
```

### 3. Use Type Constructors for Data Validation

```xml
<xsl:variable name="date" select="xs:date($input)"/>
<!-- Throws error if $input is not a valid date format -->
```

---

## See Also

- [XSLT 1.0 Implementation Guide](./xslt-1.0.md)
- [XSLT 3.0 Implementation Guide](./xslt-3.0.md)
- [API Reference](../api/README.md)
