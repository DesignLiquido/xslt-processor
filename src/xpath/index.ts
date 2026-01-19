// Copyright 2023-2024 Design Liquido
// New XPath implementation exports

// Main XPath class and expression types
export { XPath, Expression, LocationExpr, UnionExpr } from './xpath';

// Value types (re-exported from xpath-legacy for backward compatibility)
export { NodeValue, StringValue, NumberValue, BooleanValue, NodeSetValue } from './values';

// Match resolver for XSLT pattern matching
export { MatchResolver } from './match-resolver';

// Simple selector for basic use cases
export { XPathSelector } from './selector';

// Re-export ExprContext from xpath-legacy for backward compatibility
export { ExprContext } from '../xpath-legacy/expr-context';

// Export new XPath implementation components for advanced use
export { XPathLexer } from './lib/src/lexer';
export { XPathParser } from './lib/src/parser';
export { createContext, XPathContext, XPathResult } from './lib/src/context';
export { XPathNode } from './lib/src/node';
