# XSLT 3.0 Implementation Guide

This document provides comprehensive documentation for the XSLT 3.0 specification implementation in xslt-processor.

**Status**: ✅ Core XSLT 3.0 Compliant  
**Reference**: [W3C XSLT 3.0 Specification](https://www.w3.org/TR/xslt-30/)  
**XPath Reference**: [W3C XPath 3.0 Specification](https://www.w3.org/TR/xpath-30/)  
**Test Coverage**: 163/163 XSLT 3.0 tests passing (100%)  
**Prerequisites**: XSLT 2.0 Complete

---

## Overview

XSLT 3.0 (published 2017) is a major upgrade, introducing features for modern web and data integration needs:

- **Streaming** (`xsl:stream`) - Process documents too large to fit in memory
- **Packages** (`xsl:package`) - New unit of modularity for XSLT libraries
- **JSON Support** - Functions to parse and serialize JSON
- **Maps and Arrays** - First-class support from XPath 3.1
- **Higher-Order Functions** - Functions can be passed as arguments
- **Dynamic XPath Execution** (`xsl:evaluate`) - Evaluate XPath expressions at runtime
- **Error Handling** (`xsl:try`, `xsl:catch`) - Formal try/catch mechanism
- **Iteration** (`xsl:iterate`) - Looping with accumulators
- **HTML5 Serialization** - `method="html"` supports HTML5
- **Text Value Templates** - Use `{...}` syntax directly in text nodes

---

## Implementation Status

### Phases Complete

| Phase | Feature | Status | Tests |
|-------|---------|--------|-------|
| 1.1 | Maps and Arrays | ✅ Complete | 5/5 |
| 1.2 | Higher-Order Functions | ✅ Complete | 7/7 |
| 1.3 | JSON Support Functions | ✅ Complete | 13/13 |
| 2.1 | xsl:iterate | ✅ Complete | 8/8 |
| 2.2 | xsl:try/xsl:catch | ✅ Complete | 10/10 |
| 2.3 | xsl:evaluate | ✅ Complete | 14/14 |
| 2.4 | xsl:on-empty / xsl:on-non-empty | ✅ Complete | 5/5 |
| 3.1 | Packages | ✅ Complete | 13/13 |
| 3.2 | Streaming Infrastructure | ✅ Complete | 25/25 |
| 4.1 | Text Value Templates | ✅ Complete | 24/24 |
| 4.2 | Enhanced xsl:output | ✅ Complete | 20/20 |
| 4.3 | Accumulators | ✅ Complete | 19/19 |
| **Total** | **All Core Features** | **✅ Complete** | **163/163** |

---

## XPath 3.0 Features

### Maps and Arrays ✅

Maps and arrays are first-class data structures in XPath 3.1.

#### Map Syntax

```xml
<!-- Create a map -->
<xsl:variable name="person" select="map { 'name': 'John', 'age': 30 }"/>

<!-- Access map values -->
<xsl:value-of select="$person?name"/>
<!-- Output: John -->

<!-- Nested maps -->
<xsl:variable name="data" select="map { 
  'user': map { 'name': 'Jane', 'role': 'admin' },
  'active': true()
}"/>
<xsl:value-of select="$data?user?role"/>
<!-- Output: admin -->
```

#### Array Syntax

```xml
<!-- Create an array -->
<xsl:variable name="colors" select="['red', 'green', 'blue']"/>

<!-- Access array elements (1-based) -->
<xsl:value-of select="$colors?1"/>
<!-- Output: red -->

<!-- Array of maps -->
<xsl:variable name="items" select="[
  map { 'id': 1, 'name': 'Item A' },
  map { 'id': 2, 'name': 'Item B' }
]"/>
<xsl:value-of select="$items?2?name"/>
<!-- Output: Item B -->
```

#### Map Functions

| Function | Description |
|----------|-------------|
| `map:get($map, $key)` | Get value by key |
| `map:put($map, $key, $value)` | Add/update key-value pair |
| `map:keys($map)` | Get all keys |
| `map:size($map)` | Get number of entries |
| `map:contains($map, $key)` | Test if key exists |
| `map:remove($map, $key)` | Remove entry |
| `map:merge($maps)` | Merge multiple maps |

#### Array Functions

| Function | Description |
|----------|-------------|
| `array:get($array, $position)` | Get element at position |
| `array:put($array, $position, $member)` | Replace element |
| `array:size($array)` | Get array length |
| `array:append($array, $member)` | Add element at end |
| `array:head($array)` | Get first element |
| `array:tail($array)` | Get all except first |
| `array:reverse($array)` | Reverse order |
| `array:join($arrays)` | Concatenate arrays |

---

### Higher-Order Functions ✅

Functions can be passed as arguments to other functions.

#### Function Literals

```xml
<!-- Define inline function -->
<xsl:variable name="double" select="function($x) { $x * 2 }"/>

<!-- Call function -->
<xsl:value-of select="$double(5)"/>
<!-- Output: 10 -->

<!-- Multiple parameters -->
<xsl:variable name="add" select="function($a, $b) { $a + $b }"/>
<xsl:value-of select="$add(3, 4)"/>
<!-- Output: 7 -->
```

#### Named Function References

```xml
<!-- Reference existing function -->
<xsl:variable name="concat-fn" select="concat#2"/>

<!-- Use the reference -->
<xsl:value-of select="$concat-fn('Hello, ', 'World!')"/>
<!-- Output: Hello, World! -->
```

#### Built-in Higher-Order Functions

| Function | Description | Example |
|----------|-------------|---------|
| `fn:for-each($seq, $fn)` | Apply function to each item | `for-each(1 to 5, function($x) { $x * 2 })` |
| `fn:filter($seq, $fn)` | Keep items where function returns true | `filter(1 to 10, function($x) { $x mod 2 = 0 })` |
| `fn:fold-left($seq, $zero, $fn)` | Left fold (reduce) | `fold-left(1 to 5, 0, function($a, $b) { $a + $b })` |
| `fn:fold-right($seq, $zero, $fn)` | Right fold | Similar to fold-left, different order |
| `fn:sort($seq, $key?)` | Sort with optional key function | `sort($items, function($x) { $x?name })` |

**Example: Map and Filter**

```xml
<xsl:variable name="numbers" select="1 to 10"/>

<!-- Double all numbers -->
<xsl:variable name="doubled" select="for-each($numbers, function($x) { $x * 2 })"/>
<!-- Result: 2, 4, 6, 8, 10, 12, 14, 16, 18, 20 -->

<!-- Keep only even numbers -->
<xsl:variable name="evens" select="filter($numbers, function($x) { $x mod 2 = 0 })"/>
<!-- Result: 2, 4, 6, 8, 10 -->

<!-- Sum all numbers -->
<xsl:variable name="sum" select="fold-left($numbers, 0, function($a, $b) { $a + $b })"/>
<!-- Result: 55 -->
```

---

### JSON Support ✅

Convert between JSON and XML formats.

#### json-to-xml()

Convert JSON string to XML representation.

```xml
<xsl:variable name="json" select="'{ &quot;name&quot;: &quot;John&quot;, &quot;age&quot;: 30 }'"/>
<xsl:variable name="xml" select="json-to-xml($json)"/>

<!-- Result:
<map xmlns="http://www.w3.org/2005/xpath-functions">
  <string key="name">John</string>
  <number key="age">30</number>
</map>
-->
```

#### xml-to-json()

Convert XML back to JSON string.

```xml
<xsl:variable name="xml">
  <map xmlns="http://www.w3.org/2005/xpath-functions">
    <string key="message">Hello</string>
    <boolean key="active">true</boolean>
  </map>
</xsl:variable>

<xsl:value-of select="xml-to-json($xml)"/>
<!-- Output: {"message":"Hello","active":true} -->
```

---

## XSLT 3.0 Elements Reference

### xsl:iterate ✅

A looping construct with accumulators, providing more control than `xsl:for-each`.

```xml
<xsl:iterate select="1 to 5">
  <xsl:param name="sum" select="0"/>
  
  <item value="{.}" running-total="{$sum + .}"/>
  
  <xsl:next-iteration>
    <xsl:with-param name="sum" select="$sum + ."/>
  </xsl:next-iteration>
</xsl:iterate>
```

**Child Elements**:

| Element | Description |
|---------|-------------|
| `xsl:param` | Declare iteration parameters (accumulators) |
| `xsl:next-iteration` | Update parameters for next iteration |
| `xsl:on-completion` | Execute when iteration completes |
| `xsl:break` | Exit iteration early (not yet implemented) |

**Example: Running Total**

```xml
<xsl:template match="orders">
  <summary>
    <xsl:iterate select="order">
      <xsl:param name="total" select="0"/>
      
      <order id="{@id}" running-total="{$total + @amount}"/>
      
      <xsl:on-completion>
        <grand-total><xsl:value-of select="$total"/></grand-total>
      </xsl:on-completion>
      
      <xsl:next-iteration>
        <xsl:with-param name="total" select="$total + @amount"/>
      </xsl:next-iteration>
    </xsl:iterate>
  </summary>
</xsl:template>
```

---

### xsl:try / xsl:catch ✅

Structured error handling.

```xml
<xsl:try>
  <!-- Potentially failing code -->
  <xsl:value-of select="xs:integer($input)"/>
  
  <xsl:catch>
    <!-- Error handling -->
    <error>Invalid input: <xsl:value-of select="$input"/></error>
  </xsl:catch>
</xsl:try>
```

**Error Variables in xsl:catch**:

| Variable | Description |
|----------|-------------|
| `$err:code` | Error code (QName) |
| `$err:description` | Human-readable description |
| `$err:value` | Additional error information |
| `$err:module` | URI of module where error occurred |
| `$err:line-number` | Line number (if available) |
| `$err:column-number` | Column number (if available) |

**Example**:

```xml
<xsl:try>
  <xsl:value-of select="document($uri)//data"/>
  
  <xsl:catch errors="err:FODC0002">
    <!-- Handle document not found -->
    <fallback>Document not available</fallback>
  </xsl:catch>
  
  <xsl:catch>
    <!-- Handle all other errors -->
    <error code="{$err:code}"><xsl:value-of select="$err:description"/></error>
  </xsl:catch>
</xsl:try>
```

---

### xsl:evaluate ✅

Execute XPath expressions dynamically.

```xml
<xsl:evaluate xpath="$dynamic-path" context-item="."/>
```

**Attributes**:

| Attribute | Required | Description |
|-----------|----------|-------------|
| `xpath` | Yes | XPath expression to evaluate (as string) |
| `context-item` | No | Context node for evaluation |
| `base-uri` | No | Base URI for resolving relative URIs |
| `namespace-context` | No | Node for namespace bindings |
| `with-params` | No | Parameters to pass |

**Example: Dynamic Column Selection**

```xml
<xsl:template match="row">
  <xsl:param name="column-name"/>
  
  <value>
    <xsl:evaluate xpath="concat('./', $column-name)" context-item="."/>
  </value>
</xsl:template>

<!-- Usage -->
<xsl:apply-templates select="row">
  <xsl:with-param name="column-name" select="'price'"/>
</xsl:apply-templates>
```

**Example: User-Defined Expressions**

```xml
<xsl:template match="data">
  <xsl:param name="filter-expr" select="'@active = true()'"/>
  
  <filtered>
    <xsl:for-each select="item">
      <xsl:if test="xsl:evaluate($filter-expr)">
        <xsl:copy-of select="."/>
      </xsl:if>
    </xsl:for-each>
  </filtered>
</xsl:template>
```

---

### xsl:on-empty / xsl:on-non-empty ✅

Conditional processing based on whether a sequence-generating instruction produces output.

```xml
<xsl:for-each select="items/item">
  <item><xsl:value-of select="."/></item>
  
  <xsl:on-empty>
    <message>No items found</message>
  </xsl:on-empty>
</xsl:for-each>
```

**Supported Parent Elements**:
- `xsl:for-each`
- `xsl:for-each-group`
- `xsl:apply-templates`

---

### Text Value Templates ✅

Use `{...}` syntax directly in text nodes (not just attributes).

```xml
<!-- XSLT 3.0 style -->
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:template match="person">
    <greeting>Hello, {name}! You are {age} years old.</greeting>
  </xsl:template>
</xsl:stylesheet>

<!-- Equivalent to XSLT 1.0 style -->
<greeting>
  <xsl:text>Hello, </xsl:text>
  <xsl:value-of select="name"/>
  <xsl:text>! You are </xsl:text>
  <xsl:value-of select="age"/>
  <xsl:text> years old.</xsl:text>
</greeting>
```

**Escaping Braces**:

```xml
<!-- Use {{ and }} for literal braces -->
<output>The value is {{not an expression}}</output>
<!-- Output: The value is {not an expression} -->
```

---

### Accumulators ✅

Declarative way to compute values during processing.

```xml
<xsl:accumulator name="total" as="xs:decimal" initial-value="0">
  <xsl:accumulator-rule match="order" select="$value + @price"/>
</xsl:accumulator>

<!-- Use accumulator value -->
<xsl:template match="/">
  <total><xsl:value-of select="accumulator-after('total')"/></total>
</xsl:template>
```

**Attributes**:

| Attribute | Required | Description |
|-----------|----------|-------------|
| `name` | Yes | Accumulator name |
| `initial-value` | Yes | Starting value |
| `as` | No | Type of accumulator value |
| `streamable` | No | Whether usable in streaming |

**Functions**:

| Function | Description |
|----------|-------------|
| `accumulator-before($name)` | Value before processing current node |
| `accumulator-after($name)` | Value after processing current node |

---

## Packages ✅

A new modularity system for organizing and sharing XSLT components.

### Package Definition

```xml
<xsl:package name="http://example.com/utilities" version="1.0"
             xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  
  <!-- Expose components to users of the package -->
  <xsl:expose component="function" names="*" visibility="public"/>
  
  <!-- Package contents -->
  <xsl:function name="util:double" as="xs:integer" visibility="public">
    <xsl:param name="n" as="xs:integer"/>
    <xsl:sequence select="$n * 2"/>
  </xsl:function>
  
</xsl:package>
```

### Using Packages

```xml
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  
  <xsl:use-package name="http://example.com/utilities">
    <xsl:accept component="function" names="util:*" visibility="public"/>
  </xsl:use-package>
  
  <xsl:template match="/">
    <result><xsl:value-of select="util:double(21)"/></result>
  </xsl:template>
  
</xsl:stylesheet>
```

### Visibility Levels

| Visibility | Description |
|------------|-------------|
| `public` | Available to package users |
| `private` | Internal to package only |
| `final` | Public but cannot be overridden |
| `abstract` | Must be overridden by users |

---

## Streaming ✅

Infrastructure for processing large documents without loading entirely into memory.

### xsl:stream

Entry point for streamed processing.

```xml
<xsl:stream href="large-file.xml">
  <xsl:apply-templates select="root/items/item"/>
</xsl:stream>
```

### xsl:fork

Process a copy of a streamed node (for multiple passes).

```xml
<xsl:stream href="data.xml">
  <xsl:fork>
    <xsl:sequence>
      <total><xsl:value-of select="sum(//price)"/></total>
    </xsl:sequence>
    <xsl:sequence>
      <count><xsl:value-of select="count(//item)"/></count>
    </xsl:sequence>
  </xsl:fork>
</xsl:stream>
```

### xsl:merge

Merge multiple sorted input sources.

```xml
<xsl:merge>
  <xsl:merge-source select="doc('file1.xml')//item" sort-before-merge="no">
    <xsl:merge-key select="@id"/>
  </xsl:merge-source>
  <xsl:merge-source select="doc('file2.xml')//item" sort-before-merge="no">
    <xsl:merge-key select="@id"/>
  </xsl:merge-source>
  
  <xsl:merge-action>
    <combined-item id="{current-merge-key()}">
      <xsl:copy-of select="current-merge-group()"/>
    </combined-item>
  </xsl:merge-action>
</xsl:merge>
```

### Streaming Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Streaming 3-Stage Model                     │
└─────────────────────────────────────────────────────────┘

  STAGE 1: PARSING          STAGE 2: PROCESSING        STAGE 3: OUTPUT
       │                           │                         │
       ▼                           ▼                         ▼
┌──────────────┐          ┌──────────────────┐       ┌──────────────┐
│  Streaming   │          │   Streaming      │       │    Result    │
│   Parser     │ ──────▶  │   Context        │ ────▶ │    Output    │
│              │  Events  │                  │       │              │
└──────────────┘          │  - Copy Manager  │       └──────────────┘
                          │  - Merge Coord.  │
                          │  - Pattern Valid.│
                          └──────────────────┘
```

---

## Enhanced xsl:output ✅

### HTML5 Support

```xml
<xsl:output method="html" version="5.0"/>

<!-- Generates HTML5 doctype and structure -->
<!-- <!DOCTYPE html> -->
```

### Item Separator

```xml
<xsl:output method="text" item-separator=", "/>

<!-- Separates sequence items in text output -->
<xsl:value-of select="1, 2, 3"/>
<!-- Output: 1, 2, 3 -->
```

---

## API Usage

### Using Maps and Arrays

```typescript
import { Xslt, XmlParser } from 'xslt-processor';

const xslt = new Xslt();
const parser = new XmlParser();

const xsl = parser.xmlParse(`
  <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:template match="/">
      <xsl:variable name="data" select="map { 'x': 10, 'y': 20 }"/>
      <result>
        <sum><xsl:value-of select="$data?x + $data?y"/></sum>
      </result>
    </xsl:template>
  </xsl:stylesheet>
`);

const xml = parser.xmlParse('<root/>');
const result = await xslt.xsltProcess(xml, xsl);
// <result><sum>30</sum></result>
```

### Using xsl:try/xsl:catch

```typescript
const xsl = parser.xmlParse(`
  <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:template match="value">
      <xsl:try>
        <number><xsl:value-of select="xs:integer(.)"/></number>
        <xsl:catch>
          <error>Not a valid integer: <xsl:value-of select="."/></error>
        </xsl:catch>
      </xsl:try>
    </xsl:template>
  </xsl:stylesheet>
`);
```

### Using Text Value Templates

```typescript
const xsl = parser.xmlParse(`
  <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:template match="person">
      <greeting>Hello, {name}! Your ID is {generate-id()}.</greeting>
    </xsl:template>
  </xsl:stylesheet>
`);
```

---

## Best Practices

### 1. Use Maps for Structured Data

```xml
<xsl:variable name="config" select="map {
  'debug': true(),
  'max-items': 100,
  'output-format': 'json'
}"/>

<xsl:if test="$config?debug">
  <xsl:message>Debug mode enabled</xsl:message>
</xsl:if>
```

### 2. Leverage Higher-Order Functions for Data Transformation

```xml
<!-- Transform and filter in one pipeline -->
<xsl:variable name="processed" select="
  $items 
  => filter(function($x) { $x?active })
  => for-each(function($x) { map:put($x, 'processed', true()) })
"/>
```

### 3. Use xsl:try for Graceful Error Handling

```xml
<xsl:template match="data">
  <xsl:try>
    <xsl:apply-templates/>
    <xsl:catch>
      <error-report>
        <message><xsl:value-of select="$err:description"/></message>
        <fallback><xsl:value-of select="."/></fallback>
      </error-report>
    </xsl:catch>
  </xsl:try>
</xsl:template>
```

### 4. Use Accumulators for Cross-Cutting Concerns

```xml
<!-- Track word count across entire document -->
<xsl:accumulator name="word-count" as="xs:integer" initial-value="0">
  <xsl:accumulator-rule match="text()" 
    select="$value + count(tokenize(., '\s+'))"/>
</xsl:accumulator>
```

---

## Future Enhancements

The following XSLT 3.0 features are planned for future implementation:

| Feature | Description | Status |
|---------|-------------|--------|
| `xsl:assert` | Assertions for debugging | Planned |
| `xsl:break` | Exit from xsl:iterate | Planned |
| `xsl:mode` declaration | Explicit mode properties | Planned |
| `xsl:global-context-item` | Global context declaration | Planned |
| External package loading | Load packages from URIs | Planned |
| True streaming parser | Event-based XML parsing | Planned |

---

## See Also

- [XSLT 1.0 Implementation Guide](./xslt-1.0.md)
- [XSLT 2.0 Implementation Guide](./xslt-2.0.md)
- [API Reference](../api/README.md)
