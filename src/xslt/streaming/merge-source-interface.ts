import { MergeKeyInterface } from "./merge-key-interface";

/**
 * Merge source configuration for xsl:merge.
 */
export interface MergeSourceInterface {
    /** XPath expression selecting source documents */
    select: string;
    
    /** Keys for merge grouping */
    mergeKeys: MergeKeyInterface[];
    
    /** Current position in source */
    position: number;
    
    /** Whether source is exhausted */
    isExhausted: boolean;
    
    /** Buffered items from this source */
    buffer: any[];
}
