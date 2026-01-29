import { DOM_DOCUMENT_NODE } from '../constants';
import { BooleanValue } from './values/boolean-value';
import { NodeSetValue } from './values/node-set-value';
import { NumberValue } from './values/number-value';
import { StringValue } from './values/string-value';
import { MapValue } from './values/map-value';
import { ArrayValue } from './values/array-value';
import { FunctionValue } from './values/function-value';
import { TOK_NUMBER } from './tokens';
import { XNode } from '../dom';
import { XsltDecimalFormatSettings } from '../xslt/xslt-decimal-format-settings';
import { NodeValue } from './values';

/**
 * XPath expression evaluation context. An XPath context consists of a
 * DOM node, a list of DOM nodes that contains this node, a number
 * that represents the position of the single node in the list, and a
 * current set of variable bindings. (See XPath spec.)
 *
 *   setVariable(name, expr) -- binds given XPath expression to the
 *   name.
 *
 *   getVariable(name) -- what the name says.
 *
 *   setNode(position) -- sets the context to the node at the given
 *   position. Needed to implement scoping rules for variables in
 *   XPath. (A variable is visible to all subsequent siblings, not
 *   only to its children.)
 *
 *   set/isCaseInsensitive -- specifies whether node name tests should
 *   be case sensitive.  If you're executing xpaths against a regular
 *   HTML DOM, you probably don't want case-sensitivity, because
 *   browsers tend to disagree about whether elements & attributes
 *   should be upper/lower case.  If you're running xpaths in an
 *   XSLT instance, you probably DO want case sensitivity, as per the
 *   XSL spec.
 *
 *   set/isReturnOnFirstMatch -- whether XPath evaluation should quit as soon
 *   as a result is found. This is an optimization that might make sense if you
 *   only care about the first result.
 *
 *   set/isIgnoreNonElementNodesForNTA -- whether to ignore non-element nodes
 *   when evaluating the "node()" any node test. While technically this is
 *   contrary to the XPath spec, practically it can enhance performance
 *   significantly, and makes sense if you a) use "node()" when you mean "*",
 *   and b) use "//" when you mean "/descendant::* /".
 */
export class ExprContext {
    position: number;
    nodeList: XNode[];
    xsltVersion: '1.0' | '2.0' | '3.0';

    variables: { [name: string]: NodeValue };
    keys: { [name: string]: { [key: string]: NodeValue } };
    knownNamespaces: { [alias: string]: string };

    /**
     * Custom system properties for system-property() function.
     * Overrides the default properties (xsl:version, xsl:vendor, xsl:vendor-url).
     */
    systemProperties?: { [name: string]: string };

    /**
     * Document loader function for the document() function.
     * Takes a URI and returns an XNode document, or null if loading fails.
     */
    documentLoader?: (uri: string) => XNode | null;

    /**
     * Unparsed entity URIs for the unparsed-entity-uri() function.
     * Maps entity names to their URIs (from DTD declarations).
     */
    unparsedEntities?: { [name: string]: string };

    caseInsensitive: any;
    ignoreAttributesWithoutValue: any;
    returnOnFirstMatch: any;
    ignoreNonElementNodesForNTA: any;

    parent: ExprContext;
    root: XNode;
    decimalFormatSettings: XsltDecimalFormatSettings;

    inApplyTemplates: boolean;
    baseTemplateMatched: boolean;

    /**
     * Regex groups from xsl:analyze-string for regex-group() function.
     * Index 0 is the full match, 1+ are captured groups.
     */
    regexGroups?: string[];

    /**
     * Current group from xsl:for-each-group for current-group() function.
     * Contains the nodes/items in the current group being processed.
     */
    currentGroup?: XNode[];

    /**
     * Current grouping key from xsl:for-each-group for current-grouping-key() function.
     * Contains the key value of the current group being processed.
     */
    currentGroupingKey?: any;

