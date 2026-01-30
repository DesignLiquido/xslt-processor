# XSLT-processor TODO

This document maps features from the [W3C XSLT 1.0 Specification](https://www.w3.org/TR/xslt-10/), [W3C XSLT 2.0 Specification](https://www.w3.org/TR/xslt20/), and [W3C XSLT 3.0 Specification](https://www.w3.org/TR/xslt-30/) against the current implementation. Items marked as unimplemented are identified from the specifications and/or the codebase.

**VERSION SUPPORT**: The processor currently targets XSLT 1.0 compliance. XSLT 2.0+ features are marked with `[XSLT 2.0]` tags, and XSLT 3.0+ features are marked with `[XSLT 3.0]` tags. Most XSLT 2.0 and 3.0 features are unimplemented unless noted otherwise.

## Unimplemented XSLT Elements (Section 2-7, B)

### Partially Implemented or Incomplete Elements:

- **`<xsl:import>`** - Basic support exists but template precedence rules may not be fully correct (Section 2.6.2, 5.5)
- **`<xsl:number>`** - Currently implemented but may have incomplete support for all formatting options (Section 7.7)
  - Level attribute handling (`single`, `multiple`, `any`) - needs verification
  - Count/from patterns - needs verification
  - Number to string conversion attributes (`format`, `lang`, `letter-value`, `grouping-separator`, `grouping-size`) - partial support
- **`<xsl:namespace-alias>`** - Namespace aliasing for result tree (Section 7.1.1)
- **`<xsl:preserve-space>` / `<xsl:strip-space>`** - Whitespace handling is implemented but may have edge cases (Section 3.4)

## XPath Functions (Section 12)

### XSLT Additional Functions (Section 12):

- **`document()`** - ✅ Implemented (basic)
  - Requires `documentLoader` callback in context for external document loading
  - Empty URI returns current document
  - Returns empty node-set if loading fails

- **`key()`** - ✅ Implemented
  - Works with declared keys via `<xsl:key>` elements
  - Key indexing via context.keys map

- **`format-number()`** - ✅ Implemented
  - JDK 1.1 DecimalFormat pattern syntax supported
  - Integration with `<xsl:decimal-format>` elements
  - Grouping separators, decimal symbols, etc.

- **`generate-id()`** - ✅ Implemented
  - Uses hash-based ID generation
  - Same node = same ID within transformation
  - Starts with alphabetic character

- **`unparsed-entity-uri()`** - ✅ Implemented (stub)
  - Requires `unparsedEntities` map in context
  - Returns empty string if entity not found
  - DTD parsing not available in JavaScript environments

- **`system-property()`** - ✅ Implemented
  - Returns `xsl:version`, `xsl:vendor`, `xsl:vendor-url`
  - Custom properties via `systemProperties` in context

- **`element-available()`** - ✅ Implemented
  - All 34 XSLT 1.0 elements supported
  - Works with or without `xsl:` prefix

- **`function-available()`** - ✅ Implemented
  - Core XPath 1.0 functions (26 functions)
  - XSLT 1.0 additional functions (9 functions)
  - Custom functions (matches, ends-with, xml-to-json, json-to-xml)

- **`current()`** - ✅ Implemented
  - Returns the current node being processed

## Known Bugs

### BUG: concat() with XPath expressions
When using `concat()` with XPath expressions as arguments (e.g., `concat(root/first, ' ', root/second)`), the function returns malformed output like "1, first, null 1, second, null" instead of properly concatenating the string values. This appears to be an issue with how XPath NodeSetValue results are being converted to strings within the concat function. (Section 12.4, XPath core functions)

### BUG: Template precedence and priority
Need to verify correct implementation of:
- Template conflict resolution (Section 5.5)
- Import precedence (Section 2.6.2)
- Template priority attribute (Section 5.3)

## XPath Core/Extension Functions

- **`current()`** - ✅ Implemented
- **`id()`** - ✅ Implemented - XPath core function
- **`lang()`** - ✅ Implemented - Check language support

## Missing Output Methods

- **JSON output method** - Not in XSLT 1.0 spec (3.0 feature, but code mentions it)
- **Adaptive output method** - Referenced in code but completeness unclear
- **XHTML output method** - Not explicitly in XSLT 1.0

## Validation & Error Handling

- **Forwards-compatible processing** (Section 2.5) - Version attribute handling for XSLT 2.0+ stylesheets
  - Should gracefully ignore unknown elements/attributes from future XSLT versions
  
- **Schema validation** (Section 17) - XSLT processor conformance validation
  - DTD validation not mentioned as supported

## Output Methods (Section 16)

All three standard output methods are implemented:
- ✓ XML output method (16.1)
- ✓ HTML output method (16.2) 
- ✓ Text output method (16.3)

Output attributes appear fully implemented:
- ✓ `method`, `version`, `encoding`, `omit-xml-declaration`, `standalone`
- ✓ `doctype-system`, `doctype-public`, `cdata-section-elements`, `indent`, `media-type`
- ✓ `disable-output-escaping` (16.4)

## Features Under Consideration (Future XSLT Versions, Section G)

These are not XSLT 1.0 features but noted as considerations:
- Conditional expressions (XSLT 2.0+)
- XML Schema datatypes
- Regular expressions
- Multiple result documents
- Additional sorting controls
- Result tree fragment operations

## XSLT 2.0 New Elements and Features [XSLT 2.0]

### Major New Instructions/Declarations (not in XSLT 1.0):

- **`<xsl:analyze-string>`** - Parse text against regular expressions (Section 15)
  - Requires regex engine support
  - Provides `xsl:matching-substring` and `xsl:non-matching-substring` children
  
- **`<xsl:for-each-group>`** - Group sequences of nodes (Section 14)
  - Attributes: `group-by`, `group-adjacent`, `group-starting-with`, `group-ending-with`
  - Functions: `current-group()`, `current-grouping-key()`
  
- **`<xsl:function>`** - Define stylesheet functions (Section 10.3)
  - User-defined functions callable from XPath expressions
  - Support for parameters and return types via `as` attribute
  - Override attribute for controlling function precedence
  
- **`<xsl:import-schema>`** - Load XML Schema (Section 3.13)
  - Schema-aware XSLT processor feature
  - Provides type information for validation
  
- **`<xsl:namespace>`** - Create namespace nodes (Section 11.7)
  - Computed namespace URI and prefix
  
- **`<xsl:next-match>`** - Continue to next matching template (Section 6.6)
  - Similar to `xsl:apply-imports` but for next template match
  - Parameters passed via `xsl:with-param`
  
- **`<xsl:perform-sort>`** - Sort a sequence (Section 13)
  - Returns sorted sequence instead of processing
  
- **`<xsl:result-document>`** - Create multiple result documents (Section 19.1)
  - `href` attribute specifies output URI
  - Output formatting via serialization parameters
  - Supports validation and type attributes
  
- **`<xsl:character-map>`** - Map characters on serialization (Section 20.1)
  - Maps Unicode characters to output strings
  - Alternative to `disable-output-escaping`
  - Contains `xsl:output-character` children

### XSLT 2.0 Enhancements to Existing Instructions:

- **`<xsl:apply-templates>`** - Enhanced with mode support
  - Can specify multiple modes with comma-separated list
  - `#current` pseudo-mode for continuing in current mode
  - `#default` pseudo-mode for default mode processing
  
- **`<xsl:template>`** - Enhanced with multiple modes
  - `mode` attribute can have `#all` special value
  - Can apply to multiple modes simultaneously
  
- **`<xsl:sort>`** - Enhanced with collation support (Section 13.1)
  - `collation` attribute for custom collation URI
  - `stable` attribute for stable sort behavior (yes/no)
  - `data-type` can be QName (not just "text" or "number")
  
- **`<xsl:value-of>`** - Can now construct sequence
  - `separator` attribute to join multiple values
  - Can select sequences via `select` attribute
  
- **`<xsl:copy>`, `<xsl:element>`, `<xsl:attribute>`** - Enhanced with:
  - `validation` attribute (strict/lax/preserve/strip)
  - `type` attribute for schema type validation
  - `inherit-namespaces` attribute
  - `copy-namespaces` attribute
  
- **`<xsl:param>` and `<xsl:with-param>`** - Enhanced:
  - `tunnel` attribute for tunnel parameters
  - `required` attribute for stylesheet parameters (yes/no)
  - `as` attribute for sequence type declarations
  
- **`<xsl:output>`** - Many new serialization options [XSLT 2.0]
  - `byte-order-mark`, `escape-uri-attributes`, `normalization-form`
  - `undeclare-prefixes`, `use-character-maps`
  - `method` can be custom QName (not just xml/html/text)

### XSLT 2.0 New XPath Functions:

- **`current-group()`** - Used within `xsl:for-each-group` (Section 14)
  
- **`current-grouping-key()`** - Get current group key (Section 14)
  
- **`unparsed-text()`** - Read external text file (Section 16.2)
  - Parallel to `document()` but for text files
  - Encoding parameter supported
  
- **`unparsed-text-available()`** - Check if text file available (Section 16.2)
  
- **`doc()` and `doc-available()`** - Load XML documents (Section 16.1)
  - XPath 2.0 functions referenced in XSLT context
  - More flexible than XSLT 1.0 `document()` function
  
- **`collection()`** - Access document collections (Section 16.1)
  - Implementation-defined behavior
  
- **`type-available()`** - Check if type name is available (Section 18.1.4)
  - Tests for schema type availability
  
- **Date/Time Functions** - Comprehensive set (Section 16.5)
  - `format-date()`, `format-time()`, `format-dateTime()`
  - `current-date()`, `current-time()`, `current-dateTime()`
  - Language/calendar/country parameters for localization

### XSLT 2.0 New Language Features:

- **Sequence Types** - XPath 2.0 feature used in XSLT (Section 5.3, 9)
  - Used in `as` attribute of variables, parameters, functions, templates
  - Syntax: `element(name)`, `attribute(name)`, `xs:string+`, etc.
  
- **Attribute Value Templates** - Enhanced expression support
  - Can use complex XPath 2.0 expressions inside `{}`
  - XPath 2.0 operators available
  
- **Mode System Enhanced** - (Section 6)
  - `mode` attribute can list multiple modes
  - `#default` special mode
  - `#current` for inheriting current mode
  - Mode declarations on templates
  
- **Default Collation Attribute** - `default-collation` on stylesheet (Section 3.6.1)
  - Specifies collation for string comparison
  - Used by keys, grouping, sorting
  
- **XPath Default Namespace** - `xpath-default-namespace` attribute (Section 5.2)
  - Provides default namespace for unprefixed QNames in expressions
  - Different from XML default namespace

### XSLT 2.0 Partial/Unimplemented Features:

- **Schema Awareness** (Section 21.2) [XSLT 2.0 - Schema-Aware Processor]
  - Validation of constructed nodes
  - Type annotations in source and result trees
  - NOT IMPLEMENTED - requires XML Schema processor integration
  
- **Static Typing** (Section 21) [XSLT 2.0 - Optional]
  - Optional feature for detecting type errors at compile time
  - NOT IMPLEMENTED
  
- **Backwards-Compatible Mode** (Section 3.8) [XSLT 2.0]
  - Processing XSLT 1.0 stylesheets with XSLT 2.0 processor
  - Compatibility handling for version attribute
  - Fallback function binding
  
- **Forwards-Compatible Mode** (Section 3.9) [XSLT 2.0]
  - Allows XSLT 2.0 stylesheets to run on XSLT 1.0 processors (with fallback)
  - Version attribute > 2.0 triggers special handling

## XSLT 3.0 New Elements and Features [XSLT 3.0]

XSLT 3.0 (W3C Recommendation since June 2017) adds advanced features for package distribution, streaming, and enhanced text processing. These are substantial additions requiring significant implementation effort.

### Major New Instructions [XSLT 3.0]:

- **`<xsl:break>`** - Exit from `xsl:iterate` (Section 8.8.1)
  - Used within `xsl:iterate` to terminate iteration early
  - Returns current sequence constructor result
  
- **`<xsl:iterate>`** - Iterate with state (Section 8.8) ✅ IMPLEMENTED
  - More powerful than `xsl:for-each`, maintains iteration state ✅
  - Attributes: `select`, `as` (sequence type) ✅
  - Contains `xsl:param` for iteration parameters ✅
  - Contains `xsl:on-completion` for final processing ✅
  
- **`<xsl:on-completion>`** - Complete iteration (Section 8.8.5) ✅ IMPLEMENTED
  - Executed after `xsl:iterate` completes ✅
  - Can access final iteration state ✅
  
- **`<xsl:try>` / `<xsl:catch>`** - Error handling (Section 20.5) ✅ IMPLEMENTED
  - Structured error handling with pattern matching ✅
  - Catch specific errors or all errors ✅
  
- **`<xsl:evaluate>`** - Dynamic XPath evaluation (Section 19.2) ✅ IMPLEMENTED
  - Execute XPath expressions constructed at runtime ✅
  - Supports context item and variable parameters ✅
  
- **`<xsl:on-empty>` / `<xsl:on-non-empty>`** - Conditional processing (Section 8.3) ✅ IMPLEMENTED
  - Conditional processing within sequence-generating instructions ✅
  
- **`<xsl:package>`** - Package declaration [XSLT 3.0 - Packages]
  - Root element for reusable XSLT packages
  - Attributes: `name`, `package-version`, `input-type-annotations`
  - Replaces/enhances `xsl:stylesheet` for packages
  
- **`<xsl:use-package>`** - Import package [XSLT 3.0 - Packages]
  - Import XSLT package with version support
  - Attributes: `name`, `package-version`
  - Contains `xsl:override` for selective overrides
  
- **`<xsl:override>`** - Override components [XSLT 3.0 - Packages]
  - Override templates/functions from imported package
  - Used within `xsl:use-package`

### XSLT 3.0 Streaming Features [XSLT 3.0 - Streaming]:

- **`<xsl:stream>`** - Process stream (Section 16)
  - Process large documents without loading entirely into memory
  - Used with `streamable` template attribute
  
- **`<xsl:merge>`** - Merge multiple sorted documents (Section 15)
  - Merge sorted sequences from multiple sources
  - Contains `xsl:merge-source` children
  
- **`<xsl:merge-source>`** - Merge source (Section 15.1)
  - Defines source for merge operation
  - Streaming-capable processing
  
- **`<xsl:fork>`** - Fork processing [XSLT 3.0 - Streaming]
  - Create multiple output streams
  - Useful for streaming transformations
  
- **Streamable patterns** - Pattern syntax for streaming
  - Special pattern matching for streamed processing
  - Restrictions on context access

### XSLT 3.0 Enhancements to Existing Instructions:

- **`<xsl:template>`** - New attributes [XSLT 3.0]
  - `streamable` attribute (yes/no) for streaming templates
  - `cache` attribute for caching results
  
- **`<xsl:function>`** - Enhanced [XSLT 3.0]
  - `cache` attribute for function result caching
  - `streamable` attribute for streaming functions
  
- **`<xsl:variable>` / `<xsl:param>`** - Enhanced [XSLT 3.0]
  - `cache` attribute for caching values
  - Can use streamable expressions
  
- **`<xsl:copy-of>`** - Enhanced [XSLT 3.0]
  - New attributes for streaming context
  
- **`<xsl:output>`** - New parameters [XSLT 3.0]
  - `base-element` for XHTML5 output
  - `html-version` for HTML5 support
  
- **`<xsl:variable>` - Enhanced initialization**
  - Can use sequences without `as` attribute
  - Default behavior improved for common cases

### XSLT 3.0 New XPath Functions:

- **`map` type operations** (XPath 3.0) [XSLT 3.0]
  - `map:new()`, `map:entry()`, `map:get()`, `map:put()`, `map:remove()`, `map:size()`, `map:keys()`, `map:contains()`
  - Full map/dictionary support in XSLT expressions
  
- **`array` type operations** (XPath 3.0) [XSLT 3.0]
  - `array:new()`, `array:size()`, `array:head()`, `array:tail()`, `array:subarray()`, `array:append()`, `array:join()`, `array:reverse()`
  - Full array support for sequences
  
- **`json-to-xml()` and `xml-to-json()`** - Enhanced [XSLT 3.0]
  - Now standard (was 2.0 extension)
  - Support for custom mapping options
  
- **`parse-xml()` and `parse-xml-fragment()`** - Parse XML strings [XSLT 3.0]
  - Parse XML text at runtime
  - `parse-xml-fragment()` allows fragments
  
- **`serialize()`** - Serialize to string [XSLT 3.0]
  - Convert nodes to serialized XML/HTML/JSON text
  - Takes node and optional serialization parameters
  
- **`load-xslt()`** - Dynamic stylesheet loading [XSLT 3.0]
  - Load and cache XSLT stylesheets at runtime
  - Dynamic stylesheet compilation
  
- **`eval()`** - Evaluate XPath expression [XSLT 3.0]
  - Execute dynamically constructed XPath expressions
  - Security considerations for untrusted input
  
- **`regex` improvements** (XPath 3.0) [XSLT 3.0]
  - Enhanced regular expression support
  - `matches()`, `replace()`, `tokenize()` improvements
  - Unicode support enhancements
  
- **`string-join()`** - Join sequences [XSLT 3.0]
  - Join sequence items with separator
  - XPath 3.0 function
  
- **`string-length()` enhancements** - Unicode handling [XSLT 3.0]
  - Better Unicode grapheme cluster handling
  
- **`analyze-string()` function** [XSLT 3.0]
  - Available as function (instruction also exists in XSLT 2.0)
  
- **Math functions** (XPath 3.0) [XSLT 3.0]
  - `math:pi()`, `math:exp()`, `math:log()`, `math:sqrt()`, `math:sin()`, `math:cos()`, `math:tan()`, `math:pow()`
  - Scientific computing support
  
- **Higher-order functions** (XPath 3.0) [XSLT 3.0]
  - `function-lookup()` - Get function by name and arity
  - `partial-apply()` - Partial function application
  - Pass functions as values
  
- **Compared to XSLT 2.0**, new functions include:
  - JSON: `parse-json()` - parse JSON strings
  - QName: `QName()` - construct QName values
  - Dynamic SQL binding (extension-dependent)

### XSLT 3.0 New Language Features:

- **Packages and Modules** [XSLT 3.0 - Packages]
  - Replace/enhance import/include with package system
  - Version support for packages
  - Package interface definitions
  - Visibility modifiers for components
  
- **Accumulator functions** [XSLT 3.0 - Accumulators] ✅ IMPLEMENTED
  - `xsl:accumulator` - Define accumulators ✅
  - `accumulator-after()` / `accumulator-before()` - Access accumulator values (partial)
  - Stateful computation across template processing ✅
  
- **`<xsl:accumulator>` declaration** [XSLT 3.0 - Accumulators] ✅ IMPLEMENTED
  - Define reusable accumulators for templates ✅
  - Attributes: `name`, `initial-value`, `as` ✅
  - Contains `xsl:accumulator-rule` children ✅
  
- **`<xsl:accumulator-rule>` element** [XSLT 3.0 - Accumulators] ✅ IMPLEMENTED
  - Define rules for accumulator computation ✅
  - `match` attribute for node matching ✅
  - `new-value` expression for accumulation ✅
  - `phase` attribute (start/end) ✅
  
- **Streaming mode** [XSLT 3.0 - Streaming]
  - Process documents in streaming fashion
  - Linearity restrictions for memory efficiency
  - For processing large XML documents
  
- **JSON as primary data format** [XSLT 3.0]
  - Full support for JSON input/output
  - Maps and arrays as native types
  - Object notation available
  
- **Regular expression syntax standardization** [XSLT 3.0]
  - XSD regex patterns now standard
  - Improved Unicode support
  - Named capture groups available
  
- **Partial evaluation and caching** [XSLT 3.0]
  - Cache results with `cache` attribute
  - Function result memoization
  - Template result caching
  
- **Post-processing of result documents** [XSLT 3.0]
  - Enhanced serialization control
  - Better HTML5 support
  - Character map improvements

### XSLT 3.0 Output Methods [XSLT 3.0]:

- **`html` method enhancements**
  - HTML5 support with `html-version` parameter
  - `base-element` for correct link handling
  
- **`xhtml` method enhancements**
  - XHTML5 output capability
  
- **`json` method** [XSLT 3.0]
  - Native JSON output serialization
  - Not just XML->JSON conversion
  - Custom JSON mapping options

### XSLT 3.0 Conformance Levels [XSLT 3.0]:

- **Basic XSLT 3.0 processor**
  - No streaming support
  - No packages/modules
  - Core language features
  
- **Schema-aware XSLT 3.0 processor**
  - XML Schema validation
  - Type annotations
  
- **Streaming XSLT 3.0 processor**
  - Streaming transformations
  - Memory-efficient processing
  - Additional restrictions

### XSLT 3.0 Partial/Unimplemented Features:

- **Package system** [XSLT 3.0 - Packages]
  - PARTIAL - foundation complete, full component resolution pending
  
- **Streaming mode** [XSLT 3.0 - Streaming]
  - PARTIAL - core architecture established, actual document streaming pending
  - Would enable processing of very large files
  
- **Accumulators** [XSLT 3.0 - Accumulators]
  - ✅ IMPLEMENTED - `xsl:accumulator`, `xsl:accumulator-rule`, pattern matching
  
- **JSON as primary type** [XSLT 3.0]
  - ✅ IMPLEMENTED - `json-to-xml()`, `xml-to-json()` functions
  - Native map/array support as first-class types
  
- **Higher-order functions** [XSLT 3.0]
  - ✅ IMPLEMENTED - inline functions, named refs, dynamic calls
  - Missing: `function-lookup()`, `partial-apply()`
  
- **Dynamic XSLT compilation** [XSLT 3.0]
  - ✅ PARTIALLY IMPLEMENTED - `xsl:evaluate` for dynamic XPath
  - Missing: `load-xslt()`, `eval()`
  
- **Math and scientific functions** [XSLT 3.0]
  - Partially implemented - some basic math functions exist
  - Missing: trigonometric, logarithmic, advanced functions

## Partially Tested Features

The following features need verification of complete specification compliance:
- **Modes** (Section 5.7) - Template processing with different modes
- **Variables and Parameters** (Section 11) - Scope and binding rules
- **Sorting** (Section 10) - Sort key evaluation and language-dependent sorting
- **Patterns** (Section 5.2) - Pattern matching against nodes
- **Literal result elements** (Section 7.1.1) - Namespace handling and attribute value templates

## Extension Mechanism (Section 14)

- **Extension elements** - Framework exists but implementation depends on processor
- **Extension functions** - Framework exists but implementation depends on processor
- Error handling for missing extensions appears implemented

---

## Statistics

### XSLT 1.0 Coverage:
- **Implemented XSLT Elements**: ~28+ out of 35+ elements in spec
- **Not Implemented XSLT Elements**: 1 (apply-imports)
- **Partially Implemented**: ~5
- **Implemented XPath Core Functions**: ~26+
- **XSLT Additional Functions**: ✅ All 9 functions implemented
  - `document()`, `key()`, `format-number()`, `generate-id()`, `current()`
  - `system-property()`, `element-available()`, `function-available()`
  - `unparsed-entity-uri()` (stub - DTD not available in JS)

### XSLT 2.0 Coverage:
- **New Instructions [XSLT 2.0]**: 9 elements not in XSLT 1.0 (analyze-string, for-each-group, function, import-schema, namespace, next-match, perform-sort, result-document, character-map)
  - **Implemented**: 0
  - **Not Implemented**: 9
- **Enhanced Instructions [XSLT 2.0]**: ~8+ existing instructions with new attributes/modes
  - **Partial Support**: Most have some new features but not all
- **New XPath Functions [XSLT 2.0]**: 15+ functions specific to XSLT 2.0
  - **Implemented**: 0
  - **Not Implemented**: 15+
- **New Language Features [XSLT 2.0]**: Sequence types, enhanced templates, default collation, xpath-default-namespace
  - **Implemented**: Minimal (basic type system exists)
  - **Not Implemented**: Most enhancements

### Summary:
- **XSLT 1.0**: ~85% functional (27+/35+ elements, all 9 XSLT functions implemented)
- **XSLT 2.0**: ~5% functional (mostly not implemented as separate layer)
- **XSLT 3.0**: ~5% functional (json-to-xml, xml-to-json implemented; major features require significant new architecture)

### XSLT 3.0 Coverage (if implemented):
- **New Instructions [XSLT 3.0]**: 6 major new elements (break, iterate, on-completion, package, use-package, override)
  - **Implemented**: 0
  - **Not Implemented**: 6
- **Streaming Features [XSLT 3.0]**: 5 elements (stream, merge, merge-source, fork, plus streamable patterns)
  - **Implemented**: 0
  - **Not Implemented**: 5
- **Enhanced Instructions [XSLT 3.0]**: ~5+ existing instructions with streaming/caching attributes
  - **Implemented**: 0
  - **Not Implemented**: 5+
- **New XPath Functions [XSLT 3.0]**: 20+ functions including maps, arrays, math, higher-order functions
  - **Implemented**: 0 (maps/arrays as native XPath types not supported)
  - **Not Implemented**: 20+
- **New Language Features [XSLT 3.0]**: Packages, accumulators, streaming, JSON, higher-order functions
  - **Implemented**: 0
  - **Not Implemented**: All major features

---

## Notes for Contributors

- Run tests frequently: `yarn test` or `npm test`
- Refer to [W3C XSLT 1.0 Spec](https://www.w3.org/TR/xslt-10/) for XSLT 1.0 specification details
- Refer to [W3C XSLT 2.0 Spec](https://www.w3.org/TR/xslt20/) for XSLT 2.0 specification details
- Refer to [W3C XSLT 3.0 Spec](https://www.w3.org/TR/xslt-30/) for XSLT 3.0 specification details
- Check [W3C XPath 1.0 Spec](https://www.w3.org/TR/xpath/) for XPath 1.0 details
- Check [W3C XPath 2.0 Spec](https://www.w3.org/TR/xpath20/) for XPath 2.0 details
- Check [W3C XPath 3.0 Spec](https://www.w3.org/TR/xpath-30/) for XPath 3.0 details
- Look at existing test files in `tests/` directory for examples
- The concat() bug is a priority fix due to common usage
- XSLT 3.0 package system and streaming are major architectural changes - consider carefully before implementation

### Recently Implemented (January 2026):
- ✅ All XSLT 1.0 Section 12 functions now implemented
- ✅ `system-property()`, `element-available()`, `function-available()` added
- ✅ `document()` basic implementation (requires documentLoader callback)
- ✅ Versioned XPath parser API (XPath10Parser, XPath20Parser, createXPathParser)
