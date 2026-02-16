# XSLT-processor

_A JavaScript XSLT processor without native library dependencies._

  <p align="center">
    <a href="https://github.com/DesignLiquido/xslt-processor/issues" target="_blank">
      <img src="https://img.shields.io/github/issues/DesignLiquido/xslt-processor" />
    </a>
    <img src="https://img.shields.io/github/stars/Designliquido/xslt-processor" />
    <img src="https://img.shields.io/github/forks/Designliquido/xslt-processor" />
    <a href="https://www.npmjs.com/package/xslt-processor" target="_blank">
      <img src="https://img.shields.io/npm/v/xslt-processor" />
    </a>
    <img src="https://img.shields.io/npm/dw/xslt-processor" />
    <img src="https://img.shields.io/github/license/DesignLiquido/xslt-processor" />
    <a href="https://github.com/sponsors/leonelsanchesdasilva" target="_blank">
      <img src="https://img.shields.io/github/sponsors/leonelsanchesdasilva" />
    </a>
    <a href="https://buymeacoffee.com/leonelsanches" target="_blank">
      <img src="https://img.shields.io/badge/Buy%20Me%20a%20Coffee-orange?logo=buy-me-a-coffee" />
    </a>
  </p>

## Interactive Demos

Try the XSLT and XPath processors directly in your browser:

