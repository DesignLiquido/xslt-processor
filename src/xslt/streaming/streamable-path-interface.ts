/**
 * Represents a path through a document that can be matched in streaming mode.
 * Streamable patterns have strict restrictions compared to regular patterns.
 */
export interface StreamablePath {
    /** Sequence of local names matching the path */
    path: string[];
    
    /** Whether the path must match from the root */
    fromRoot: boolean;
    
    /** Whether pattern can use predicates (only simple ones allowed) */
    hasPredicates: boolean;
    
    /** Whether pattern can use multiple steps forward */
    hasForwardAxis: boolean;
    
    /** Whether pattern is deterministic (no backtracking needed) */
    isDeterministic: boolean;
}
