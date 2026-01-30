[**xslt-processor v4.6.1**](../README.md)

***

[xslt-processor](../globals.md) / XmlParser

# Class: XmlParser

Defined in: [dom/xml-parser.ts:31](https://github.com/DesignLiquido/xslt-processor/blob/main/src/dom/xml-parser.ts#L31)

Original author: Steffen Meschkat <mesch@google.com> (the `xmlParse` function,
now `xmlStrictParse`).

An XML parse and a minimal DOM implementation that just supports
the subset of the W3C DOM that is used in the XSLT implementation.

## Constructors

### Constructor

> **new XmlParser**(): `XmlParser`

#### Returns

`XmlParser`

## Properties

### regexEmpty

> **regexEmpty**: `RegExp`

Defined in: [dom/xml-parser.ts:32](https://github.com/DesignLiquido/xslt-processor/blob/main/src/dom/xml-parser.ts#L32)

***

### XML10\_TAGNAME\_REGEXP

> **XML10\_TAGNAME\_REGEXP**: `RegExp`

Defined in: [dom/xml-parser.ts:34](https://github.com/DesignLiquido/xslt-processor/blob/main/src/dom/xml-parser.ts#L34)

***

### XML10\_ATTRIBUTE\_REGEXP

> **XML10\_ATTRIBUTE\_REGEXP**: `RegExp`

Defined in: [dom/xml-parser.ts:35](https://github.com/DesignLiquido/xslt-processor/blob/main/src/dom/xml-parser.ts#L35)

***

### XML11\_TAGNAME\_REGEXP

> **XML11\_TAGNAME\_REGEXP**: `RegExp`

Defined in: [dom/xml-parser.ts:37](https://github.com/DesignLiquido/xslt-processor/blob/main/src/dom/xml-parser.ts#L37)

***

### XML11\_ATTRIBUTE\_REGEXP

> **XML11\_ATTRIBUTE\_REGEXP**: `RegExp`

Defined in: [dom/xml-parser.ts:38](https://github.com/DesignLiquido/xslt-processor/blob/main/src/dom/xml-parser.ts#L38)

***

### lenientHtmlTags

> **lenientHtmlTags**: `string`[]

Defined in: [dom/xml-parser.ts:40](https://github.com/DesignLiquido/xslt-processor/blob/main/src/dom/xml-parser.ts#L40)

## Methods

### xmlParse()

> **xmlParse**(`xmlOrHtml`): `XDocument`

Defined in: [dom/xml-parser.ts:49](https://github.com/DesignLiquido/xslt-processor/blob/main/src/dom/xml-parser.ts#L49)

The entry point for this parser.
It verifies whether the document seems to be HTML.
HTML is a special case if XML and it should be parsed differently.

#### Parameters

##### xmlOrHtml

`string`

The XML or HTML content to be parsed.

#### Returns

`XDocument`

A DOM document.
