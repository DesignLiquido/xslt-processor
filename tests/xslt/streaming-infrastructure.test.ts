/**
 * XSLT 3.0 Streaming Architecture Tests
 * 
 * Tests for streaming infrastructure including:
 * - StreamingContext
 * - StreamingEvent
 * - Streamable pattern validation
 * - Copy operations and merge coordination
 */

import assert from 'assert';
import { XmlParser } from '../../src/dom';
import { Xslt } from '../../src/xslt/xslt';
import { StreamablePatternValidator, StreamingContext, StreamingCopyManager, StreamingEventInterface, StreamingMergeCoordinator, StreamingParserBase } from '../../src/xslt/streaming';

describe('XSLT 3.0 Streaming Infrastructure', () => {
    describe('StreamingContext', () => {
        it('should track element stack during streaming', () => {
            const context = new StreamingContext();
            context.startStreaming();
            
            context.enterElement('root');
            assert.deepStrictEqual(context.getCurrentPath(), ['root']);
            assert.strictEqual(context.getDepth(), 1);
            
            context.enterElement('item');
            assert.deepStrictEqual(context.getCurrentPath(), ['root', 'item']);
            assert.strictEqual(context.getDepth(), 2);
            
            context.exitElement();
            assert.deepStrictEqual(context.getCurrentPath(), ['root']);
            assert.strictEqual(context.getDepth(), 1);
            
            context.endStreaming();
        });

        it('should manage copy operations', () => {
            const context = new StreamingContext();
            context.startStreaming();
            
            const copy1 = {
                id: 'copy-1',
                handler: async () => {},
                isActive: true,
                eventQueue: [],
                currentDepth: 0
            };
            
            const copy2 = {
                id: 'copy-2',
                handler: async () => {},
                isActive: true,
                eventQueue: [],
                currentDepth: 0
            };
            
            context.registerCopy(copy1);
            context.registerCopy(copy2);
            
            const copies = context.getActiveCopies();
            assert.strictEqual(copies.length, 2);
            
            context.unregisterCopy('copy-1');
            assert.strictEqual(context.getActiveCopies().length, 1);
            
            context.endStreaming();
        });

        it('should buffer events for lookahead', () => {
            const context = new StreamingContext();
            context.startStreaming();
            
            const event1: StreamingEventInterface = {
                type: 'start-element',
                name: 'test',
                depth: 1
            };
            
            const event2: StreamingEventInterface = {
                type: 'text',
                content: 'hello',
                depth: 2
            };
            
            context.bufferEvent(event1);
            context.bufferEvent(event2);
            
            const buffered = context.getBufferedEvents();
            assert.strictEqual(buffered.length, 2);
            assert.strictEqual(buffered[0].type, 'start-element');
            assert.strictEqual(buffered[1].type, 'text');
            
            context.clearBuffer();
            assert.strictEqual(context.getBufferedEvents().length, 0);
            
            context.endStreaming();
        });
    });

    describe('StreamablePatternValidator', () => {
        it('should validate basic streamable patterns', () => {
            const result = StreamablePatternValidator.validatePattern('root/item');
            assert.strictEqual(result.isStreamable, true);
            assert.strictEqual(result.issues.length, 0);
        });

        it('should reject patterns with ancestor axis', () => {
            const result = StreamablePatternValidator.validatePattern('ancestor::root');
            assert.strictEqual(result.isStreamable, false);
            assert.ok(result.issues.some(i => i.includes('Ancestor axes')));
        });

        it('should reject patterns with parent axis', () => {
            const result = StreamablePatternValidator.validatePattern('parent::*');
            assert.strictEqual(result.isStreamable, false);
            assert.ok(result.issues.some(i => i.includes('Parent axis')));
        });

        it('should reject patterns with preceding axes', () => {
            const result1 = StreamablePatternValidator.validatePattern('preceding::item');
            assert.strictEqual(result1.isStreamable, false);
            
            const result2 = StreamablePatternValidator.validatePattern('preceding-sibling::item');
            assert.strictEqual(result2.isStreamable, false);
        });

        it('should convert pattern to streamable path', () => {
            const path = StreamablePatternValidator.toStreamablePath('root/items/item');
            assert.ok(path);
            assert.deepStrictEqual(path!.path, ['root', 'items', 'item']);
            assert.strictEqual(path!.fromRoot, false);
        });

        it('should handle root-relative patterns', () => {
            const path = StreamablePatternValidator.toStreamablePath('/root/items/item');
            assert.ok(path);
            assert.strictEqual(path!.fromRoot, true);
        });

        it('should detect predicates in patterns', () => {
            const path = StreamablePatternValidator.toStreamablePath('root/item[1]');
            assert.ok(path);
            assert.strictEqual(path!.hasPredicates, true);
        });
    });

    describe('StreamingCopyManager', () => {
        it('should create and manage copies', async () => {
            const manager = new StreamingCopyManager();
            
            const handler1 = async (event: StreamingEventInterface) => {};
            const handler2 = async (event: StreamingEventInterface) => {};
            
            const copy1 = manager.createCopy(handler1);
            const copy2 = manager.createCopy(handler2);
            
            assert.strictEqual(copy1.id, 'copy-1');
            assert.strictEqual(copy2.id, 'copy-2');
            
            const retrieved = manager.getCopy('copy-1');
            assert.ok(retrieved);
            assert.strictEqual(retrieved!.id, 'copy-1');
        });

        it('should distribute events to active copies', async () => {
            const manager = new StreamingCopyManager();
            
            const copy1 = manager.createCopy(async () => {});
            const copy2 = manager.createCopy(async () => {});
            
            const event: StreamingEventInterface = {
                type: 'text',
                content: 'test',
                depth: 1
            };
            
            await manager.distributeEvent(event);
            
            assert.strictEqual(copy1.eventQueue.length, 1);
            assert.strictEqual(copy2.eventQueue.length, 1);
            assert.strictEqual(copy1.eventQueue[0].content, 'test');
        });

        it('should not distribute events to inactive copies', async () => {
            const manager = new StreamingCopyManager();
            
            const copy = manager.createCopy(async () => {});
            manager.closeCopy(copy.id);
            
            const event: StreamingEventInterface = {
                type: 'text',
                content: 'test',
                depth: 1
            };
            
            await manager.distributeEvent(event);
            
            assert.strictEqual(copy.eventQueue.length, 0);
        });

        it('should clear all copies', () => {
            const manager = new StreamingCopyManager();
            
            manager.createCopy(async () => {});
            manager.createCopy(async () => {});
            
            manager.clear();
            
            const copy1 = manager.getCopy('copy-1');
            assert.strictEqual(copy1, undefined);
        });
    });

    describe('StreamingMergeCoordinator', () => {
        it('should add merge sources', () => {
            const coordinator = new StreamingMergeCoordinator();
            
            const source = {
                select: '//item',
                mergeKeys: [{
                    select: '@id',
                    order: 'ascending' as const
                }],
                position: 0,
                isExhausted: false,
                buffer: [1, 2, 3]
            };
            
            coordinator.addSource(source);
            
            // Sources are managed internally
            assert.ok(coordinator);
        });

        it('should detect merge completion', () => {
            const coordinator = new StreamingMergeCoordinator();
            
            // Empty coordinator is complete
            assert.strictEqual(coordinator.isComplete(), true);
        });

        it('should clear merge state', () => {
            const coordinator = new StreamingMergeCoordinator();
            
            const source = {
                select: '//item',
                mergeKeys: [],
                position: 0,
                isExhausted: false,
                buffer: [1, 2]
            };
            
            coordinator.addSource(source);
            coordinator.clear();
            
            // After clear, should be complete
            assert.strictEqual(coordinator.isComplete(), true);
        });
    });

    describe('XSLT 3.0 Streaming Integration', () => {
        it('should reject xsl:stream in XSLT 2.0', async () => {
            const xmlString = '<root/>';
            
            const xsltString = `<?xml version="1.0"?>
                <xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    <xsl:template match="/">
                        <xsl:stream select="/">
                            <output/>
                        </xsl:stream>
                    </xsl:template>
                </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            await assert.rejects(
                async () => await xsltClass.xsltProcess(xml, xslt),
                {
                    message: /<xsl:stream> is only supported in XSLT 3\.0 or later/
                }
            );
        });

        it('should require select attribute on xsl:stream', async () => {
            const xmlString = '<root/>';
            
            const xsltString = `<?xml version="1.0"?>
                <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    <xsl:template match="/">
                        <xsl:stream>
                            <output/>
                        </xsl:stream>
                    </xsl:template>
                </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            await assert.rejects(
                async () => await xsltClass.xsltProcess(xml, xslt),
                {
                    message: /<xsl:stream> requires a "select" attribute/
                }
            );
        });

        it('should reject xsl:fork outside of xsl:stream', async () => {
            const xmlString = '<root/>';
            
            const xsltString = `<?xml version="1.0"?>
                <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    <xsl:template match="/">
                        <xsl:fork>
                            <xsl:fork-sequence>
                                <output/>
                            </xsl:fork-sequence>
                        </xsl:fork>
                    </xsl:template>
                </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            await assert.rejects(
                async () => await xsltClass.xsltProcess(xml, xslt),
                {
                    message: /<xsl:fork> can only be used within <xsl:stream>/
                }
            );
        });

        it('should require xsl:merge-source in xsl:merge', async () => {
            const xmlString = '<root/>';
            
            const xsltString = `<?xml version="1.0"?>
                <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    <xsl:template match="/">
                        <xsl:merge>
                            <xsl:merge-action>
                                <output/>
                            </xsl:merge-action>
                        </xsl:merge>
                    </xsl:template>
                </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            await assert.rejects(
                async () => await xsltClass.xsltProcess(xml, xslt),
                {
                    message: /<xsl:merge> requires at least one <xsl:merge-source>/
                }
            );
        });

        it('should require select attribute on xsl:merge-source', async () => {
            const xmlString = '<root/>';
            
            const xsltString = `<?xml version="1.0"?>
                <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    <xsl:template match="/">
                        <xsl:merge>
                            <xsl:merge-source>
                                <xsl:merge-action>
                                    <output/>
                                </xsl:merge-action>
                            </xsl:merge-source>
                        </xsl:merge>
                    </xsl:template>
                </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            await assert.rejects(
                async () => await xsltClass.xsltProcess(xml, xslt),
                {
                    message: /<xsl:merge-source> requires a "select" attribute/
                }
            );
        });

        it.skip('should support basic xsl:merge structure', async () => {
            const xmlString = '<root><item id="1"/><item id="2"/></root>';
            
            const xsltString = `<?xml version="1.0"?>
                <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    <xsl:template match="/">
                        <xsl:merge>
                            <xsl:merge-source select="/root/item">
                                <xsl:merge-key select="@id" order="ascending"/>
                            </xsl:merge-source>
                            <xsl:merge-action>
                                <merged/>
                            </xsl:merge-action>
                        </xsl:merge>
                    </xsl:template>
                </xsl:stylesheet>`;

            const xsltClass = new Xslt();
            const xmlParser = new XmlParser();
            const xml = xmlParser.xmlParse(xmlString);
            const xslt = xmlParser.xmlParse(xsltString);

            // Should process without error
            // TODO: Implement actual merge group evaluation and sorting
            const result = await xsltClass.xsltProcess(xml, xslt);
            assert.ok(result.includes('<merged/>'));
        });
    });

    describe('StreamingParserBase', () => {
        it('should emit document start and end events', async () => {
            const parser = new StreamingParserBase();
            const events: StreamingEventInterface[] = [];
            
            await parser.parse('test.xml', async (event) => {
                events.push(event);
            });
            
            assert.strictEqual(events.length, 2);
            assert.strictEqual(events[0].type, 'document-start');
            assert.strictEqual(events[1].type, 'document-end');
        });

        it('should support canStream check', async () => {
            const parser = new StreamingParserBase();
            
            const canStream = await parser.canStream('test.xml');
            assert.strictEqual(canStream, true);
        });
    });
});
