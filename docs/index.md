# xslt-processor Documentation

Welcome to the xslt-processor documentation. This library provides a complete JavaScript/TypeScript implementation of XSLT with support for versions 1.0, 2.0, and 3.0.

## Quick Start

```typescript
import { Xslt, XmlParser } from 'xslt-processor';

const xslt = new Xslt();
const xmlParser = new XmlParser();

const xmlDoc = xmlParser.xmlParse('<root><item>Hello World</item></root>');
const xslDoc = xmlParser.xmlParse(`
  <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:template match="/">
      <html><body><xsl:value-of select="/root/item"/></body></html>
    </xsl:template>
  </xsl:stylesheet>
`);

const result = await xslt.xsltProcess(xmlDoc, xslDoc);
console.log(result); // <html><body>Hello World</body></html>
```

## Documentation Sections

### Specification Guides

- **[XSLT 1.0 Implementation Guide](./guides/xslt-1.0.md)** - Complete XSLT 1.0 specification coverage
- **[XSLT 2.0 Implementation Guide](./guides/xslt-2.0.md)** - XSLT 2.0 elements and XPath 2.0 functions
- **[XSLT 3.0 Implementation Guide](./guides/xslt-3.0.md)** - Modern XSLT 3.0 features including streaming, packages, and JSON support

### API Reference

The API reference is auto-generated from the TypeScript source code. See the [API documentation](./api/README.md) for detailed information about:

- **Xslt** - Main XSLT processor class
- **XPath** - XPath expression evaluator
- **XmlParser** - XML document parser
- **ExprContext** - XPath expression context

## Feature Highlights

### XSLT 1.0 (100% Complete)
- All 35 XSLT 1.0 elements fully implemented
- Complete XPath 1.0 function library
- Template matching and priority resolution
- Import/include with precedence handling

### XSLT 2.0 (90%+ Complete)
- Grouping with `xsl:for-each-group`
- Regular expressions with `xsl:analyze-string`
- Sequences with `xsl:sequence`
- XPath 2.0 type constructors and functions

### XSLT 3.0 (Core Complete)
- Maps and Arrays from XPath 3.1
- Higher-order functions
- JSON support (`json-to-xml`, `xml-to-json`)
- Dynamic evaluation with `xsl:evaluate`
- Error handling with `xsl:try`/`xsl:catch`
- Iteration with `xsl:iterate`
- Text value templates
- Accumulators
- Package system
- Streaming infrastructure

## Installation

```bash
npm install xslt-processor
# or
yarn add xslt-processor
```

## Browser Usage

For browser environments, use the UMD build:

```html
<script src="xslt-processor.global.js"></script>
<script>
  const { Xslt, XmlParser } = xsltProcessor;
  // ... use the library
</script>
```

## License

LGPL-3.0 - See [LICENSE](../LICENSE) for details.
