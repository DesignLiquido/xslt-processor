XSLT-processor -- A JavaScript XSLT Processor Library
===========

Howto
----

Install xslt-processor using npm::

```
npm install xslt-processor
```

Within your ES2015+ code, import the two main functions and apply them:

```js
import {xsltProcess, xmlParse} from "xslt-processor"

const xml = xmlParse(xmlString); // xmlString: string of xml file contents
const xslt = xmlParse(xsltString); // xsltString: string of xslt file contents
const outXmlString = xsltProcess(xml, xslt); // outXmlString: output xml string.
```

If you write pre-2015 JS code, make adjustments as needed.


Introduction
----
XSLT-processor is an implementation of XSLT in JavaScript. Because XSLT uses
XPath, it is also an implementation of XPath that can be used
independently of XSLT. This implementation has the advantange that it
makes XSLT uniformly available whenever the browser's native XSLTProcessor()
is not available such as in node.js or in web workers.

XSLT-processor is based on Google's [AJAXSLT](https://github.com/4031651/ajaxslt)
which was written before XSLTProcessor() became available in browsers.
XSLT-processor has a modernized codebase.

This implementation of XSLT operates at the DOM level on its input
documents. It internally uses a DOM implementation to create the
output document, but usually returns the output document as text
stream. The DOM to construct the output document can be supplied by
the application, or else an internal minimal DOM implementation is
used. This DOM comes with a minimal XML parser that can be used to
generate a suitable DOM representation of the input documents if they
are present as text.


Not-yet-supported XSLT processor directives
----
This project is pre-release and not all elements are supported (for example, import and include) which might make this project unready to replace your current parser. See [THIS](https://github.com/fiduswriter/xslt-processor/blob/master/src/xslt.js#L95) switch() call to know which.


Tests and usage examples
----
The files ending in _unittest.html are jsunit test pages. See
<http://www.jsunit.net/>.

The files xslt.html and xpath.html in the directory test are
interactive tests. They can be run directly from the file system; no
HTTP server is needed.

Both unit tests and interactive tests demonstrate the use of the
library functions. There is not much more documentation so far.

Conformance
----
A few features that are required by the XSLT and XPath standards were
left out. They are marked in the source code using alert()
statements. See xslt.js.

The DOM implementation is minimal so as to support the XSLT
processing, and not intended to be complete.

The implementation is all agnostic about namespaces. It just expects
XSLT elements to have tags that carry the xsl: prefix, but we
disregard all namespace declaration for them.

There are a few nonstandard XPath functions. Grep xpath.js for "ext-"
to see their definitions.


References
----
[XPATH] XPath Specification
     <http://www.w3.org/TR/1999/REC-xpath-19991116>.
[XSLT] XSLT Specification
     <http://www.w3.org/TR/1999/REC-xslt-19991116>.
[DOM] W3C DOM Level 3 Core Specification
     <http://www.w3.org/TR/2004/REC-DOM-Level-3-Core-20040407/>.
[ECMA] ECMAScript Language Specification
     <http://www.ecma-international.org/publications/standards/Ecma-262.htm>.
