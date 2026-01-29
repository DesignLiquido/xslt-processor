/**
 * Represents a single event in a streaming document.
 * Events are emitted by a streaming parser as it processes the document.
 */
export type StreamingEventType = 
    | 'start-element'      // Opening tag
    | 'end-element'        // Closing tag
    | 'text'               // Text content
    | 'comment'            // XML comment
    | 'processing-instruction' // PI
    | 'attribute'          // Attribute (emitted before start-element)
    | 'namespace'          // Namespace declaration
    | 'document-start'     // Start of document
    | 'document-end';      // End of document
    
/**
 * Modes for streaming processing.
 */
export type StreamingMode = 
    | 'streamed'      // Full streaming mode - no backtracking
    | 'consuming'     // Document consumed during processing
    | 'non-consuming'; // Document still available after processing

