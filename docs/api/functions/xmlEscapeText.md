[**xslt-processor v4.6.1**](../README.md)

***

[xslt-processor](../globals.md) / xmlEscapeText

# Function: xmlEscapeText()

> **xmlEscapeText**(`s`): `string`

Defined in: [dom/xml-functions.ts:437](https://github.com/DesignLiquido/xslt-processor/blob/main/src/dom/xml-functions.ts#L437)

Escape XML special markup characters: tag delimiter <, >, and entity
reference start delimiter &. The escaped string can be used in XML
text portions (i.e. between tags).

## Parameters

### s

`string`

The string to be escaped.

## Returns

`string`

The escaped string.
