import { CopyOperationInterface as CopyOperationInterface } from "./copy-operation-interface";
import { StreamingEventInterface } from "./streaming-event-interface";

/**
 * Copy mechanism for streaming - allows multiple independent processing branches.
 */
export class StreamingCopyManager {
    private copies: Map<string, CopyOperationInterface> = new Map();
    private copyIdCounter: number = 0;
    
    /**
     * Create a new copy operation.
     */
    createCopy(handler: (event: StreamingEventInterface) => Promise<void>): CopyOperationInterface {
        const id = `copy-${++this.copyIdCounter}`;
        const copy: CopyOperationInterface = {
            id,
            handler,
            isActive: true,
            eventQueue: [],
            currentDepth: 0
        };
        
        this.copies.set(id, copy);
        return copy;
    }
    
    /**
     * Distribute an event to all active copies.
     */
    async distributeEvent(event: StreamingEventInterface): Promise<void> {
        for (const copy of Array.from(this.copies.values())) {
            if (copy.isActive) {
                copy.eventQueue.push(event);
                // Could implement batching or async distribution here
            }
        }
    }
    
    /**
     * Close a copy operation.
     */
    closeCopy(copyId: string): void {
        const copy = this.copies.get(copyId);
        if (copy) {
            copy.isActive = false;
        }
    }
    
    /**
     * Get copy by ID.
     */
    getCopy(copyId: string): CopyOperationInterface | undefined {
        return this.copies.get(copyId);
    }
    
    /**
     * Clear all copies.
     */
    clear(): void {
        this.copies.clear();
        this.copyIdCounter = 0;
    }
}
