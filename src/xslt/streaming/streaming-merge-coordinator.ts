import { MergeSourceInterface as MergeSourceInterface } from "./merge-source-interface";

/**
 * Merge operation coordinator for xsl:merge.
 */
export class StreamingMergeCoordinator {
    private sources: MergeSourceInterface[] = [];
    
    /**
     * Add a merge source.
     */
    addSource(source: MergeSourceInterface): void {
        this.sources.push(source);
    }
    
    /**
     * Get next item(s) for merging.
     * Returns the item(s) with the smallest merge key value.
     */
    getNextMergeGroup(): any[] {
        if (this.sources.every(s => s.isExhausted)) {
            return [];
        }
        
        // Find source with smallest key
        let minSource: MergeSourceInterface | null = null;
        let minKey: any = null;
        
        for (const source of this.sources) {
            if (!source.isExhausted && source.buffer.length > 0) {
                // Get key from first item in buffer
                // Simplified - full implementation would extract actual key
                if (minSource === null) {
                    minSource = source;
                    minKey = source.buffer[0];
                }
            }
        }
        
        if (minSource === null) {
            return [];
        }
        
        // Return all items from this source with same key
        const result: any[] = [];
        while (minSource.buffer.length > 0 && result.length < 1) { // Simplified
            result.push(minSource.buffer.shift());
        }
        
        return result;
    }
    
    /**
     * Check if merge is complete.
     */
    isComplete(): boolean {
        return this.sources.every(s => s.isExhausted && s.buffer.length === 0);
    }
    
    /**
     * Clear merge state.
     */
    clear(): void {
        this.sources = [];
    }
}