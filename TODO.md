XSLT-processor TODO
=====

* Rethink match algorithm, as described in https://github.com/DesignLiquido/xslt-processor/pull/62#issuecomment-1636684453. There's a good number of issues open about this problem:
    * https://github.com/DesignLiquido/xslt-processor/issues/108
    * https://github.com/DesignLiquido/xslt-processor/issues/109
    * https://github.com/DesignLiquido/xslt-processor/issues/110
* XSLT validation, besides the version number;
* XSL:number
* `attribute-set`, `decimal-format`, etc. (check `src/xslt.ts`)
* `/html/body//ul/li|html/body//ol/li` has `/html/body//ul/li` evaluated by this XPath implementation as "absolute", and `/html/body//ol/li` as "relative". Both should be evaluated as "absolute". One idea is to rewrite the XPath logic entirely, since it is nearly impossible to debug it.
* Implement `<xsl:import>` with correct template precedence. 

Help is much appreciated. It seems to currently work for most of our purposes, but fixes and additions are always welcome!
