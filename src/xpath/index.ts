// Copyright 2023-2024 Design Liquido
// XPath implementation exports

// Main XPath class (legacy implementation with full XSLT function support)
export { XPath } from './xpath-legacy-impl';

// Value types
export { NodeValue, StringValue, NumberValue, BooleanValue, NodeSetValue } from './values';

// Expression context
export { ExprContext } from './expr-context';

// Match resolver for XSLT pattern matching
export { MatchResolver } from './match-resolver';

// Simple selector for basic use cases
export { XPathSelector } from './selector';

// Export new XPath implementation components for advanced use
export { XPathLexer } from './lib/src/lexer';
export { XPathParser } from './lib/src/parser';
export { createContext, XPathContext, XPathResult } from './lib/src/context';
export { XPathNode } from './lib/src/node';

// Node tests
export * from './node-tests';

// Expressions (legacy, for backward compatibility)
export * from './expressions';
