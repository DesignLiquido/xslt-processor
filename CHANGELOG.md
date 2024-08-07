This document is no longer maintained in favor of [GitHub's release system](https://github.com/DesignLiquido/xslt-processor/releases), and just kept here for historical reasons.

2018-03-20  Johannes Wilm <johannes@fiduswriter.org>

	* Version 0.9.0
	* Changed code to ES2015+ style
	* Fixed a bug where xml parsing choked on < and > inside of quotation marks.
	* Renamed to xslt-processor

2007-11-16  Google Inc.  <opensource@google.com>

	* Version 0.8
	* Released as http://ajaxslt.googlecode.com/svn/tags/release-0-8/

	* Fixed a bug in parsing XPaths that end with "//qname" (Issue 17)

	* Added feature to optionally allow case-insensitive node name
	comparisons; this is useful when using XPaths on HTML, where
	node names are not consistent across browsers.

	* Improved performance by relying on getElementsByTagName where
	possible

	* Workaround IE bug where "javascript:" href attribute is URL
	encoded.  (Issue 19)

2006-12-28  Google Inc.  <opensource@google.com>

	* Version 0.7
	* Released as http://ajaxslt.googlecode.com/svn/tags/release-0-7/

	* Fixed a bug that semicolons are dropped by the XML parser when a
	text nodes also contains an entity.

	* Fixed a bug that xsl:variable definitions with a node set value
	encountered at the root level of the input document would throw an
	exception.

	* Fixed a bug that XPath expression @* always evaluated to the
	empty node set.

	* Fixed a bug that xsl:copy would copy only attribute and element
	nodes.

	* Fixed a bug that if xsl:apply-templates matches multiple
	templates, the output is sorted according to the order of the
	matching templates, and not according to the sort order defined
	for the selected node set to which templates are applied.

	* Added unittests for all fixed bugs.

	* Added wrapper function xmlOwnerDocument() to uniformly access
	the document on both document nodes and other nodes and use it
	throughout the xslt processor.

2006-12-14  Google Inc.  <opensource@google.com>

	* Version 0.6
	* Released as http://ajaxslt.googlecode.com/svn/tags/release-0-6/
	* Fixes infinite loops in evaluation of XPath axes "ancestor",
	  "ancestor-or-self", "preceding-sibling", "following-sibling".
	* Fixes evaluation of XPath axes "preceding", "following".
	* Added unittests for both.
	* Fixed xmlEscape*() functions to escape *all* markup characters
	  not just the first.
	* Fixed xsl:copy-of to also copy CDATA and COMMENT nodes.

2006-09-10  Google Inc. <opensource@google.com>

	* Version 0.5
	* Released on http://code.google.com/hosting/
	* General changes:
	  - remove all uses of for-in iteration
	  - rename misc.js to util.js
	  - log window is now in simplelog.js
	* XPath changes:
	  - fixed id() function
	  - fixed UnionExpr::evaluate()
	  - added support for Unicode chracters
	* XSLT changes:
	  - fixed xsl:sort in xsl:for-each (again)
	* DOM changes:
	  - added a few methods
	* XML parser changes:
	  - parses CDATA sections
	  - parses comments
	  - parses XML declaration
	  - parses Unicode XML markup
	* Test changes:
	  - added several jsunit tests

2005-10-19  Google Inc. <opensource@google.com>

	* Version 0.4
	* XPath changes:
	  - Optimize parsing of very common and simple expressions.
	  - Fix use of XPath operator names -- div, mod, and, or --
	    as node names in abbreviated step expressions.
	  - Fix root node -- it is now set to ownerDocument.
	* XSLT changes:
	  - Fix xsl:sort in xsl:for-each.
	* DOM changes:
	  - Add replaceChild(), insertBefore(), removeChild().
	    These are still not needed in XSLT processing, but
	    in another client of the DOM implementation.
	  - DOM nodes are recycled instead of garbage collected,
	    in order to improve performance in some browsers.
	* Test changes:
	  - Add many more test cases to the XPath tests.
	  - Add a note mentioning jsunit in the README.
	  - Add a DOM unittest file.

2005-08-27  Google Inc. <opensource@google.com>

	* Version 0.3 (not released on sourceforge)
	* XPath changes:
	  - Fix implementation of the * node test.
	  - Fix implementation of the substring() function.
	  - Fix non-abbreviated axis names.
	  - Fix filter expressions.
	* XSLT changes:
	  - Fix xsl:sort.
	* DOM changes:
	  - Avoid using String.split() that breaks in IE.
	  - Coerce nodeType to number and nodeName and nodeValue to string.
	  - Fix SGML entity replacement of single quotes in attribute values.
	* Test changes:
	  - Fix end tags of script elements in test HTML files.
	  - Add jsunit tests for xpath.js.


2005-06-29  Google Inc. <opensource@google.com>

	* Version 0.2
	* Add more missing code
	  - XML parser and simple DOM implementation in dom.js
	  - miscellaneous functions in misc.js.
	* Add simple test pages that serve as examples.
	  - test-xpath.html tests and demonstrates the XPath parser.
	  - test-xslt.html tests and demonstrates the XSLT processor.
	  - output methods for debugging of XPath expressions added
	    in xpathdebug.js.
	* Some additions and corrections in README and TODO
	  - renamed XSL-T to XSLT, because that's more common.
	  - miscellaneous updates.
