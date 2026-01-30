/**
 * XSLT 3.0 Streaming Architecture
 * 
 * Implements the foundation for streaming processing - handling large XML documents
 * without loading them entirely into memory.
 * 
 * Core concepts:
 * - Streaming events represent document structure as a stream of events
 * - Streamable patterns match documents in a single pass without backtracking
 * - Copy operations enable multiple independent output branches
 * - The processing model uses state machines for efficient processing
 * 
 * Reference: XSLT 3.0 Specification Section 22 (Streaming)
 */

export * from './copy-operation-interface';
export * from './merge-key-interface';
export * from './merge-source-interface';
export * from './streamable-path-interface';
export * from './streamable-pattern-validator';
export * from './streaming-context';
export * from './streaming-copy-manager';
export * from './streaming-event-interface';
export * from './streaming-merge-coordinator';
export * from './streaming-mode-detector';
export * from './streaming-parser-base';
export * from './streaming-parser-interface';
export * from './streaming-processor';
export * from './types';