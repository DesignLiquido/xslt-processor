import { StreamingEventInterface } from "./streaming-event-interface";

/**
 * Abstract interface for a streaming XML parser.
 * Implementations can use various strategies (SAX, StAX, etc.)
 */
export interface StreamingParserInterface {
    /**
     * Parse a document and emit events.
     * @param source Document source (file path, URI, or string)
     * @param handler Function to call for each event
     */
    parse(source: string, handler: (event: StreamingEventInterface) => Promise<void>): Promise<void>;
    
    /**
     * Check if a document can be parsed in streaming mode.
     * @param source Document source
     * @returns true if document can be streamed
     */
    canStream(source: string): Promise<boolean>;
}
