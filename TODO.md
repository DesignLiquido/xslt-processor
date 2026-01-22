XSLT-processor TODO
=====

* XSL:number
* Implement `<xsl:import>` with correct template precedence.
* **BUG: concat() function with XPath expressions** - When using `concat()` with XPath expressions as arguments (e.g., `concat(root/first, ' ', root/second)`), the function returns malformed output like "1, first, null 1, second, null" instead of properly concatenating the string values. This appears to be an issue with how XPath NodeSetValue results are being converted to strings within the concat function.

Help is much appreciated. It seems to currently work for most of our purposes, but fixes and additions are always welcome!
