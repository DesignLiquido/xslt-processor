// Copyright 2023-2026 Design Liquido
// XPath implementation exports

// Main XPath class
export { XPath, Expression, LocationExpr, UnionExpr } from './xpath';

// Value types
export { NodeValue, StringValue, NumberValue, BooleanValue, NodeSetValue } from './values';

// Expression context
export { ExprContext } from './expr-context';

// Match resolver for XSLT pattern matching
export { MatchResolver } from './match-resolver';

// Simple selector for basic use cases
export { XPathSelector } from './selector';

// New implementation components
export { XPathLexer } from './lib/src/lexer';
export { XPathParser } from './lib/src/parser';
export { createContext, XPathContext, XPathResult } from './lib/src/context';
export { XPathNode } from './lib/src/node';

// Node tests
export * from './node-tests';

// Axis constants
export { xPathAxis } from './tokens';
