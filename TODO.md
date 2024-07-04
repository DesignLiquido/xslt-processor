XSLT-processor TODO
=====

* Rethink match algorithm, as described in https://github.com/DesignLiquido/xslt-processor/pull/62#issuecomment-1636684453;
* XSLT validation, besides the version number;
* XSL:number
* `attribute-set`, `decimal-format`, etc. (check `src/xslt.ts`)
* `/html/body//ul/li|html/body//ol/li` has `/html/body//ul/li` evaluated by this XPath implementation as "absolute", and `/html/body//ol/li` as "relative". Both should be evaluated as "absolute".

Help is much appreciated. It seems to currently work for most of our purposes, but fixes and additions are always welcome!
