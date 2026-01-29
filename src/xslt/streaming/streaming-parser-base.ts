import { StreamingEventInterface } from "./streaming-event-interface";
import { StreamingParserInterface } from "./streaming-parser-interface";

/**
 * Base implementation of streaming parser.
 * This version works with existing DOM-based documents and emits events.
 */
export class StreamingParserBase implements StreamingParserInterface {
    /**
     * Convert a DOM document to streaming events.
     * This is a fallback for when a true streaming parser isn't available.
     */
    async parse(source: string, handler: (event: StreamingEventInterface) => Promise<void>): Promise<void> {
        // Emit document start event
        await handler({
            type: 'document-start',
            depth: 0
        });
        
        // Note: Full implementation would parse the source and emit individual events
        // For now, this is a placeholder that subclasses would implement
        
        // Emit document end event
        await handler({
            type: 'document-end',
            depth: 0
        });
    }
    
    /**
     * Check if document can be streamed.
     */
    async canStream(source: string): Promise<boolean> {
        // Streaming is possible for any well-formed XML
        // More sophisticated checks could validate structure
        return true;
    }
}
