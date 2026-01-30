# XSLT 1.0 Implementation Guide

This document provides comprehensive documentation for the XSLT 1.0 specification implementation in xslt-processor.

**Status**: ✅ 100% XSLT 1.0 Compliant  
**Reference**: [W3C XSLT 1.0 Specification](https://www.w3.org/TR/xslt-10/)  
**Test Coverage**: 2000+ tests passing, 90%+ line coverage

---

## Overview

XSLT 1.0 (published 1999) is the foundational version of XSLT, providing essential transformation capabilities for XML documents. This implementation fully supports all XSLT 1.0 elements and XPath 1.0 functions.

## Quick Example

```xml
<!-- input.xml -->
<catalog>
  <book><title>XSLT Basics</title><price>29.99</price></book>
  <book><title>Advanced XSLT</title><price>39.99</price></book>
</catalog>

<!-- transform.xsl -->
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:template match="/">
    <html>
      <body>
        <h1>Book Catalog</h1>
        <ul>
          <xsl:for-each select="catalog/book">
            <li><xsl:value-of select="title"/> - $<xsl:value-of select="price"/></li>
          </xsl:for-each>
        </ul>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
```

---

## XSLT 1.0 Elements Reference

All 35 XSLT 1.0 elements are fully implemented:

### Root Elements

| Element | Description | Status |
|---------|-------------|--------|
| `xsl:stylesheet` | Root element for XSLT stylesheets | ✅ Complete |
| `xsl:transform` | Alias for `xsl:stylesheet` | ✅ Complete |

### Template Elements

| Element | Description | Status |
|---------|-------------|--------|
| `xsl:template` | Defines a template rule | ✅ Complete |
| `xsl:apply-templates` | Applies templates to selected nodes | ✅ Complete |
| `xsl:apply-imports` | Applies imported template rules | ✅ Complete |
| `xsl:call-template` | Calls a named template | ✅ Complete |

### Output Elements

| Element | Description | Status |
|---------|-------------|--------|
| `xsl:value-of` | Outputs text content | ✅ Complete |
| `xsl:text` | Outputs literal text | ✅ Complete |
| `xsl:element` | Creates an element dynamically | ✅ Complete |
| `xsl:attribute` | Creates an attribute dynamically | ✅ Complete |
| `xsl:comment` | Creates a comment node | ✅ Complete |
| `xsl:processing-instruction` | Creates a processing instruction | ✅ Complete |
| `xsl:copy` | Shallow copies the current node | ✅ Complete |
| `xsl:copy-of` | Deep copies nodes | ✅ Complete |
| `xsl:number` | Generates formatted numbers | ✅ Complete |
| `xsl:output` | Controls output serialization | ✅ Complete |

### Control Flow Elements

| Element | Description | Status |
|---------|-------------|--------|
| `xsl:if` | Conditional processing | ✅ Complete |
| `xsl:choose` | Multi-way conditional | ✅ Complete |
| `xsl:when` | Branch of `xsl:choose` | ✅ Complete |
| `xsl:otherwise` | Default branch of `xsl:choose` | ✅ Complete |
| `xsl:for-each` | Iterates over a node set | ✅ Complete |

### Variable and Parameter Elements

| Element | Description | Status |
|---------|-------------|--------|
| `xsl:variable` | Declares a variable | ✅ Complete |
| `xsl:param` | Declares a parameter | ✅ Complete |
| `xsl:with-param` | Passes a parameter value | ✅ Complete |

### Sorting and Grouping

| Element | Description | Status |
|---------|-------------|--------|
| `xsl:sort` | Specifies sort criteria | ✅ Complete |

### Import and Include

| Element | Description | Status |
|---------|-------------|--------|
| `xsl:import` | Imports another stylesheet (lower precedence) | ✅ Complete |
| `xsl:include` | Includes another stylesheet (same precedence) | ✅ Complete |

### Keys and Indexing

| Element | Description | Status |
|---------|-------------|--------|
| `xsl:key` | Defines a key for indexed lookup | ✅ Complete |

### Whitespace Handling

| Element | Description | Status |
|---------|-------------|--------|
| `xsl:strip-space` | Strips whitespace from elements | ✅ Complete |
| `xsl:preserve-space` | Preserves whitespace in elements | ✅ Complete |

### Other Elements

| Element | Description | Status |
|---------|-------------|--------|
| `xsl:message` | Outputs a message (for debugging) | ✅ Complete |
| `xsl:fallback` | Provides fallback for unsupported elements | ✅ Complete |
| `xsl:attribute-set` | Defines a named set of attributes | ✅ Complete |
| `xsl:namespace-alias` | Aliases namespaces during transformation | ✅ Complete |
| `xsl:decimal-format` | Defines number formatting | ✅ Complete |

---

## XPath 1.0 Functions Reference

All XPath 1.0 core functions are implemented:

### Node Set Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `count()` | `count(node-set)` | Returns the number of nodes |
| `id()` | `id(object)` | Selects elements by ID |
| `last()` | `last()` | Returns the context size |
| `local-name()` | `local-name(node-set?)` | Returns the local name |
| `name()` | `name(node-set?)` | Returns the qualified name |
| `namespace-uri()` | `namespace-uri(node-set?)` | Returns the namespace URI |
| `position()` | `position()` | Returns the context position |

### String Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `concat()` | `concat(string, string, ...)` | Concatenates strings |
| `contains()` | `contains(string, string)` | Tests substring containment |
| `normalize-space()` | `normalize-space(string?)` | Normalizes whitespace |
| `starts-with()` | `starts-with(string, string)` | Tests string prefix |
| `string()` | `string(object?)` | Converts to string |
| `string-length()` | `string-length(string?)` | Returns string length |
| `substring()` | `substring(string, number, number?)` | Extracts substring |
| `substring-after()` | `substring-after(string, string)` | Returns text after match |
| `substring-before()` | `substring-before(string, string)` | Returns text before match |
| `translate()` | `translate(string, string, string)` | Character replacement |

### Boolean Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `boolean()` | `boolean(object)` | Converts to boolean |
| `false()` | `false()` | Returns false |
| `lang()` | `lang(string)` | Tests language |
| `not()` | `not(boolean)` | Boolean negation |
| `true()` | `true()` | Returns true |

### Number Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `ceiling()` | `ceiling(number)` | Rounds up |
| `floor()` | `floor(number)` | Rounds down |
| `number()` | `number(object?)` | Converts to number |
| `round()` | `round(number)` | Rounds to nearest integer |
| `sum()` | `sum(node-set)` | Sums node values |

---

## XSLT 1.0 Additional Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `current()` | `current()` | Returns the current node |
| `document()` | `document(object, node-set?)` | Loads external documents |
| `element-available()` | `element-available(string)` | Tests element support |
| `format-number()` | `format-number(number, string, string?)` | Formats numbers |
| `function-available()` | `function-available(string)` | Tests function support |
| `generate-id()` | `generate-id(node-set?)` | Generates unique ID |
| `key()` | `key(string, object)` | Retrieves nodes by key |
| `system-property()` | `system-property(string)` | Returns system properties |
| `unparsed-entity-uri()` | `unparsed-entity-uri(string)` | Returns entity URI |

---

## Template Matching and Priority

### Default Priority Rules

Templates are matched using patterns with the following default priorities:

| Pattern Type | Default Priority | Example |
|--------------|------------------|---------|
| Node name | 0 | `match="item"` |
| Wildcard `*` | -0.5 | `match="*"` |
| Node type | -0.5 | `match="text()"` |
| Namespace wildcard | -0.25 | `match="ns:*"` |
| Predicates | 0.5 | `match="item[@id]"` |
| Path expressions | 0.5 | `match="//item"` |

### Conflict Resolution

When multiple templates match the same node:

1. **Import precedence** - Templates from importing stylesheet win over imported
2. **Priority** - Higher priority templates win
3. **Document order** - Last template in document order wins (with warning)

### Example

```xml
<!-- Priority 0.5 (has predicate) -->
<xsl:template match="item[@featured]" priority="0.5">
  <featured><xsl:apply-templates/></featured>
</xsl:template>

<!-- Priority 0 (simple name) -->
<xsl:template match="item">
  <normal><xsl:apply-templates/></normal>
</xsl:template>

<!-- Explicit priority override -->
<xsl:template match="item" priority="10">
  <special><xsl:apply-templates/></special>
</xsl:template>
```

---

## xsl:number Formatting

The `xsl:number` element supports comprehensive number formatting:

### Format Tokens

| Token | Output | Example |
|-------|--------|---------|
| `1` | Decimal numbers | 1, 2, 3, ... |
| `01` | Zero-padded decimal | 01, 02, 03, ... |
| `a` | Lowercase alphabetic | a, b, c, ..., z, aa, ab |
| `A` | Uppercase alphabetic | A, B, C, ..., Z, AA, AB |
| `i` | Lowercase roman | i, ii, iii, iv, v, ... |
| `I` | Uppercase roman | I, II, III, IV, V, ... |

### Level Attribute

| Value | Description |
|-------|-------------|
| `single` | Count preceding siblings (default) |
| `multiple` | Hierarchical numbering (1.2.3) |
| `any` | Count all preceding nodes in document |

### Example

```xml
<!-- Simple numbering -->
<xsl:number format="1. "/>

<!-- Hierarchical numbering -->
<xsl:number level="multiple" count="chapter|section" format="1.1 "/>

<!-- Roman numerals with grouping -->
<xsl:number format="I" grouping-separator="," grouping-size="3"/>
```

---

## Forwards-Compatible Processing

When `version` is greater than 1.0 (but not explicitly 2.0 or 3.0), the processor enters forwards-compatible mode:

- Unknown top-level elements are silently ignored
- Unknown XSLT instructions use `xsl:fallback` if provided
- Unknown attributes are ignored

### Example

```xml
<xsl:stylesheet version="1.5" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:template match="/">
    <!-- Unknown XSLT 1.5 instruction with fallback -->
    <xsl:future-instruction>
      <xsl:fallback>
        <p>Fallback content for unsupported processors</p>
      </xsl:fallback>
    </xsl:future-instruction>
  </xsl:template>
</xsl:stylesheet>
```

---

## API Usage

### Basic Transformation

```typescript
import { Xslt, XmlParser } from 'xslt-processor';

const xslt = new Xslt();
const parser = new XmlParser();

const xml = parser.xmlParse('<data><item>Hello</item></data>');
const xsl = parser.xmlParse(`
  <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:template match="/">
      <result><xsl:value-of select="data/item"/></result>
    </xsl:template>
  </xsl:stylesheet>
`);

const result = await xslt.xsltProcess(xml, xsl);
```

### With Parameters

```typescript
const xsl = parser.xmlParse(`
  <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:param name="title" select="'Default Title'"/>
    <xsl:template match="/">
      <h1><xsl:value-of select="$title"/></h1>
    </xsl:template>
  </xsl:stylesheet>
`);

const result = await xslt.xsltProcess(xml, xsl, {
  parameters: { title: 'Custom Title' }
});
```

### With Document Loader

```typescript
const xslt = new Xslt({
  documentLoader: async (uri) => {
    const response = await fetch(uri);
    const text = await response.text();
    return parser.xmlParse(text);
  }
});
```

---

## Best Practices

### 1. Use Modes for Multi-Pass Processing

```xml
<xsl:template match="item" mode="toc">
  <li><xsl:value-of select="@title"/></li>
</xsl:template>

<xsl:template match="item" mode="content">
  <section><xsl:apply-templates/></section>
</xsl:template>
```

### 2. Use Keys for Efficient Lookups

```xml
<xsl:key name="items-by-category" match="item" use="@category"/>

<xsl:template match="/">
  <xsl:for-each select="key('items-by-category', 'books')">
    <!-- Process all items in 'books' category -->
  </xsl:for-each>
</xsl:template>
```

### 3. Use Variables to Avoid Repeated XPath Evaluation

```xml
<xsl:variable name="items" select="//item[@active='true']"/>

<xsl:template match="/">
  <p>Count: <xsl:value-of select="count($items)"/></p>
  <xsl:for-each select="$items">
    <!-- Process items -->
  </xsl:for-each>
</xsl:template>
```

---

## See Also

- [XSLT 2.0 Implementation Guide](./xslt-2.0.md)
- [XSLT 3.0 Implementation Guide](./xslt-3.0.md)
- [API Reference](../api/README.md)
