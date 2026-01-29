import { StreamablePath } from "./streamable-path-interface";

/**
 * Utilities for validating and working with streamable patterns.
 */
export class StreamablePatternValidator {
    /**
     * Validate that a pattern is streamable.
     * Streamable patterns have restrictions:
     * - No backward axes
     * - No ancestor selection
     * - Limited predicate support
     */
    static validatePattern(pattern: string): { isStreamable: boolean; issues: string[] } {
        const issues: string[] = [];
        
        // Check for backward axes
        if (pattern.includes('ancestor::') || pattern.includes('ancestor-or-self::')) {
            issues.push('Ancestor axes are not permitted in streamable patterns');
        }
        
        // Check for parent axis
        if (pattern.includes('parent::')) {
            issues.push('Parent axis is not permitted in streamable patterns');
        }
        
        // Check for preceding axes
        if (pattern.includes('preceding::') || pattern.includes('preceding-sibling::')) {
            issues.push('Preceding axes are not permitted in streamable patterns');
        }
        
        // Check for complex predicates
        // (This is simplified - full implementation would parse predicate structure)
        const predicateMatches = pattern.match(/\[.*\]/g);
        if (predicateMatches) {
            for (const predicate of predicateMatches) {
                if (predicate.includes('[') && predicate.includes(']')) {
                    // Nested predicates not allowed
                    if (predicate.includes('[[')) {
                        issues.push('Nested predicates are not permitted in streamable patterns');
                    }
                }
            }
        }
        
        return {
            isStreamable: issues.length === 0,
            issues
        };
    }
    
    /**
     * Convert a pattern to streamable form if possible.
     */
    static toStreamablePath(pattern: string): StreamablePath | null {
        // Extract path from pattern
        const parts = pattern.split('/').filter(p => p.length > 0);
        
        if (parts.length === 0) {
            return null;
        }
        
        return {
            path: parts.map(p => p.split('[')[0]), // Remove predicates for now
            fromRoot: pattern.startsWith('/'),
            hasPredicates: pattern.includes('['),
            hasForwardAxis: pattern.includes('::'),
            isDeterministic: true // Simplified check
        };
    }
}