import { StreamingEventInterface } from "./streaming-event-interface";
import { StreamingParserInterface } from "./streaming-parser-interface";
import { XmlParser, XNode } from "../../dom";
import {
    DOM_ATTRIBUTE_NODE,
    DOM_CDATA_SECTION_NODE,
    DOM_COMMENT_NODE,
    DOM_DOCUMENT_NODE,
    DOM_ELEMENT_NODE,
    DOM_PROCESSING_INSTRUCTION_NODE,
    DOM_TEXT_NODE
} from "../../constants";

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
        const parser = new XmlParser();
        const document = parser.xmlParse(source);

        // Emit document start event
        await handler({
            type: 'document-start',
            depth: 0
        });

        // Emit document content events
        for (const child of document.childNodes) {
            await this.emitNode(child, handler, 0);
        }

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

    private async emitNode(node: XNode, handler: (event: StreamingEventInterface) => Promise<void>, depth: number): Promise<void> {
        switch (node.nodeType) {
            case DOM_DOCUMENT_NODE: {
                for (const child of node.childNodes) {
                    await this.emitNode(child, handler, depth);
                }
                return;
            }
            case DOM_ELEMENT_NODE: {
                const attributeNodes = node.childNodes.filter(n => n.nodeType === DOM_ATTRIBUTE_NODE);
                const attributes = attributeNodes.length > 0 ? new Map<string, string>() : undefined;

                if (attributes) {
                    for (const attribute of attributeNodes) {
                        attributes.set(attribute.nodeName, `${attribute.nodeValue ?? ''}`);
                        await handler({
                            type: 'attribute',
                            name: attribute.nodeName,
                            namespaceUri: attribute.namespaceUri || undefined,
                            content: `${attribute.nodeValue ?? ''}`,
                            depth: depth + 1
                        });
                    }
                }

                const nonAttributeChildren = node.childNodes.filter(n => n.nodeType !== DOM_ATTRIBUTE_NODE);
                await handler({
                    type: 'start-element',
                    name: node.nodeName,
                    namespaceUri: node.namespaceUri || undefined,
                    attributes,
                    selfClosing: nonAttributeChildren.length === 0,
                    depth: depth + 1
                });

                for (const child of nonAttributeChildren) {
                    await this.emitNode(child, handler, depth + 1);
                }

                await handler({
                    type: 'end-element',
                    name: node.nodeName,
                    namespaceUri: node.namespaceUri || undefined,
                    depth: depth + 1
                });
                return;
            }
            case DOM_TEXT_NODE:
            case DOM_CDATA_SECTION_NODE: {
                const text = `${node.nodeValue ?? ''}`;
                if (text.length > 0) {
                    await handler({
                        type: 'text',
                        content: text,
                        depth: depth + 1
                    });
                }
                return;
            }
            case DOM_COMMENT_NODE: {
                await handler({
                    type: 'comment',
                    content: `${node.nodeValue ?? ''}`,
                    depth: depth + 1
                });
                return;
            }
            case DOM_PROCESSING_INSTRUCTION_NODE: {
                await handler({
                    type: 'processing-instruction',
                    name: node.nodeName,
                    content: `${node.nodeValue ?? ''}`,
                    depth: depth + 1
                });
                return;
            }
            default:
                return;
        }
    }
}
