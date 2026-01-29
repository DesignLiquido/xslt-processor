import { XNode } from "../../dom/xnode";
import { StreamingMode } from "./types";

/**
 * Streaming mode detector - determines how to process a template.
 */
export class StreamingModeDetector {
    /**
     * Determine streaming mode for a template.
     */
    static detectMode(templateNode: XNode): StreamingMode {
        // Check for streamable attribute
        const streamableAttr = templateNode.getAttributeValue?.('streamable');
        
        if (streamableAttr === 'yes') {
            return 'streamed';
        }
        
        if (streamableAttr === 'no') {
            return 'non-consuming';
        }
        
        // Default for XSLT 3.0
        return 'non-consuming';
    }
    
    /**
     * Check if template body is streamable.
     */
    static isTemplateBodyStreamable(templateNode: XNode): boolean {
        // Check for non-streamable instructions
        const nonStreamableInstructions = [
            'xsl:variable',      // Variables consume input
            'xsl:result-document', // Can't produce multiple documents in streaming
            'xsl:for-each',      // Can't iterate over sequences in streaming
        ];
        
        // Simplified check - full implementation would traverse template
        return true;
    }
}
