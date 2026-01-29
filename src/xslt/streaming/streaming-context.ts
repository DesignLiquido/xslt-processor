import { CopyOperationInterface } from "./copy-operation-interface";
import { MergeSourceInterface } from "./merge-source-interface";
import { StreamingEventInterface } from "./streaming-event-interface";

/**
 * Streaming context - tracks state during streaming document processing.
 */
export class StreamingContext {
    /** Stack of open elements during streaming */
    private elementStack: string[] = [];
    
    /** Current depth in document */
    private depth: number = 0;
    
    /** Copy operations in progress */
    private activeCopies: Map<string, CopyOperationInterface> = new Map();
    
    /** Merge sources being processed */
    private mergeSources: MergeSourceInterface[] = [];
    
    /** Whether streaming is in progress */
    private isStreaming: boolean = false;
    
    /** Buffer for lookahead when needed */
    private lookaheadBuffer: StreamingEventInterface[] = [];
    
    /**
     * Start streaming processing.
     */
    startStreaming(): void {
        this.elementStack = [];
        this.depth = 0;
        this.activeCopies.clear();
        this.isStreaming = true;
    }
    
    /**
     * End streaming processing.
     */
    endStreaming(): void {
        this.isStreaming = false;
        this.activeCopies.clear();
        this.lookaheadBuffer = [];
    }
    
    /**
     * Register a copy operation.
     */
    registerCopy(copy: CopyOperationInterface): void {
        this.activeCopies.set(copy.id, copy);
    }
    
    /**
     * Unregister a copy operation.
     */
    unregisterCopy(copyId: string): void {
        this.activeCopies.delete(copyId);
    }
    
    /**
     * Get all active copies.
     */
    getActiveCopies(): CopyOperationInterface[] {
        return Array.from(this.activeCopies.values()).filter(c => c.isActive);
    }
    
    /**
     * Push element onto stack when entering.
     */
    enterElement(name: string): void {
        this.elementStack.push(name);
        this.depth++;
    }
    
    /**
     * Pop element from stack when exiting.
     */
    exitElement(): string | undefined {
        this.depth--;
        return this.elementStack.pop();
    }
    
    /**
     * Get current element path.
     */
    getCurrentPath(): string[] {
        return [...this.elementStack];
    }
    
    /**
     * Get current depth.
     */
    getDepth(): number {
        return this.depth;
    }
    
    /**
     * Check if streaming is active.
     */
    isStreamingActive(): boolean {
        return this.isStreaming;
    }
    
    /**
     * Buffer event for lookahead.
     */
    bufferEvent(event: StreamingEventInterface): void {
        this.lookaheadBuffer.push(event);
    }
    
    /**
     * Get buffered events.
     */
    getBufferedEvents(): StreamingEventInterface[] {
        return this.lookaheadBuffer;
    }
    
    /**
     * Clear buffer.
     */
    clearBuffer(): void {
        this.lookaheadBuffer = [];
    }
}