    /**
     * Constructor -- gets the node, its position, the node set it
     * belongs to, and a parent context as arguments. The parent context
     * is used to implement scoping rules for variables: if a variable
     * is not found in the current context, it is looked for in the
     * parent context, recursively. Except for node, all arguments have
     * default values: default position is 0, default node set is the
     * set that contains only the node, and the default parent is null.
     *
     * Notice that position starts at 0 at the outside interface;
     * inside XPath expressions this shows up as position()=1.
     * @param nodeList TODO
     * @param opt_position TODO
     * @param opt_parent TODO
     * @param opt_caseInsensitive TODO
     * @param opt_ignoreAttributesWithoutValue TODO
     * @param opt_returnOnFirstMatch TODO
     * @param opt_ignoreNonElementNodesForNTA TODO
     */
    constructor(
        nodeList: XNode[],
        xsltVersion: '1.0' | '2.0' | '3.0' = '1.0',
        opt_position?: number,
        opt_decimalFormatSettings?: XsltDecimalFormatSettings,
        opt_variables?: { [name: string]: any },
        opt_knownNamespaces?: { [alias: string]: string },
        opt_parent?: ExprContext,
        opt_caseInsensitive?: any,
        opt_ignoreAttributesWithoutValue?: any,
        opt_returnOnFirstMatch?: any,
        opt_ignoreNonElementNodesForNTA?: any
    ) {
        this.nodeList = nodeList;
        this.xsltVersion = xsltVersion;

        this.position = opt_position || 0;

        this.variables = opt_variables || {};
        this.keys = opt_parent?.keys || {};
        this.knownNamespaces = opt_knownNamespaces || {};

        this.parent = opt_parent || null;
        this.caseInsensitive = opt_caseInsensitive || false;
        this.ignoreAttributesWithoutValue = opt_ignoreAttributesWithoutValue || false;
        this.returnOnFirstMatch = opt_returnOnFirstMatch || false;
        this.ignoreNonElementNodesForNTA = opt_ignoreNonElementNodesForNTA || false;
        this.inApplyTemplates = false;
        this.baseTemplateMatched = false;

        this.decimalFormatSettings = opt_decimalFormatSettings || {
            decimalSeparator: '.',
            groupingSeparator: ',',
            infinity: 'Infinity',
            minusSign: '-',
            naN: 'NaN',
            percent: '%',
            perMille: '‰',
            zeroDigit: '0',
            digit: '#',
            patternSeparator: ';'
        };

        if (opt_parent) {
            this.root = opt_parent.root;
        } else if (this.nodeList[this.position].nodeType == DOM_DOCUMENT_NODE) {
            // NOTE(mesch): DOM Spec stipulates that the ownerDocument of a
            // document is null. Our root, however is the document that we are
            // processing, so the initial context is created from its document
            // node, which case we must handle here explicitly.
            this.root = this.nodeList[this.position];
        } else {
            this.root = this.nodeList[this.position].ownerDocument;
        }
    }

    /**
     * clone() -- creates a new context with the current context as
     * parent. If passed as argument to clone(), the new context has a
     * different node, position, or node set. What is not passed is
     * inherited from the cloned context.
     * @param opt_nodeList TODO
     * @param opt_position TODO
     * @returns TODO
     */
    clone(opt_nodeList?: XNode[], opt_position?: number) {
        return new ExprContext(
            opt_nodeList || this.nodeList,
            this.xsltVersion,
            typeof opt_position !== 'undefined' ? opt_position : this.position,
            this.decimalFormatSettings,
            this.variables,
            this.knownNamespaces,
            this,
            this.caseInsensitive,
            this.ignoreAttributesWithoutValue,
            this.returnOnFirstMatch,
            this.ignoreNonElementNodesForNTA
        );
    }

    setVariable(name?: string, value?: NodeValue | string) {
        if (
            value instanceof StringValue ||
            value instanceof BooleanValue ||
            value instanceof NumberValue ||
            value instanceof NodeSetValue ||
            value instanceof MapValue ||
            value instanceof ArrayValue ||
            value instanceof FunctionValue
        ) {
            this.variables[name] = value;
            return;
        }

        if ('true' === value) {
            this.variables[name] = new BooleanValue(true);
        } else if ('false' === value) {
            this.variables[name] = new BooleanValue(false);
        } else if (TOK_NUMBER.re.test(String(value))) {
            this.variables[name] = new NumberValue(value);
        } else {
            // DGF What if it's null?
            this.variables[name] = new StringValue(value);
        }
    }

    getVariable(name: string): NodeValue {
        if (typeof this.variables[name] != 'undefined') {
            return this.variables[name];
        }

        if (this.parent) {
            return this.parent.getVariable(name);
        }

        return null;
    }

    /**
     * Gets a regex group from xsl:analyze-string context.
     * Searches up the parent chain for regexGroups.
     * @param index Group index (0 = full match, 1+ = captured groups)
     * @returns The group value or empty string if not found
     */
    getRegexGroup(index: number): string {
        if (this.regexGroups && index >= 0 && index < this.regexGroups.length) {
            return this.regexGroups[index] ?? '';
        }

        if (this.parent) {
            return this.parent.getRegexGroup(index);
        }

        return '';
    }

    setNode(position: number) {
        this.position = position;
    }

    contextSize() {
        return this.nodeList.length;
    }

    isCaseInsensitive() {
        return this.caseInsensitive;
    }

    setCaseInsensitive(caseInsensitive) {
        return (this.caseInsensitive = caseInsensitive);
    }

    isIgnoreAttributesWithoutValue() {
        return this.ignoreAttributesWithoutValue;
    }

    setIgnoreAttributesWithoutValue(ignore) {
        return (this.ignoreAttributesWithoutValue = ignore);
    }

    isReturnOnFirstMatch() {
        return this.returnOnFirstMatch;
    }

    setReturnOnFirstMatch(returnOnFirstMatch) {
        return (this.returnOnFirstMatch = returnOnFirstMatch);
    }

    isIgnoreNonElementNodesForNTA() {
        return this.ignoreNonElementNodesForNTA;
    }

    setIgnoreNonElementNodesForNTA(ignoreNonElementNodesForNTA) {
        return (this.ignoreNonElementNodesForNTA = ignoreNonElementNodesForNTA);
    }
}
