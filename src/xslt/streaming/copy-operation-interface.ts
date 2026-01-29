import { StreamingEventInterface } from "./streaming-event-interface";

/**
 * Represents a copy operation in streaming.
 * Allows multiple independent output branches from a single input stream.
 */
export interface CopyOperationInterface {
    /** Unique identifier for this copy */
    id: string;
    
    /** Template or instruction that will process this copy */
    handler: (event: StreamingEventInterface) => Promise<void>;
    
    /** Whether this copy is currently active */
    isActive: boolean;
    
    /** Events queued for this copy */
    eventQueue: StreamingEventInterface[];
    
    /** Current depth for this copy */
    currentDepth: number;
}
