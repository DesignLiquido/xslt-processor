# XSLT-processor

_A JavaScript XSLT processor without native library dependencies._

  <p align="center">
    <a href="https://github.com/DesignLiquido/xslt-processor/issues" target="_blank">
      <img src="https://img.shields.io/github/issues/Designliquido/xslt-processor" />
    </a>
    <img src="https://img.shields.io/github/stars/Designliquido/xslt-processor" />
    <img src="https://img.shields.io/github/forks/Designliquido/xslt-processor" />
    <a href="https://www.npmjs.com/package/xslt-processor" target="_blank">
      <img src="https://img.shields.io/npm/v/xslt-processor" />
    </a>
    <img src="https://img.shields.io/npm/dw/xslt-processor" />
    <img src="https://img.shields.io/github/license/DesignLiquido/xslt-processor" />
  </p>

## How to

Install xslt-processor using [npm](https://docs.npmjs.com/about-npm) or [yarn](https://yarnpkg.com):

```sh
npm install xslt-processor
```

```sh
yarn add xslt-processor
```

Within your ES2015+ code, import the `Xslt` class, the `XmlParser` class and use this way:

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

To access the XPath parser, you can use the instance present at `Xslt` class:

```js
const xslt = new Xslt();
const xPath = xslt.xPath;
```

Or ou can import it like this:

```js
import { XPath } from 'xslt-processor'

const xPath = new XPath();
```

If you write pre-2015 JS code, make adjustments as needed.

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
- `outputMethod` (`string`, default `xml`): Specifies the default output method. if `<xsl:output>` is declared in your XSLT file, this will be overridden.
- `parameters` (`array`, default `[]`): external parameters that you want to use.
    - `name`: the parameter name;
    - `namespaceUri` (optional): the namespace;
    - `value`: the value.

### Direct use in browsers

You can simply add a tag like this:

```html
<script type="application/javascript" src="https://www.unpkg.com/xslt-processor@3.0.0/umd/xslt-processor.js"></script>
```

All the exports will live under `globalThis.XsltProcessor` and `window.XsltProcessor`. [See a usage example here](https://github.com/DesignLiquido/xslt-processor/blob/main/interactive-tests/xslt.html). 

### Breaking Changes

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

## Introduction

XSLT-processor contains an implementation of XSLT in JavaScript. Because XSLT uses XPath, it also contains an implementation of XPath that can be used
independently of XSLT. This implementation has the advantage that it makes XSLT uniformly available whenever the browser's native `XSLTProcessor()`
is not available such as in Node.js or in web workers.

XSLT-processor builds on Google's [AJAXSLT](https://github.com/4031651/ajaxslt) which was written before `XSLTProcessor()` became available in browsers, but the
code base has been updated to comply with ES2015+ and to make it work outside of browsers.

This implementation of XSLT operates at the DOM level on its input documents. 
It internally uses a DOM implementation to create the output document, but usually 
returns the output document as text stream. The DOM to construct the output document can 
be supplied by the application, or else an internal minimal DOM implementation is used. This 
DOM comes with a minimal XML parser that can be used to generate a suitable DOM 
representation of the input documents if they are present as text.

## Tests and usage examples

New tests are written in Jest an can be run by calling: `npm test`.

The files `xslt.html` and `xpath.html` in the directory `interactive-tests` are interactive tests. They can be run directly from the file system; no HTTP server is needed.
Both interactive tests and automatic tests demonstrate the use of the library functions. There is not much more documentation so far.

## Conformance

A few features that are required by the XSLT and XPath standards were left out (but patches to add them are welcome).
See our [TODO](TODO.md) for a list of missing features that we are aware of (please add more items by means of PRs).

So far, we have implemented XQuery functions for versions 1.0 and 2.0, but this is not complete yet.

Issues are also marked in the source code using throw-statements.

The DOM implementation is minimal so as to support the XSLT processing, and not intended to be complete.

The implementation is all agnostic about namespaces. It just expects XSLT elements to have tags that carry the `xsl:` prefix, but we disregard all namespace declaration for them.

[There are a few nonstandard XPath functions](https://github.com/search?q=repo%3ADesignLiquido%2Fxslt-processor%20ext-&type=code). 

### HTML Conformance

HTML per se is not strict XML. Because of that, starting on version 2.0.0, this library handles HTML differently than XML:

- For a document to be treated as HTML, it needs to have a `<!DOCTYPE>` tag defined with one of the following valid formats:
  - `<!DOCTYPE html>` (for HTML5);
  - `<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">` (for HTML4);
  - `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">` (for XHTML 1.1).
- Tags like `<hr>`, `<link>` and `<meta>` don't need to be closed. The output for these tags doesn't close them (adding a `/` before the tag closes, or a corresponding close tag);
  - This rule doesn't apply for XHTML, which is strict XML.

## References

- XPath Specification: http://www.w3.org/TR/1999/REC-xpath-19991116
- XSLT Specification: http://www.w3.org/TR/1999/REC-xslt-19991116
- W3C DOM Level 3 Core Specification: http://www.w3.org/TR/2004/REC-DOM-Level-3-Core-20040407/
- ECMAScript Language Specification: http://www.ecma-international.org/publications/standards/Ecma-262.htm
