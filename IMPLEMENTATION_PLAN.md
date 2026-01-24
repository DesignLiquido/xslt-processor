# XSLT 1.0 Features Implementation Plan

This document outlines detailed implementation plans for 4 critical unimplemented XSLT 1.0 features, based on analysis of the xslt-processor codebase and W3C XSLT 1.0 specification (Section 5.6, 5.7, 7.1.4, 7.3, and 15).

**Table of Contents:**
1. [Feature 1: `<xsl:apply-imports>`](#1-xslapply-imports)
2. [Feature 2: `<xsl:attribute-set>`](#2-xslattribute-set)
3. [Feature 3: `<xsl:fallback>`](#3-xslfallback)
4. [Feature 4: `<xsl:processing-instruction>`](#4-xslprocessing-instruction)

---

## 1. `<xsl:apply-imports>` (Section 5.6)

### Current State
- **Status**: Throws "not implemented" error
- **Location**: `src/xslt/xslt.ts` line 198
- **Error**: `throw new Error('not implemented: apply-imports')`

### Specification Overview (XSLT 1.0, Section 5.6)

`<xsl:apply-imports>` passes control to the template for the current node in the imported stylesheet with the same name and mode. This is critical for template overriding patterns where:
1. A base stylesheet defines a template
2. An importing stylesheet overrides the template with `<xsl:import>`
3. The overriding template calls `<xsl:apply-imports>` to invoke the original template

**Key Requirements:**
- Must respect import precedence: templates in importing stylesheets override imported ones
- When `<xsl:apply-imports>` is called, it must find and execute the template for the current node from the *next lower precedence* stylesheet
- Supports `<xsl:with-param>` for passing parameters to the imported template
- Works with modes (default or explicit)

### Architecture Analysis

**Current Template Selection Flow:**
```typescript
// In xsltApplyTemplates (line ~330)
const expandedTemplates = collectAndExpandTemplates(top, mode, this.xPath);
const selection = selectBestTemplate(
    expandedTemplates,
    context.nodeList[context.position],
    xPath
);
```

**Problem:**
- Current system calls `collectAndExpandTemplates()` which finds ALL templates from stylesheet
- No tracking of which stylesheet each template comes from (import vs. main)
- No precedence stack to know which template to apply next

### Implementation Steps

#### Step 1: Add Stylesheet Provenance Tracking
**File**: `src/xslt/xslt.ts`

Add a new data structure to track stylesheet hierarchy:

```typescript
interface StylesheetMetadata {
    importDepth: number;  // 0 = main, 1 = directly imported, 2 = imported by imported, etc
    href: string;        // Source URI of stylesheet
    order: number;       // Document order for apply-imports lookup
}

interface TemplateWithMetadata {
    template: XNode;
    styleSheet: StylesheetMetadata;
    priority: TemplatePriority;
}

// Add to Xslt class:
private styleSheetStack: StylesheetMetadata[] = [];
private importedStylesheets: Map<string, XNode> = new Map();
private templateSourceMap: Map<XNode, StylesheetMetadata> = new Map();
```

**Modify `xsltImportOrInclude()`** to track import depth:

```typescript
protected async xsltImportOrInclude(..., isImport: boolean) {
    // ... existing fetch logic ...
    
    const currentDepth = this.styleSheetStack.length;
    const metadata: StylesheetMetadata = {
        importDepth: isImport ? currentDepth : -1,  // -1 for include = inline
        href: hrefAttribute.nodeValue,
        order: this.importedStylesheets.size
    };
    
    this.styleSheetStack.push(metadata);
    
    // Process templates and map them to metadata
    for (const template of childNodes) {
        if (this.isXsltElement(template, 'template')) {
            this.templateSourceMap.set(template, metadata);
        }
    }
    
    this.styleSheetStack.pop();
}
```

#### Step 2: Modify Template Selection to Track Precedence
**File**: `src/xslt/functions.ts`

Enhance `collectAndExpandTemplates()` and `selectBestTemplate()` to return precedence information:

```typescript
export interface TemplatePriorityWithMetadata extends TemplatePriority {
    stylesheetDepth: number;
    stylesheetOrder: number;
}

export function collectAndExpandTemplates(
    stylesheetElement: XNode,
    mode: string | null,
    xPath: XPath,
    templateSourceMap?: Map<XNode, StylesheetMetadata>
): TemplatePriorityWithMetadata[] {
    // ... existing logic ...
    
    // When adding template, also include metadata
    templates.push({
        ...templatePriority,
        stylesheetDepth: templateSourceMap?.get(child)?.importDepth ?? 0,
        stylesheetOrder: templateSourceMap?.get(child)?.order ?? 0
    });
}
```

#### Step 3: Implement apply-imports Handler
**File**: `src/xslt/xslt.ts`

Add context tracking for current template being executed:

```typescript
// Add to Xslt class:
private currentTemplateStack: Array<{
    template: XNode;
    stylesheetDepth: number;
    mode: string | null;
}> = [];

// In xsltApplyTemplates():
private async xsltApplyTemplates(context: ExprContext, template: XNode, output?: XNode) {
    // ... existing setup ...
    
    const currentTemplate = domGetAttributeValue(template, 'select-template') || null;
    const currentMode = domGetAttributeValue(template, 'mode') || null;
    const currentDepth = /* extract from current context */;
    
    // Track current template
    this.currentTemplateStack.push({
        template: currentTemplate,
        stylesheetDepth: currentDepth,
        mode: currentMode
    });
    
    // ... existing template application ...
    
    this.currentTemplateStack.pop();
}
```

Add the apply-imports case handler:

```typescript
case 'apply-imports':
    await this.xsltApplyImports(context, template, output);
    break;

protected async xsltApplyImports(context: ExprContext, template: XNode, output?: XNode) {
    // Get current template context
    if (this.currentTemplateStack.length === 0) {
        throw new Error('<xsl:apply-imports> can only be used within a template');
    }
    
    const { 
        stylesheetDepth: currentDepth, 
        mode: currentMode 
    } = this.currentTemplateStack[this.currentTemplateStack.length - 1];
    
    // Collect templates from IMPORTED stylesheets only (higher depth)
    const expandedTemplates = collectAndExpandTemplates(
        template.ownerDocument.documentElement,
        currentMode,
        this.xPath,
        this.templateSourceMap
    ).filter(t => t.stylesheetDepth > currentDepth);
    
    // Select best matching template with same match pattern
    const selection = selectBestTemplate(
        expandedTemplates,
        context.nodeList[context.position],
        this.xPath
    );
    
    if (selection && selection.templates.length > 0) {
        // Handle parameters passed via <xsl:with-param>
        const paramContext = context.clone();
        await this.xsltWithParam(paramContext, template);
        
        // Execute the imported template
        await this.xsltChildNodes(paramContext, selection.templates[0].template, output);
    }
    // If no imported template found, silently ignore (spec allows this)
}
```

#### Step 4: Update xsltApplyTemplates to Track Template Context
**File**: `src/xslt/xslt.ts`

Modify the main template application loop to track which template is executing:

```typescript
private async xsltApplyTemplates(context: ExprContext, template: XNode, output?: XNode) {
    // ... existing setup code ...
    
    for (const node of nodes) {
        const nodeContext = context.clone([node]);
        
        const expandedTemplates = collectAndExpandTemplates(
            top,
            mode,
            this.xPath,
            this.templateSourceMap
        );
        
        const selection = selectBestTemplate(
            expandedTemplates,
            node,
            this.xPath
        );
        
        if (selection && selection.templates.length > 0) {
            const selectedTemplate = selection.templates[0];
            
            // Track which template is being executed for apply-imports
            this.currentTemplateStack.push({
                template: selectedTemplate.template,
                stylesheetDepth: selectedTemplate.stylesheetDepth,
                mode: mode
            });
            
            const templateContext = nodeContext.clone();
            await this.xsltWithParam(templateContext, selectedTemplate.template);
            await this.xsltChildNodes(templateContext, selectedTemplate.template, output);
            
            this.currentTemplateStack.pop();
        }
    }
}
```

### Testing Requirements

**Test File**: `tests/xslt/apply-imports.test.tsx`

```typescript
describe('xsl:apply-imports', () => {
    // Test 1: Basic import override
    it('should call imported template when apply-imports is used', async () => {
        // Base stylesheet defines template for 'item'
        // Importing stylesheet overrides and calls <xsl:apply-imports>
        // Result should include output from both templates
    });
    
    // Test 2: With parameters
    it('should pass parameters through apply-imports', async () => {
        // apply-imports with <xsl:with-param>
        // Verify parameters are received in imported template
    });
    
    // Test 3: Mode handling
    it('should respect mode in apply-imports', async () => {
        // Multiple modes with apply-imports
        // Verify correct mode is selected
    });
    
    // Test 4: Multiple nesting
    it('should handle nested imports with apply-imports', async () => {
        // A imports B, B imports C
        // apply-imports from A should find B's template
        // apply-imports from B should find C's template
    });
});
```

### Complexity & Effort
- **Complexity**: **High**
- **Effort**: 40-60 hours
- **Risk**: **Medium** (affects core template selection logic)
- **Dependencies**: Refactor of import/include handling

---

## 2. `<xsl:attribute-set>` (Section 7.1.4)

### Current State
- **Status**: Throws "not implemented" error
- **Location**: `src/xslt/xslt.ts` line 206
- **Error**: `throw new Error('not implemented: attribute-set')`

### Specification Overview (XSLT 1.0, Section 7.1.4)

`<xsl:attribute-set>` allows definition of named sets of attributes that can be applied to elements via the `use-attribute-sets` attribute on:
- `<xsl:element>` (Section 7.1.3)
- `<xsl:attribute-set>` (recursive)
- Literal result elements

**Usage Example:**
```xml
<!-- Define attribute set -->
<xsl:attribute-set name="class-attrs">
    <xsl:attribute name="class">highlight</xsl:attribute>
    <xsl:attribute name="data-version">1.0</xsl:attribute>
</xsl:attribute-set>

<!-- Use attribute set -->
<xsl:element name="div" use-attribute-sets="class-attrs">
    <xsl:text>Content</xsl:text>
</xsl:element>

<!-- Result: <div class="highlight" data-version="1.0">Content</div> -->
```

**Key Requirements:**
- Attribute sets are stylesheet-level declarations (children of `<xsl:stylesheet>`)
- Can be referenced by name from `use-attribute-sets` attribute
- Multiple attribute sets can be specified: `use-attribute-sets="set1 set2 set3"`
- Attribute sets can reference other attribute sets (recursive)
- Attributes from referenced sets are merged
- Later attributes override earlier ones if names conflict

### Architecture Analysis

**Current Attribute Handling:**
```typescript
// In xsltElement (line ~580)
protected async xsltElement(context: ExprContext, template: XNode, output?: XNode) {
    const name = this.xsltAttributeValue(nameExpr, context);
    const element = domCreateElement(this.outputDocument, name);
    
    // Child nodes (attributes) are processed individually
    await this.xsltChildNodes(context, template, element);
}
```

**Problem:**
- No collection or storage of attribute set definitions
- No support for `use-attribute-sets` attribute parsing
- Attributes are only processed as children of elements

### Implementation Steps

#### Step 1: Add AttributeSet Registry
**File**: `src/xslt/xslt.ts`

```typescript
// Add to Xslt class:
private attributeSets: Map<string, XNode[]> = new Map();

// In constructor or xsltProcess():
private collectAttributeSets(stylesheetElement: XNode) {
    for (const child of stylesheetElement.childNodes) {
        if (
            child.nodeType === DOM_ELEMENT_NODE &&
            this.isXsltElement(child, 'attribute-set')
        ) {
            const name = xmlGetAttribute(child, 'name');
            const attributes = child.childNodes.filter(
                n => n.nodeType === DOM_ELEMENT_NODE && 
                     this.isXsltElement(n, 'attribute')
            );
            
            if (name) {
                this.attributeSets.set(name, attributes);
            }
        }
    }
}
```

Call this during stylesheet initialization:

```typescript
protected async xsltProcessContext(context: ExprContext, template: XNode, output?: XNode) {
    // At the start, collect all attribute sets
    if (template.localName === 'stylesheet' || template.localName === 'transform') {
        this.collectAttributeSets(template);
    }
    
    // ... rest of processing ...
}
```

#### Step 2: Implement Attribute Set Application
**File**: `src/xslt/xslt.ts`

Create helper method to apply attribute sets:

```typescript
private async applyAttributeSets(
    context: ExprContext,
    element: XNode,
    setNames: string
) {
    if (!setNames || !setNames.trim()) {
        return;
    }
    
    // Parse space-separated set names
    const names = setNames.trim().split(/\s+/);
    const processedSets = new Set<string>();
    
    for (const name of names) {
        await this.applyAttributeSet(context, element, name, processedSets);
    }
}

private async applyAttributeSet(
    context: ExprContext,
    element: XNode,
    setName: string,
    processedSets: Set<string>
) {
    // Prevent infinite recursion
    if (processedSets.has(setName)) {
        return;
    }
    processedSets.add(setName);
    
    const attributeNodes = this.attributeSets.get(setName);
    if (!attributeNodes) {
        // Silently ignore missing attribute set (spec allows)
        return;
    }
    
    // Apply attributes from this set
    for (const attrNode of attributeNodes) {
        // Check if this attribute itself references other sets
        const nestedSets = xmlGetAttribute(attrNode, 'use-attribute-sets');
        if (nestedSets) {
            // Recursively apply nested sets first
            await this.applyAttributeSets(context, element, nestedSets);
        }
        
        // Apply the attribute itself
        const nameExpr = xmlGetAttribute(attrNode, 'name');
        const name = this.xsltAttributeValue(nameExpr, context);
        
        const documentFragment = domCreateDocumentFragment(this.outputDocument);
        await this.xsltChildNodes(context, attrNode, documentFragment);
        const value = xmlValueLegacyBehavior(documentFragment);
        
        domSetAttribute(element, name, value);
    }
}
```

#### Step 3: Integrate with xsltElement
**File**: `src/xslt/xslt.ts`

Modify `xsltElement()` to handle `use-attribute-sets`:

```typescript
protected async xsltElement(context: ExprContext, template: XNode, output?: XNode) {
    const name = this.xsltAttributeValue(nameExpr, context);
    const element = domCreateElement(this.outputDocument, name);
    
    // Apply attribute sets first (they can be overridden by child attributes)
    const useAttributeSets = xmlGetAttribute(template, 'use-attribute-sets');
    if (useAttributeSets) {
        await this.applyAttributeSets(context, element, useAttributeSets);
    }
    
    // Then process child nodes (including <xsl:attribute> which override)
    await this.xsltChildNodes(context, template, element);
    
    if (output) {
        domAppendChild(output, element);
    }
}
```

#### Step 4: Support `use-attribute-sets` on Literal Result Elements
**File**: `src/xslt/xslt.ts`

Modify `xsltPassThrough()` to handle literal elements with `use-attribute-sets`:

```typescript
protected async xsltPassThrough(context: ExprContext, template: XNode, output?: XNode) {
    if (template.nodeType === DOM_ELEMENT_NODE) {
        const element = domCreateElement(this.outputDocument, template.nodeName);
        
        // Copy attributes from source element
        for (const attr of template.attributes || []) {
            if (attr.name === 'use-attribute-sets') {
                // Handle attribute sets
                await this.applyAttributeSets(context, element, attr.value);
            } else if (!attr.name.startsWith('xmlns')) {
                // Copy regular attributes
                const value = this.xsltAttributeValue(attr.value, context);
                domSetAttribute(element, attr.name, value);
            }
        }
        
        // Process child nodes
        await this.xsltChildNodes(context, template, element);
        
        if (output) {
            domAppendChild(output, element);
        }
    } else {
        // Handle text/comment nodes
        // ... existing logic ...
    }
}
```

#### Step 5: Handle attribute-set Declaration
**File**: `src/xslt/xslt.ts`

Modify the case handler to skip processing (it's stylesheet metadata):

```typescript
case 'attribute-set':
    // attribute-set declarations are processed during stylesheet load
    // This case should not be reached during transformation
    // (they're top-level, not in templates)
    break;
```

### Testing Requirements

**Test File**: `tests/xslt/attribute-set.test.tsx`

```typescript
describe('xsl:attribute-set', () => {
    // Test 1: Basic attribute set application
    it('should apply attribute set to element', async () => {
        const xslt = `
            <xsl:stylesheet>
                <xsl:attribute-set name="highlight">
                    <xsl:attribute name="class">highlight</xsl:attribute>
                </xsl:attribute-set>
                <xsl:template match="/">
                    <xsl:element name="div" use-attribute-sets="highlight">
                        <xsl:text>Content</xsl:text>
                    </xsl:element>
                </xsl:template>
            </xsl:stylesheet>
        `;
        // Result should have div with class="highlight"
    });
    
    // Test 2: Multiple attribute sets
    it('should apply multiple attribute sets', async () => {
        // use-attribute-sets="set1 set2 set3"
        // All attributes from all sets should be applied
    });
    
    // Test 3: Nested attribute sets
    it('should handle nested attribute sets', async () => {
        // set1 references set2
        // Attributes from set2 should be included in set1
    });
    
    // Test 4: Attribute override
    it('should allow later attributes to override earlier ones', async () => {
        // set1 defines class="old"
        // set2 defines class="new"
        // Result should have class="new"
    });
    
    // Test 5: Literal result elements with attribute sets
    it('should apply attribute sets on literal result elements', async () => {
        // <div use-attribute-sets="highlight">
        // Should have attributes applied
    });
});
```

### Complexity & Effort
- **Complexity**: **Medium**
- **Effort**: 20-30 hours
- **Risk**: **Low** (isolated feature, doesn't affect core logic)
- **Dependencies**: None

---

## 3. `<xsl:fallback>` (Section 15)

### Current State
- **Status**: Throws "not implemented" error
- **Location**: `src/xslt/xslt.ts` line 244
- **Error**: `throw new Error('not implemented: fallback')`

### Specification Overview (XSLT 1.0, Section 15)

`<xsl:fallback>` provides fallback behavior for extension elements (elements in a non-XSLT namespace that the processor doesn't recognize). 

**Usage Example:**
```xml
<ext:custom-element xmlns:ext="http://example.com/ext">
    <xsl:fallback>
        <!-- This is executed if ext:custom-element is not recognized -->
        <xsl:text>Extension not supported, using fallback</xsl:text>
    </xsl:fallback>
</ext:custom-element>
```

**Key Requirements:**
- Only applies to extension elements (non-XSLT namespace)
- If processor doesn't recognize an element, it looks for `<xsl:fallback>` child
- If `<xsl:fallback>` exists, its content is processed instead of the extension element
- If no `<xsl:fallback>`, the processor can either:
  - Skip the unrecognized element
  - Treat it as a literal result element
  - Report an error (depends on processor)

### Architecture Analysis

**Current Extension Element Handling:**
```typescript
// In xsltProcessContext()
if (!this.isXsltElement(template)) {
    await this.xsltPassThrough(context, template, output);
}

// isXsltElement() checks for XSLT namespace
private isXsltElement(node: XNode, localName?: string): boolean {
    return node.namespaceUri === 'http://www.w3.org/1999/XSL/Transform'
        && (!localName || node.localName === localName);
}
```

**Problem:**
- No detection of whether an extension element is actually supported/implemented
- No fallback mechanism for unrecognized elements

### Implementation Steps

#### Step 1: Add Extension Element Registry
**File**: `src/xslt/xslt.ts`

```typescript
// Add to Xslt class:
private supportedExtensions: Set<string> = new Set();

// In constructor:
constructor(...) {
    // ... existing code ...
    
    // Register known extension namespaces/elements
    this.supportedExtensions.add('http://www.w3.org/1999/XSL/Transform');
    // Could be extended to register custom extension handlers
}

/**
 * Check if an element is a supported extension
 */
private isExtensionElementSupported(node: XNode): boolean {
    if (!node.namespaceUri) {
        return true; // Non-namespace elements are supported
    }
    
    // XSLT elements are always "supported"
    if (node.namespaceUri === 'http://www.w3.org/1999/XSL/Transform') {
        return true;
    }
    
    // Check if in registry
    if (this.supportedExtensions.has(node.namespaceUri)) {
        return true;
    }
    
    // Unknown namespace = extension element
    return false;
}
```

#### Step 2: Add Fallback Detection and Execution
**File**: `src/xslt/xslt.ts`

```typescript
/**
 * Get fallback content from an element
 */
private getFallbackElement(node: XNode): XNode | null {
    for (const child of node.childNodes) {
        if (
            child.nodeType === DOM_ELEMENT_NODE &&
            this.isXsltElement(child, 'fallback')
        ) {
            return child;
        }
    }
    return null;
}

/**
 * Process extension element with fallback support
 */
private async xsltExtensionElement(context: ExprContext, element: XNode, output?: XNode) {
    // Check if there's a fallback
    const fallback = this.getFallbackElement(element);
    
    if (fallback) {
        // Execute fallback content
        await this.xsltChildNodes(context, fallback, output);
    } else {
        // No fallback: treat as literal result element
        // (Copy the element and its content to output)
        await this.xsltPassThrough(context, element, output);
    }
}
```

#### Step 3: Integrate Fallback into Main Processing
**File**: `src/xslt/xslt.ts`

Modify `xsltProcessContext()` to check for extension elements:

```typescript
protected async xsltProcessContext(context: ExprContext, template: XNode, output?: XNode) {
    if (!this.isXsltElement(template)) {
        // Check if this is an unsupported extension element
        const isExtensionElement = !this.isExtensionElementSupported(template);
        
        if (isExtensionElement && template.nodeType === DOM_ELEMENT_NODE) {
            // This is an extension element
            await this.xsltExtensionElement(context, template, output);
        } else {
            // Regular literal result element
            await this.xsltPassThrough(context, template, output);
        }
    } else {
        // XSLT element - process normally
        let node: XNode, select: any, value: any, nodes: XNode[];
        switch (template.localName) {
            // ... existing cases ...
            case 'fallback':
                // Fallback can only be child of extension element
                // Processing should have already handled it
                // If we reach here, it's misused
                throw new Error(
                    '<xsl:fallback> must be a direct child of an extension element'
                );
        }
    }
}
```

#### Step 4: Handle Fallback as Instruction
**File**: `src/xslt/xslt.ts`

Also add a case handler for when fallback appears (for error reporting):

```typescript
case 'fallback':
    // xsl:fallback should only appear as child of extension element
    // If we reach here, it's being used incorrectly
    throw new Error(
        '<xsl:fallback> must be a direct child of an extension element'
    );
    break;
```

### Testing Requirements

**Test File**: `tests/xslt/fallback.test.tsx`

```typescript
describe('xsl:fallback', () => {
    // Test 1: Extension element with fallback
    it('should execute fallback for unknown extension element', async () => {
        const xslt = `
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                           xmlns:ext="http://example.com/ext">
                <xsl:template match="/">
                    <ext:unknown-element>
                        <xsl:fallback>
                            <xsl:text>Fallback executed</xsl:text>
                        </xsl:fallback>
                    </ext:unknown-element>
                </xsl:template>
            </xsl:stylesheet>
        `;
        // Result should contain "Fallback executed"
    });
    
    // Test 2: Extension element without fallback
    it('should process extension element as literal when no fallback', async () => {
        // ext:custom with no fallback child
        // Should be copied to output as literal element
    });
    
    // Test 3: Fallback with complex content
    it('should handle fallback with nested XSLT instructions', async () => {
        // <xsl:fallback>
        //   <xsl:if>...</xsl:if>
        //   <xsl:for-each>...</xsl:for-each>
        // </xsl:fallback>
    });
    
    // Test 4: Multiple fallbacks
    it('should only process first fallback child', async () => {
        // Extension element with multiple fallback children
        // Only first should be processed
    });
    
    // Test 5: Nested extension elements with fallback
    it('should handle nested extension elements with fallbacks', async () => {
        // ext1 with fallback containing ext2 with fallback
        // Both fallbacks should work independently
    });
    
    // Test 6: Error on misused fallback
    it('should error when fallback is not child of extension', async () => {
        // <xsl:fallback> as direct child of xsl:template
        // Should throw error
    });
});
```

### Complexity & Effort
- **Complexity**: **Low**
- **Effort**: 15-20 hours
- **Risk**: **Very Low** (isolated feature, doesn't affect core logic)
- **Dependencies**: None

---

## 4. `<xsl:processing-instruction>` (Section 7.3)

### Current State
- **Status**: Throws "not implemented" error
- **Location**: `src/xslt/xslt.ts` line 284
- **Error**: `throw new Error('not implemented: processing-instruction')`

### Specification Overview (XSLT 1.0, Section 7.3)

`<xsl:processing-instruction>` creates a processing instruction node in the result tree. Processing instructions are XML constructs for embedding processor-specific instructions.

**Usage Example:**
```xml
<!-- In XSLT -->
<xsl:processing-instruction name="target">
    <xsl:text>some data</xsl:text>
</xsl:processing-instruction>

<!-- Result: <?target some data?> -->
```

**Key Requirements:**
- `name` attribute specifies the PI target (required)
- `name` can be an attribute value template
- Text content becomes the PI data
- PI target cannot be "xml" (reserved)
- PI target cannot contain spaces or certain characters
- Can include `<xsl:value-of>`, `<xsl:for-each>`, etc. for dynamic content

### Architecture Analysis

**Current DOM Support:**
```typescript
// In dom/index.ts - already have:
domCreateComment()  // Creates comment nodes
// But NO domCreateProcessingInstruction()
```

**Problem:**
1. No DOM function to create processing instructions
2. No handler for `<xsl:processing-instruction>` instruction
3. Processing instructions not tracked in XDocument structure

### Implementation Steps

#### Step 1: Add Processing Instruction Support to DOM
**File**: `src/dom/xdocument.ts` and `src/dom/index.ts`

First, extend XNode to support PI node type:

```typescript
// In constants.ts, add if not present:
export const DOM_PROCESSING_INSTRUCTION_NODE = 7;  // Standard DOM node type

// In xdocument.ts:
interface XProcessingInstructionNode extends XNode {
    target: string;
    data: string;
}

// Add to XDocument's support:
export class XDocument {
    // ... existing properties ...
    
    private processingInstructions: XProcessingInstructionNode[] = [];
    
    createProcessingInstruction(target: string, data: string): XProcessingInstructionNode {
        if (!target) {
            throw new Error('Processing instruction target cannot be empty');
        }
        
        if (target.toLowerCase() === 'xml') {
            throw new Error('Processing instruction target cannot be "xml"');
        }
        
        // Validate target name (no spaces, no colons unless namespaced properly)
        if (!/^[a-zA-Z_:][a-zA-Z0-9_:.-]*$/.test(target)) {
            throw new Error(`Invalid processing instruction target: ${target}`);
        }
        
        const pi: XProcessingInstructionNode = {
            nodeName: target,
            nodeType: DOM_PROCESSING_INSTRUCTION_NODE,
            target: target,
            data: data,
            ownerDocument: this,
            parentNode: null,
            childNodes: [],
            attributes: [],
            siblingPosition: 0,
            namespaceUri: null,
            prefix: null,
            localName: target,
            nodeValue: data,
            
            getAttributeValue(): string | null { return null; },
            clone(): XProcessingInstructionNode { 
                return this.ownerDocument.createProcessingInstruction(
                    this.target, 
                    this.data
                ); 
            }
        };
        
        this.processingInstructions.push(pi);
        return pi;
    }
}
```

Export the helper function:

```typescript
// In dom/index.ts:
export function domCreateProcessingInstruction(
    doc: XDocument,
    target: string,
    data: string
): XNode {
    return doc.createProcessingInstruction(target, data);
}
```

#### Step 2: Add Serialization Support
**File**: `src/dom/xml-output-options.ts`

Ensure processing instructions are serialized:

```typescript
// In xmlTransformedText():
function serializeNode(node: XNode, options: any): string {
    switch (node.nodeType) {
        case DOM_PROCESSING_INSTRUCTION_NODE:
            return `<?${node.nodeName} ${node.nodeValue}?>`;
        // ... other cases ...
    }
}
```

#### Step 3: Implement xsltProcessingInstruction Handler
**File**: `src/xslt/xslt.ts`

```typescript
case 'processing-instruction':
    await this.xsltProcessingInstruction(context, template, output);
    break;

protected async xsltProcessingInstruction(
    context: ExprContext,
    template: XNode,
    output?: XNode
) {
    // Get the target name (required)
    const nameExpr = xmlGetAttribute(template, 'name');
    if (!nameExpr) {
        throw new Error('<xsl:processing-instruction> requires a "name" attribute');
    }
    
    // Evaluate name as attribute value template
    const target = this.xsltAttributeValue(nameExpr, context);
    
    if (!target) {
        throw new Error('<xsl:processing-instruction> target name cannot be empty');
    }
    
    if (target.toLowerCase() === 'xml') {
        throw new Error('Processing instruction target cannot be "xml"');
    }
    
    // Validate target name format
    if (!/^[a-zA-Z_:][a-zA-Z0-9_:.-]*$/.test(target)) {
        throw new Error(`Invalid processing instruction target: "${target}"`);
    }
    
    // Process child nodes to get PI data content
    const documentFragment = domCreateDocumentFragment(this.outputDocument);
    await this.xsltChildNodes(context, template, documentFragment);
    
    // Extract text content from fragment
    const data = xmlValue(documentFragment);
    
    // Create processing instruction node
    const pi = domCreateProcessingInstruction(this.outputDocument, target, data);
    
    // Add to output
    if (output) {
        domAppendChild(output, pi);
    } else {
        domAppendChild(this.outputDocument, pi);
    }
}
```

#### Step 4: Add Child Node Handling
**File**: `src/xslt/xslt.ts`

Ensure processing instructions can be appended to documents/elements:

```typescript
// In domAppendChild() or xsltChildNodes():
// Already should handle PI nodes like comments
// Verify it works:
if (node.nodeType === DOM_PROCESSING_INSTRUCTION_NODE ||
    node.nodeType === DOM_COMMENT_NODE) {
    // These are treated like element nodes for appending
    parent.childNodes.push(node);
    node.parentNode = parent;
}
```

### Testing Requirements

**Test File**: `tests/xslt/processing-instruction.test.tsx`

```typescript
describe('xsl:processing-instruction', () => {
    // Test 1: Basic processing instruction
    it('should create processing instruction in output', async () => {
        const xslt = `
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                <xsl:template match="/">
                    <xsl:processing-instruction name="target">
                        <xsl:text>data content</xsl:text>
                    </xsl:processing-instruction>
                </xsl:template>
            </xsl:stylesheet>
        `;
        // Result should contain: <?target data content?>
    });
    
    // Test 2: Dynamic target name
    it('should support dynamic target via attribute value template', async () => {
        // <xsl:processing-instruction name="{@name}">
        // Should use attribute value as target
    });
    
    // Test 3: Complex data content
    it('should handle complex content with XSLT instructions', async () => {
        // <xsl:processing-instruction name="target">
        //   <xsl:if>...</xsl:if>
        //   <xsl:value-of>...</xsl:value-of>
        // </xsl:processing-instruction>
    });
    
    // Test 4: Empty PI data
    it('should create PI with empty data if content is empty', async () => {
        // <?target ?>
    });
    
    // Test 5: Error on reserved target
    it('should error when target is "xml"', async () => {
        // <xsl:processing-instruction name="xml">
        // Should throw error
    });
    
    // Test 6: Error on empty target
    it('should error when target name is empty', async () => {
        // <xsl:processing-instruction name="">
        // Should throw error
    });
    
    // Test 7: Invalid target characters
    it('should error on invalid target name', async () => {
        // <xsl:processing-instruction name="tar get">  <!-- space not allowed -->
        // Should throw error
    });
    
    // Test 8: Multiple PIs
    it('should create multiple processing instructions', async () => {
        // <xsl:for-each>
        //   <xsl:processing-instruction name="pi">...</xsl:processing-instruction>
        // </xsl:for-each>
    });
});
```

### Complexity & Effort
- **Complexity**: **Low-Medium**
- **Effort**: 20-25 hours
- **Risk**: **Low** (isolated feature, extends DOM support)
- **Dependencies**: DOM extension

---

## Implementation Order & Priority

### Recommended Order (by dependency and risk):

1. **Phase 1 (Low Risk)** - Do these first:
   - **`<xsl:processing-instruction>`** (20-25 hours)
     - Lowest risk, isolated DOM extension
     - No dependencies on other features
   - **`<xsl:fallback>`** (15-20 hours)
     - Very low risk, isolated feature
     - No dependencies

2. **Phase 2 (Medium Risk)** - After Phase 1:
   - **`<xsl:attribute-set>`** (20-30 hours)
     - Medium risk, but localized to element creation
     - Useful feature for real-world XSLT

3. **Phase 3 (High Risk)** - Only after solid Phase 1-2:
   - **`<xsl:apply-imports>`** (40-60 hours)
     - High risk, affects core template selection
     - Requires significant refactoring
     - Major architectural changes needed

### Total Effort Estimate:
- **Phase 1**: ~35-45 hours
- **Phase 2**: ~20-30 hours
- **Phase 3**: ~40-60 hours
- **Total**: ~95-135 hours (~3-4 weeks for one developer)

---

## Cross-Cutting Concerns

### Testing Infrastructure
- All tests should follow existing test patterns in `tests/xslt/`
- Use both positive (should work) and negative (should error) test cases
- Include integration tests with real XSLT documents
- Performance tests for apply-imports (deep nesting)

### Documentation Updates
- Update README.md with newly implemented features
- Add examples in `examples/` directory
- Update interactive tests in `interactive-tests/`
- Update TODO.md status for completed features

### Backwards Compatibility
- Changes should not break existing functionality
- Ensure all existing tests pass
- Feature detection for apply-imports (may require version flag)

### Code Quality
- Follow existing code style and patterns
- Add JSDoc comments for all new public methods
- Ensure TypeScript strict mode compliance
- Keep code modular and testable

---

## Conclusion

These four XSLT 1.0 features span a range of complexity and effort:
- **Processing Instructions** and **Fallback** are good entry points with low risk
- **Attribute Sets** are a useful, medium-complexity feature
- **Apply-Imports** is the most complex and requires careful architectural planning

Implementing these features will bring the xslt-processor from ~72% XSLT 1.0 compliance to ~100%, making it a fully conformant XSLT 1.0 processor.
