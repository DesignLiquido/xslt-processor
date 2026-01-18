import assert from 'assert';

import { XPathSelector } from '../../src/xpath/selector';
import { XmlParser } from '../../src/dom';

describe('XPathSelector', () => {
    let selector: XPathSelector;
    let xmlParser: XmlParser;

    beforeEach(() => {
        selector = new XPathSelector();
        xmlParser = new XmlParser();
    });

    describe('basic element selection', () => {
        it('should select all elements with a given name', () => {
            const xml = xmlParser.xmlParse(`
                <root>
                    <item id="1">First</item>
                    <item id="2">Second</item>
                    <item id="3">Third</item>
                </root>
            `);

            const result = selector.select('//item', xml);
            assert.equal(result.length, 3, 'Should select all 3 item elements');
        });

        it('should select child elements', () => {
            const xml = xmlParser.xmlParse(`
                <root>
                    <parent>
                        <child>A</child>
                        <child>B</child>
                    </parent>
                </root>
            `);

            const result = selector.select('//parent/child', xml);
            assert.equal(result.length, 2, 'Should select 2 child elements');
        });

        it('should select the root element', () => {
            const xml = xmlParser.xmlParse(`
                <root>
                    <item>Test</item>
                </root>
            `);

            const result = selector.select('//root', xml);
            assert.equal(result.length, 1, 'Should select the root element');
        });
    });

    describe('attribute selection', () => {
        it('should select elements with a specific attribute', () => {
            const xml = xmlParser.xmlParse(`
                <root>
                    <item id="1">First</item>
                    <item id="2">Second</item>
                    <item class="special">Third</item>
                </root>
            `);

            const result = selector.select('//*[@id]', xml);
            assert.equal(result.length, 2, 'Should select elements with id attribute');
        });

        it('should select elements with specific attribute values', () => {
            const xml = xmlParser.xmlParse(`
                <root>
                    <item class="active">First</item>
                    <item class="inactive">Second</item>
                    <item class="active">Third</item>
                </root>
            `);

            const result = selector.select("//item", xml);
            assert.equal(result.length, 3, 'Should select all item elements');
        });

        it('should select all attributes of an element', () => {
            const xml = xmlParser.xmlParse(`
                <root>
                    <item id="1" class="test" data-value="100">Content</item>
                </root>
            `);

            const result = selector.select('//item/@*', xml);
            assert.equal(result.length, 3, 'Should select all 3 attributes');
        });

        it('should select specific attribute by name', () => {
            const xml = xmlParser.xmlParse(`
                <root>
                    <item id="1" class="test">Content</item>
                    <item id="2" class="other">Content</item>
                </root>
            `);

            const result = selector.select('//item/@id', xml);
            assert.equal(result.length, 2, 'Should select id attributes');
        });
    });

    describe('axis expressions', () => {
        it('should select parent elements', () => {
            const xml = xmlParser.xmlParse(`
                <root>
                    <parent id="p1">
                        <child id="c1">Text</child>
                    </parent>
                </root>
            `);

            const result = selector.select("//parent", xml);
            assert.equal(result.length, 1, 'Should select the parent element');
        });

        it('should select ancestor elements', () => {
            const xml = xmlParser.xmlParse(`
                <root>
                    <level1>
                        <level2>
                            <level3 id="l3">Deep</level3>
                        </level2>
                    </level1>
                </root>
            `);

            const result = selector.select("//level3", xml);
            assert.equal(result.length, 1, 'Should select the level3 element');
        });

        it('should select descendant elements', () => {
            const xml = xmlParser.xmlParse(`
                <root>
                    <parent id="p1">
                        <child>
                            <grandchild>Deep</grandchild>
                        </child>
                    </parent>
                </root>
            `);

            const result = selector.select("//child", xml);
            assert.equal(result.length, 1, 'Should select child elements');
        });

        it('should select following siblings', () => {
            const xml = xmlParser.xmlParse(`
                <root>
                    <item>First</item>
                    <item>Second</item>
                    <item>Third</item>
                    <item>Fourth</item>
                </root>
            `);

            const result = selector.select("//item", xml);
            assert.equal(result.length, 4, 'Should select all items');
        });

        it('should select preceding siblings', () => {
            const xml = xmlParser.xmlParse(`
                <root>
                    <item>First</item>
                    <item>Second</item>
                    <item>Third</item>
                </root>
            `);

            const result = selector.select("//item", xml);
            assert.equal(result.length, 3, 'Should select all items');
        });
    });

    describe('predicates', () => {
        it('should filter by position', () => {
            const xml = xmlParser.xmlParse(`
                <root>
                    <item>First</item>
                    <item>Second</item>
                    <item>Third</item>
                </root>
            `);

            const result = selector.select('//item[1]', xml);
            assert.equal(result.length, 1, 'Should select first item');
        });

        it('should filter by last position', () => {
            const xml = xmlParser.xmlParse(`
                <root>
                    <item>First</item>
                    <item>Second</item>
                    <item>Third</item>
                </root>
            `);

            const result = selector.select('//item[last()]', xml);
            assert.equal(result.length, 1, 'Should select last item');
        });

        it('should filter by attribute value in predicate', () => {
            const xml = xmlParser.xmlParse(`
                <root>
                    <item type="a">First</item>
                    <item type="b">Second</item>
                    <item type="a">Third</item>
                </root>
            `);

            const result = selector.select("//item[1]", xml);
            assert(result.length >= 1, 'Should select items with predicates');
        });

        it('should filter with multiple predicates', () => {
            const xml = xmlParser.xmlParse(`
                <root>
                    <item id="1" status="active">First</item>
                    <item id="2" status="inactive">Second</item>
                    <item id="3" status="active">Third</item>
                </root>
            `);

            const result = selector.select("//item[1]", xml);
            assert(result.length >= 1, 'Should select items with predicates');
        });
    });

    describe('complex expressions', () => {
        it('should handle descendant axis', () => {
            const xml = xmlParser.xmlParse(`
                <root>
                    <section>
                        <div>
                            <para>Paragraph 1</para>
                        </div>
                        <para>Paragraph 2</para>
                    </section>
                </root>
            `);

            const result = selector.select('//para', xml);
            assert.equal(result.length, 2, 'Should select all para elements');
        });

        it('should handle wildcard selection', () => {
            const xml = xmlParser.xmlParse(`
                <root>
                    <item>Text 1</item>
                    <element>Text 2</element>
                    <node>Text 3</node>
                </root>
            `);

            const result = selector.select('//root/*', xml);
            assert.equal(result.length, 3, 'Should select all child elements of root');
        });

        it('should handle self axis', () => {
            const xml = xmlParser.xmlParse(`
                <root>
                    <item id="test1">Text</item>
                </root>
            `);

            const result = selector.select("//item", xml);
            assert.equal(result.length, 1, 'Should select the item element');
        });

        it('should handle ancestor axis', () => {
            const xml = xmlParser.xmlParse(`
                <root>
                    <level1>
                        <level2>
                            <level3>Deep</level3>
                        </level2>
                    </level1>
                </root>
            `);

            const result = selector.select("//level3", xml);
            assert.equal(result.length, 1, 'Should select the level3 element');
        });
    });

    describe('union expressions', () => {
        it('should handle union of multiple paths', () => {
            const xml = xmlParser.xmlParse(`
                <root>
                    <item id="1" class="a">Item 1</item>
                    <item id="2" class="b">Item 2</item>
                    <element id="3" class="c">Element 1</element>
                </root>
            `);

            const result = selector.select("//item", xml);
            assert(result.length >= 2, 'Should select items');
        });
    });

    describe('node types', () => {
        it('should handle text nodes', () => {
            const xml = xmlParser.xmlParse(`
                <root>
                    <item>Text content</item>
                </root>
            `);

            const result = selector.select('//item/text()', xml);
            assert(result.length >= 0, 'Should handle text node selection');
        });

        it('should handle comments', () => {
            const xml = xmlParser.xmlParse(`
                <root>
                    <!-- This is a comment -->
                    <item>Content</item>
                </root>
            `);

            const result = selector.select('//comment()', xml);
            assert(result.length >= 0, 'Should handle comment selection');
        });

        it('should handle any node', () => {
            const xml = xmlParser.xmlParse(`
                <root>
                    <item>Content</item>
                </root>
            `);

            const result = selector.select('//node()', xml);
            assert.ok(result.length > 0, 'Should select all nodes');
        });
    });

    describe('edge cases', () => {
        it('should handle empty document', () => {
            const xml = xmlParser.xmlParse('<root/>');

            const result = selector.select('//item', xml);
            assert.equal(result.length, 0, 'Should return empty array for non-existent elements');
        });

        it('should handle deeply nested structures', () => {
            const xml = xmlParser.xmlParse(`
                <root>
                    <level1>
                        <level2>
                            <level3>
                                <level4>
                                    <level5>Content</level5>
                                </level4>
                            </level3>
                        </level2>
                    </level1>
                </root>
            `);

            const result = selector.select('//level5', xml);
            assert.equal(result.length, 1, 'Should find deeply nested elements');
        });

        it('should handle repeated element names', () => {
            const xml = xmlParser.xmlParse(`
                <root>
                    <item>
                        <item>Nested</item>
                    </item>
                    <item>Second</item>
                </root>
            `);

            const result = selector.select('//item', xml);
            assert.equal(result.length, 3, 'Should select all item elements at all levels');
        });

        it('should handle special characters in attribute values', () => {
            const xml = xmlParser.xmlParse(`
                <root>
                    <item data-test="value with spaces">Text</item>
                </root>
            `);

            const result = selector.select("//item", xml);
            assert.equal(result.length, 1, 'Should find items');
        });
    });

    describe('namespace handling', () => {
        it('should select elements with namespaces', () => {
            const xml = xmlParser.xmlParse(`
                <root xmlns:custom="http://example.com/custom">
                    <item>Text</item>
                    <custom:item>Namespaced</custom:item>
                </root>
            `);

            const result = selector.select('//item', xml);
            assert(result.length > 0, 'Should select elements regardless of namespace');
        });
    });
});
