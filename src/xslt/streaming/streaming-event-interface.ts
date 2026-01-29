import { StreamingEventType } from "./types";

/**
 * A single streaming event from a document.
 * Represents one piece of information as the document is streamed.
 */
export interface StreamingEventInterface {
    /** Type of event */
    type: StreamingEventType;
    
    /** Local name of element/attribute (for element/attribute events) */
    name?: string;
    
    /** Namespace URI (for element/attribute events) */
    namespaceUri?: string;
    
    /** Content (for text/comment/PI events) */
    content?: string;
    
    /** Attributes on the current element (for start-element events) */
    attributes?: Map<string, string>;
    
    /** Whether this is a self-closing element */
    selfClosing?: boolean;
    
    /** Depth in document tree */
    depth: number;
}