**[🚀 Visit Interactive Demos](https://designliquido.github.io/xslt-processor/)**

## How to

Install xslt-processor using [npm](https://docs.npmjs.com/about-npm), [ohpm](https://ohpm.openharmony.cn/#/en/home) or [yarn](https://yarnpkg.com):

```sh
npm install xslt-processor
```

```sh
ohpm install xslt-processor
```

```sh
yarn add xslt-processor
```

Within your ES2015+ code, import the `Xslt` class, the `XmlParser` class and use it this way:

```js
import { Xslt, XmlParser } from 'xslt-processor'

// xmlString: string of xml file contents
// xsltString: string of xslt file contents
// outXmlString: output xml string.
const xslt = new Xslt();
const xmlParser = new XmlParser();
// Either
const outXmlString = await xslt.xsltProcess(
	xmlParser.xmlParse(xmlString),
	xmlParser.xmlParse(xsltString)
);
// Or
xslt.xsltProcess(
	xmlParser.xmlParse(xmlString),
	xmlParser.xmlParse(xsltString)
).then(output => {
  // `output` is equivalent to `outXmlString` (a string with XML).
});
```

If you write pre-2015 JS code, make adjustments as needed.

### Working with browser DOM and XDocument output

Feature available in v5 (next major) of this library. 

If you already have a browser DOM `Document` or `Node`, convert it to an `XDocument` without re-parsing XML strings:

```js
import { domDocumentToXDocument } from 'xslt-processor'

const parser = new DOMParser();
const nativeDoc = parser.parseFromString('<root>hello</root>', 'text/xml');
const xDoc = domDocumentToXDocument(nativeDoc);
```

You can also run XSLT and get the output as an `XDocument` tree instead of a serialized string:

```js
import { Xslt, XmlParser } from 'xslt-processor'

const xmlParser = new XmlParser();
const xslt = new Xslt();

const xmlDoc = xmlParser.xmlParse('<root><item>hello</item></root>');
const styleDoc = xmlParser.xmlParse(
  '<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">' +
  '  <xsl:template match="/">' +
  '    <output><xsl:value-of select="/root/item"/></output>' +
  '  </xsl:template>' +
  '</xsl:stylesheet>'
);

const outDoc = await xslt.xsltProcessToDocument(xmlDoc, styleDoc);
// outDoc is an XDocument you can traverse or serialize with xmlTransformedText.
```

### `Xslt` class options

You can pass an `options` object to `Xslt` class:

```js
const options = {
  escape: false,
  selfClosingTags: true,
  parameters: [{ name: 'myparam', value: '123' }],
  outputMethod: 'xml'
};
const xslt = new Xslt(options);
```

- `cData` (`boolean`, default `true`): resolves CDATA elements in the output. Content under CDATA is resolved as text. This overrides `escape` for CDATA content.
- `escape` (`boolean`, default `true`): replaces symbols like `<`, `>`, `&` and `"` by the corresponding [HTML/XML entities](https://www.tutorialspoint.com/xml/xml_character_entities.htm). Can be overridden by `disable-output-escaping`, that also does the opposite, unescaping `&gt;` and `&lt;` by `<` and `>`, respectively.
- `selfClosingTags` (`boolean`, default `true`): Self-closes tags that don't have inner elements, if `true`. For instance, `<test></test>` becomes `<test />`.
- `outputMethod` (`string`, default `xml`): Specifies the default output method. If `<xsl:output>` is declared in your XSLT file, this will be overridden. Valid values: `xml`, `html`, `text`, `xhtml`, `json`, `adaptive`.
- `parameters` (`array`, default `[]`): external parameters that you want to use.
    - `name`: the parameter name;
    - `namespaceUri` (optional): the namespace;
    - `value`: the value. The type is preserved automatically:
        - **string** values become `StringValue`;
        - **number** values become `NumberValue` (usable in XPath arithmetic);
        - **boolean** values become `BooleanValue` (usable in `xsl:if`/`xsl:when` tests);
        - Note: in XPath/XSLT, any non-empty string is truthy, so the string "false" still behaves as true in tests;
        - **`NodeSetValue`** instances are kept as-is (useful for passing additional documents);
        - DOM nodes (objects with `nodeType`) are wrapped in a `NodeSetValue`;
        - arrays of nodes are wrapped in a `NodeSetValue`.

**`parameters` examples:**

```js
import { Xslt, XmlParser } from 'xslt-processor'

// String parameter (default behavior)
const xslt = new Xslt({ parameters: [
  { name: 'title', value: 'Hello' }
] });

// Number parameter — works in XPath arithmetic ($count + 1 = 43)
const xslt = new Xslt({ parameters: [
  { name: 'count', value: 42 }
] });

// Boolean parameter — works in xsl:if / xsl:when tests
const xslt = new Xslt({ parameters: [
  { name: 'debug', value: true }
] });

// Node-set parameter — pass an additional document for cross-document lookups
import { NodeSetValue } from 'xslt-processor/xpath/values'

const xmlParser = new XmlParser();
const lookupDoc = xmlParser.xmlParse('<lookup><entry key="a">Alpha</entry></lookup>');

const xslt = new Xslt({ parameters: [
  { name: 'lookup', value: new NodeSetValue([lookupDoc]) }
] });
// In XSLT: <xsl:value-of select="$lookup/lookup/entry[@key='a']"/>
```

- `fetchFunction` (`(uri: string) => Promise<string>`, optional): a custom function for loading external resources referenced by `<xsl:import>` and `<xsl:include>`. Receives the URI and must return the fetched content as a string. Defaults to the global `fetch` API. This is useful for:
    - Denying external loading entirely;
    - Loading from the local filesystem or other non-HTTP sources;
    - Transforming or remapping URIs before fetching.

**`fetchFunction` examples:**

```js
import { readFileSync } from 'fs';

// Deny all external loading
const xslt = new Xslt({
  fetchFunction: async (uri) => {
    throw new Error(`External loading is not allowed: ${uri}`);
  }
});

// Load from local filesystem
const xslt = new Xslt({
  fetchFunction: async (uri) => {
    return readFileSync(uri, 'utf-8');
  }
});

// Remap URIs before fetching
const xslt = new Xslt({
  fetchFunction: async (uri) => {
    const remapped = uri.replace('https://example.com/', '/local/stylesheets/');
    const response = await fetch(remapped);
    return response.text();
  }
});
```

#### JSON Output Format

When using `outputMethod: 'json'`, the XSLT processor will convert the resulting XML document to JSON format. This is useful for APIs and modern JavaScript applications.

**Example:**

```js
const xslt = new Xslt({ outputMethod: 'json' });
const xmlParser = new XmlParser();

const xmlString = `<root>
  <users>
    <user>Alice</user>
    <user>Bob</user>
  </users>
</root>`;

const xsltString = `<?xml version="1.0"?>
  <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:template match="/">
      <xsl:copy-of select="root"/>
    </xsl:template>
  </xsl:stylesheet>`;

const result = await xslt.xsltProcess(
  xmlParser.xmlParse(xmlString),
  xmlParser.xmlParse(xsltString)
);

// result will be a JSON string:
// {"root":{"users":{"user":["Alice","Bob"]}}}

const parsed = JSON.parse(result);
console.log(parsed.root.users.user); // ["Alice", "Bob"]
```

**JSON Structure Rules:**

- Each element becomes a property in a JSON object
- Text-only elements become string values
- Elements with multiple children of the same name become arrays
- Empty elements are omitted from the output
- Attributes are prefixed with `@` (when present in the output)
- Mixed text and element content uses the `#text` property for text nodes

#### Adaptive Output Format

When using `outputMethod: 'adaptive'`, the XSLT processor automatically detects the most appropriate output format based on the transformation result. This implements XSLT 3.1 adaptive output behavior.

**Detection Rules:**

- If the output contains only text nodes (no elements), it returns as plain text
- If the output contains one or more elements, it returns as XML

**Example:**

```js
const xslt = new Xslt({ outputMethod: 'adaptive' });
const xmlParser = new XmlParser();

// Example 1: Pure text output
const xmlString1 = `<root><value>Hello World</value></root>`;
const xsltString1 = `<?xml version="1.0"?>
  <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:template match="/">
      <xsl:value-of select="root/value"/>
    </xsl:template>
  </xsl:stylesheet>`;

const result1 = await xslt.xsltProcess(
  xmlParser.xmlParse(xmlString1),
  xmlParser.xmlParse(xsltString1)
);
console.log(result1); // "Hello World" (plain text)

// Example 2: XML output
const xmlString2 = `<root><user>John</user></root>`;
const xsltString2 = `<?xml version="1.0"?>
  <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:template match="/">
      <users><xsl:copy-of select="root/user"/></users>
    </xsl:template>
  </xsl:stylesheet>`;

const result2 = await xslt.xsltProcess(
  xmlParser.xmlParse(xmlString2),
  xmlParser.xmlParse(xsltString2)
);
console.log(result2); // "<users><user>John</user></users>" (XML)
```

### Direct use in browsers

You can simply add a tag like this:

```html
<script type="application/javascript" src="https://unpkg.com/xslt-processor@latest/umd/xslt-processor.global.js"></script>
```

All the exports will live under `globalThis.XsltProcessor` and `window.XsltProcessor`. [See a usage example here](https://github.com/DesignLiquido/xslt-processor/blob/main/interactive-tests/xslt.html).

## XPath Parser

To access the XPath parser, you can use the instance present at `Xslt` class:

```js
const xslt = new Xslt();
const xPath = xslt.xPath;
```

Or you can import it like this:

```js
import { XPath } from 'xslt-processor'

const xPath = new XPath();
```

`XPath` class is an external dependency, [living in its own repository](https://github.com/DesignLiquido/xpath).

## Introduction

XSLT-processor contains an implementation of XSLT in JavaScript. Because XSLT uses XPath, it also contains an implementation of XPath that can be used independently of XSLT. This implementation has the advantage that it makes XSLT uniformly available whenever the browser's native `XSLTProcessor()`
is not available such as in Node.js or in web workers.

XSLT-processor builds on Google's [AJAXSLT](https://github.com/4031651/ajaxslt) which was written before `XSLTProcessor()` became available in browsers, but the code base has been updated to comply with ES2015+ and to make it work outside of browsers.

This implementation of XSLT operates at the DOM level on its input documents. It internally uses a DOM implementation to create the output document, but usually returns the output document as text stream. The DOM to construct the output document can be supplied by the application, or else an internal minimal DOM implementation is used. This DOM comes with a minimal XML parser that can be used to generate a suitable DOM representation of the input documents if they are present as text.

## Building from source

The XPath engine lives in a Git submodule at `src/xpath/lib`. A regular `git clone` does **not** fetch it automatically, so the build will fail unless the submodule is initialised.

### Fresh clone

```sh
git clone --recurse-submodules https://github.com/DesignLiquido/xslt-processor.git
cd xslt-processor
yarn install
yarn build
```

### Already cloned without submodules

```sh
git submodule update --init --recursive
yarn install
yarn build
```

### Updating the submodule to the latest commit

```sh
git submodule update --remote src/xpath/lib
```

## Tests and usage examples

New tests are written in Jest and can be run by calling: `yarn test`.

The files `xslt.html` and `xpath.html` in the directory `interactive-tests` are interactive tests. They can be run directly from the file system; no HTTP server is needed.

Both interactive tests and automatic tests demonstrate the use of the library functions.

## Conformance

A few features that are required by the XSLT and XPath standards were left out (but patches to add them are welcome).

See our [TODO](TODO.md) for a list of missing features that we are aware of (please add more items by means of PRs).

So far, we have implemented XQuery functions for versions 1.0 and 2.0, but this is not complete yet.

The DOM implementation is minimal so as to support the XSLT processing, and not intended to be complete.

The implementation is all agnostic about namespaces. It just expects XSLT elements to have tags that carry the `xsl:` prefix, but we disregard all namespace declarations for them.

[There are a few nonstandard XPath functions](https://github.com/search?q=repo%3ADesignLiquido%2Fxslt-processor%20ext-&type=code).

### HTML Conformance

HTML per se is not strict XML. Because of that, starting on version 2.0.0, this library handles HTML differently than XML:

- For a document to be treated as HTML, it needs to have a `<!DOCTYPE>` tag defined with one of the following valid formats:
  - `<!DOCTYPE html>` (for HTML5);
  - `<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">` (for HTML4);
  - `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">` (for XHTML 1.1).
- Tags like `<hr>`, `<link>` and `<meta>` don't need to be closed. The output for these tags doesn't close them (adding a `/` before the tag closes, or a corresponding close tag);
  - This rule doesn't apply for XHTML, which is strict XML.

### Whitespace Handling

This library supports `xsl:strip-space` and `xsl:preserve-space` for controlling whitespace in the input document.

#### `xsl:strip-space`

Use `<xsl:strip-space>` to remove whitespace-only text nodes from specified elements in the input document:

```xml
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <!-- Strip whitespace from all elements -->
    <xsl:strip-space elements="*"/>

    <!-- Or strip from specific elements -->
    <xsl:strip-space elements="book chapter section"/>

    <!-- ... templates ... -->
</xsl:stylesheet>
```

The `elements` attribute accepts:
- `*` - matches all elements
- `name` - matches elements with the specified local name
- `prefix:*` - matches all elements in a namespace
- `prefix:name` - matches a specific element in a namespace
- Multiple patterns separated by whitespace (e.g., `"book chapter section"`)

#### `xsl:preserve-space`

Use `<xsl:preserve-space>` to preserve whitespace in specific elements, overriding `xsl:strip-space`:

```xml
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:strip-space elements="*"/>
    <!-- Preserve whitespace in pre and code elements -->
    <xsl:preserve-space elements="pre code"/>

    <!-- ... templates ... -->
</xsl:stylesheet>
```

#### Precedence Rules

1. `xml:space="preserve"` attribute on an element takes highest precedence
2. `xsl:preserve-space` overrides `xsl:strip-space` for matching elements
3. `xsl:strip-space` applies to remaining matches
4. By default (no declarations), whitespace is preserved

### Breaking Changes

Breaking changes are usually documented at every major release, but we also keep a short version of them below.

#### Version 2

Until version 2.3.1, use like the example below:

```js
import { Xslt, XmlParser } from 'xslt-processor'

// xmlString: string of xml file contents
// xsltString: string of xslt file contents
// outXmlString: output xml string.
const xslt = new Xslt();
const xmlParser = new XmlParser();
const outXmlString = xslt.xsltProcess( // Not async.
	xmlParser.xmlParse(xmlString),
	xmlParser.xmlParse(xsltString)
);
```

Version 3 received `<xsl:include>` which relies on Fetch API, which is asynchronous. Version 2 doesn't support `<xsl:include>`.

If using Node.js older than version v17.5.0, please use version 3.2.3, that uses `node-fetch` package. Versions 3.3.0 onward require at least Node.js version v17.5.0, since they use native `fetch()` function.

#### Version 1

Until version 1.2.8, use like the example below:

```js
import { Xslt, xmlParse } from 'xslt-processor'

// xmlString: string of xml file contents
// xsltString: string of xslt file contents
// outXmlString: output xml string.
const xslt = new Xslt();
const outXmlString = xslt.xsltProcess(
	xmlParse(xmlString),
	xmlParse(xsltString)
);
```

#### Version 0

Until version 0.11.7, use like the example below:

```js
import { xsltProcess, xmlParse } from 'xslt-processor'

// xmlString: string of xml file contents
// xsltString: string of xslt file contents
// outXmlString: output xml string.
const outXmlString = xsltProcess(
	xmlParse(xmlString),
	xmlParse(xsltString)
);
```

and to access the XPath parser:

```js
import { xpathParse } from 'xslt-processor'
```

These functions are part of `Xslt` and `XPath` classes, respectively, at version 1.x onward.

## References

- XPath Specification: http://www.w3.org/TR/1999/REC-xpath-19991116
- XSLT Specification: http://www.w3.org/TR/1999/REC-xslt-19991116
- W3C DOM Level 3 Core Specification: http://www.w3.org/TR/2004/REC-DOM-Level-3-Core-20040407/
- ECMAScript Language Specification: http://www.ecma-international.org/publications/standards/Ecma-262.htm
- Arkts Language Specification: https://gitee.com/openharmony/arkcompiler_runtime_core/releases/download/ArkTS-spec-1.2.0-alpha-20250307/arktsspecification.pdf
