# XSLT-processor

[![Build Status](https://travis-ci.com/fiduswriter/xslt-processor.svg?branch=master)](https://travis-ci.com/fiduswriter/xslt-processor)

_A JavaScript XSLT processor without native library dependencies._

## Howto

Install xslt-processor using npm::

```
npm install xslt-processor
```

Within your ES2015+ code, import the two main functions and apply them:

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

If you write pre-2015 JS code, make adjustments as needed.


## Introduction

XSLT-processor is an implementation of XSLT in JavaScript. Because XSLT uses
XPath, it is also an implementation of XPath that can be used
independently of XSLT. This implementation has the advantange that it
makes XSLT uniformly available whenever the browser's native XSLTProcessor()
is not available such as in node.js or in web workers.

XSLT-processor is a modernized version of the old Google's [AJAXSLT](https://github.com/4031651/ajaxslt)
which was written before XSLTProcessor() became available in browsers.

This implementation of XSLT operates at the DOM level on its input
documents. It internally uses a DOM implementation to create the
output document, but usually returns the output document as text
stream. The DOM to construct the output document can be supplied by
the application, or else an internal minimal DOM implementation is
used. This DOM comes with a minimal XML parser that can be used to
generate a suitable DOM representation of the input documents if they
are present as text.


## Tests and usage examples

New tests are written in Jest an can be run by calling: `npm test`.

Old tests are written in [jsunit](http://www.jsunit.net). The files ending in `_unittest.html` are jsunit test pages.
The files xslt.html and xpath.html in the directory test are interactive tests. They can be run directly from the file system; no HTTP server is needed.
Both unit tests and interactive tests demonstrate the use of the library functions. There is not much more documentation so far.

## Conformance

A few features that are required by the XSLT and XPath standards were left out.
They are marked in the source code using throw-statements. See xslt.js.

The DOM implementation is minimal so as to support the XSLT processing, and not intended to be complete.

The implementation is all agnostic about namespaces. It just expects
XSLT elements to have tags that carry the xsl: prefix, but we
disregard all namespace declaration for them.

There are a few nonstandard XPath functions. Grep xpath.js for `ext-` to see their definitions.


## References

- XPath Specification http://www.w3.org/TR/1999/REC-xpath-19991116

- XSLT Specification http://www.w3.org/TR/1999/REC-xslt-19991116

- W3C DOM Level 3 Core Specification http://www.w3.org/TR/2004/REC-DOM-Level-3-Core-20040407/

- ECMAScript Language Specification http://www.ecma-international.org/publications/standards/Ecma-262.htm
