import { XNode } from "../dom/xnode";
import { DOM_ELEMENT_NODE } from '../constants';
import { ExprContext, XPath } from "../xpath-legacy";
import { MatchResolver } from "../xpath-legacy/match-resolver";
import { TemplatePriority } from "./template-priority";
import { TemplateSelectionResult } from "./template-selection-result";
import { NodeTestAny, NodeTestComment, NodeTestElementOrAttribute, NodeTestName, NodeTestNC, NodeTestPI, NodeTestText } from "../xpath-legacy/node-tests";
import { LocationExpr, UnionExpr } from "../xpath-legacy/expressions";
import { Expression } from "../xpath-legacy/expressions/expression";

/**
 * Calculate the default priority for a single step pattern.
 *
 * According to XSLT 3.0 spec section 6.4:
 * - Priority -0.5: node tests of form node(), text(), comment(),
 *   processing-instruction(), *, @*, namespace::*
 * - Priority -0.25: namespace wildcards like ns:*, @ns:*
 * - Priority 0: qualified names like foo, @bar, processing-instruction('literal')
 * - Priority 0.5: patterns with multiple steps or predicates
 */
function calculateStepPriority(step: any): number {
    const nodeTest = step.nodeTest;
    const hasPredicates = step.predicate && step.predicate.length > 0;

    // Predicates always result in 0.5
    if (hasPredicates) {
        return 0.5;
    }

    // Determine priority based on node test type
    if (nodeTest instanceof NodeTestAny) {
        // node() - matches any node
        return -0.5;
    }

    if (nodeTest instanceof NodeTestElementOrAttribute) {
        // * or @* - wildcard for elements or attributes
        return -0.5;
    }

    if (nodeTest instanceof NodeTestText) {
        // text()
        return -0.5;
    }

    if (nodeTest instanceof NodeTestComment) {
        // comment()
        return -0.5;
    }

    if (nodeTest instanceof NodeTestPI) {
        // processing-instruction() - with literal = 0, without = -0.5
        return nodeTest.target ? 0 : -0.5;
    }

    if (nodeTest instanceof NodeTestNC) {
        // Namespace wildcard like ns:* - priority -0.25
        return -0.25;
    }

    if (nodeTest instanceof NodeTestName) {
        // Qualified name like foo, ns:foo, @bar
        return 0;
    }

    // Default fallback
    return 0;
}

/**
 * Calculate the default priority for a location path expression.
 */
function calculateLocationPathPriority(expr: LocationExpr): number {
    if (!expr.steps || expr.steps.length === 0) {
        return 0;
    }

    // Multiple steps = priority 0.5
    if (expr.steps.length > 1) {
        return 0.5;
    }

    // Single step - calculate based on the step's node test
    return calculateStepPriority(expr.steps[0]);
}

/**
 * Calculate the default priority for a union expression.
 * For union patterns like "foo | bar", each alternative is treated as a
 * separate rule. When used as a single template, we return the lowest priority
 * among all alternatives (most conservative).
 */
function calculateUnionExprPriority(expr: UnionExpr, xPath: XPath): number {
    const priority1 = calculateDefaultPriorityFromExpression(expr.expr1, xPath);
    const priority2 = calculateDefaultPriorityFromExpression(expr.expr2, xPath);
    // Return the lowest (most conservative) priority for union patterns
    return Math.min(priority1, priority2);
}

/**
 * Calculate the default priority from a parsed expression.
 */
function calculateDefaultPriorityFromExpression(expr: Expression, xPath: XPath): number {
    if (expr instanceof LocationExpr) {
        return calculateLocationPathPriority(expr);
    }

    if (expr instanceof UnionExpr) {
        return calculateUnionExprPriority(expr, xPath);
    }

    // For other expression types (filter, path, function call, etc.),
    // use priority 0.5 as they represent complex patterns
    return 0.5;
}

/**
 * Calculate the default priority for an XSLT pattern string.
 *
 * @param pattern The match pattern string (e.g., "book", "chapter/title", "*")
 * @param xPath The XPath instance for parsing
 * @returns The calculated default priority
 */
export function calculateDefaultPriority(pattern: string, xPath: XPath): number {
    try {
        const expr = xPath.xPathParse(pattern, 'self-and-siblings');
        return calculateDefaultPriorityFromExpression(expr, xPath);
    } catch (e) {
        // If parsing fails, return default priority 0
        console.warn(`Failed to parse pattern "${pattern}" for priority calculation:`, e);
        return 0;
    }
}

/**
 * Check if a template matches the given mode.
 * A template matches if:
 * - mode is null/undefined and template has no mode attribute
 * - mode is '#all' (matches any template)
 * - template mode equals the given mode
 * - template mode is '#all'
 */
function matchesMode(template: XNode, mode: string | null): boolean {
    const templateMode = template.getAttributeValue('mode');

    // If no mode specified in apply-templates, match templates without mode
    if (!mode) {
        return !templateMode || templateMode === '#default';
    }

    // Mode '#all' in apply-templates matches any template
    if (mode === '#all') {
        return true;
    }

    // Template with mode '#all' matches any mode
    if (templateMode === '#all') {
        return true;
    }

    // Direct mode match
    return templateMode === mode;
}

/**
 * Check if a node is an xsl:template element.
 */
function isTemplate(node: XNode): boolean {
    if (node.nodeType !== DOM_ELEMENT_NODE) {
        return false;
    }

    // Check by namespace URI or prefix
    if (node.namespaceUri === 'http://www.w3.org/1999/XSL/Transform') {
        return node.localName === 'template';
    }

    return node.prefix === 'xsl' && node.localName === 'template';
}

/**
 * Collect all templates from the stylesheet with their priority metadata.
 *
 * @param stylesheetElement The root element of the stylesheet (xsl:stylesheet or xsl:transform)
 * @param mode The mode to filter templates by (null for default mode)
 * @param xPath The XPath instance for parsing patterns
 * @returns Array of templates with priority metadata
 */
export function collectAndExpandTemplates(
    stylesheetElement: XNode,
    mode: string | null,
    xPath: XPath
): TemplatePriority[] {
    const templates: TemplatePriority[] = [];
    let docOrder = 0;

    for (const child of stylesheetElement.childNodes) {
        if (!isTemplate(child)) {
            continue;
        }

        if (!matchesMode(child, mode)) {
            continue;
        }

        const match = child.getAttributeValue('match');
        if (!match) {
            // Templates without match attribute are named templates, skip them
            continue;
        }

        const priorityAttr = child.getAttributeValue('priority');
        const explicitPriority = priorityAttr ? parseFloat(priorityAttr) : null;
        const defaultPriority = calculateDefaultPriority(match, xPath);
        const effectivePriority = explicitPriority !== null && !isNaN(explicitPriority)
            ? explicitPriority
            : defaultPriority;

        templates.push({
            template: child,
            explicitPriority: explicitPriority !== null && !isNaN(explicitPriority) ? explicitPriority : null,
            defaultPriority,
            effectivePriority,
            importPrecedence: 0, // TODO: Set properly when xsl:import is fully implemented
            documentOrder: docOrder++,
            matchPattern: match
        });
    }

    return templates;
}

/**
 * Split a pattern string by the union operator '|', respecting brackets and quotes.
 * For example: "@*|node()" -> ["@*", "node()"]
 * But: "item[@id='a|b']" -> ["item[@id='a|b']"] (not split inside quotes)
 *
 * @param pattern The pattern string to split
 * @returns Array of pattern alternatives
 */
function splitUnionPattern(pattern: string): string[] {
    const alternatives: string[] = [];
    let current = '';
    let depth = 0; // Track bracket depth
    let inSingleQuote = false;
    let inDoubleQuote = false;

    for (let i = 0; i < pattern.length; i++) {
        const char = pattern[i];

        if (char === "'" && !inDoubleQuote) {
            inSingleQuote = !inSingleQuote;
            current += char;
        } else if (char === '"' && !inSingleQuote) {
            inDoubleQuote = !inDoubleQuote;
            current += char;
        } else if (!inSingleQuote && !inDoubleQuote) {
            if (char === '[' || char === '(') {
                depth++;
                current += char;
            } else if (char === ']' || char === ')') {
                depth--;
                current += char;
            } else if (char === '|' && depth === 0) {
                // Union operator at top level
                alternatives.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        } else {
            current += char;
        }
    }

    // Don't forget the last alternative
    if (current.trim()) {
        alternatives.push(current.trim());
    }

    return alternatives;
}

/**
 * Check if a node matches a single (non-union) pattern.
 *
 * @param node The node to test
 * @param pattern The match pattern string (should not contain union operator at top level)
 * @param context The original context (for namespace/variable info)
 * @param matchResolver The match resolver
 * @param xPath The XPath instance
 * @returns true if the node matches the pattern
 */
function nodeMatchesSinglePattern(
    node: XNode,
    pattern: string,
    context: ExprContext,
    matchResolver: MatchResolver,
    xPath: XPath
): boolean {
    // Special case for root pattern "/"
    if (pattern === '/') {
        return node.nodeName === '#document';
    }

    // For element patterns, we need to check if the node would be selected by the pattern
    // Create a context with just this node
    const nodeContext = context.clone([node], 0);

    // Try with 'self-and-siblings' axis - this works for patterns that don't start with *
    // because xPathParse will set the axis correctly
    try {
        const expr = xPath.xPathParse(pattern, 'self-and-siblings');
        const nodes = matchResolver.expressionMatch(expr, nodeContext);

        // Check if the current node is in the matched nodes
        if (nodes.some(n => n.id === node.id)) {
            return true;
        }
    } catch (e) {
        // Pattern parsing failed, try alternative approach
    }

    // For patterns starting with '*' (where axis override doesn't work),
    // check if the node passes the pattern test directly
    if (pattern === '*' && node.nodeType === DOM_ELEMENT_NODE) {
        return true;
    }

    // For patterns with predicates like "item[@id='1']" or multi-step patterns,
    // we need to evaluate from document root and check if node is in result
    if (pattern.includes('[') || pattern.includes('/')) {
        try {
            // Evaluate pattern from document root with descendant-or-self axis
            const rootContext = context.clone([context.root], 0);
            const descendantPattern = pattern.startsWith('/') ? pattern : '//' + pattern;
            const expr = xPath.xPathParse(descendantPattern);
            const nodes = matchResolver.expressionMatch(expr, rootContext);

            if (nodes.some(n => n.id === node.id)) {
                return true;
            }
        } catch (e) {
            // Pattern parsing failed
        }
    }

    return false;
}

/**
 * Check if a node matches a given pattern.
 * This handles union patterns by splitting them and testing each alternative.
 *
 * @param node The node to test
 * @param pattern The match pattern string
 * @param context The original context (for namespace/variable info)
 * @param matchResolver The match resolver
 * @param xPath The XPath instance
 * @returns true if the node matches the pattern
 */
function nodeMatchesPattern(
    node: XNode,
    pattern: string,
    context: ExprContext,
    matchResolver: MatchResolver,
    xPath: XPath
): boolean {
    // Handle union patterns by splitting and testing each alternative
    const alternatives = splitUnionPattern(pattern);

    // If there are multiple alternatives, test each one
    // Return true if ANY alternative matches
    for (const alt of alternatives) {
        if (nodeMatchesSinglePattern(node, alt, context, matchResolver, xPath)) {
            return true;
        }
    }

    return false;
}

/**
 * Select the best matching template from a list of templates.
 *
 * Selection rules (XSLT 3.0 spec section 6.4):
 * 1. Import precedence (higher wins)
 * 2. Effective priority (higher wins)
 * 3. Document order (last template wins if all else is equal)
 *
 * @param templates Array of templates with priority metadata
 * @param context The expression context for matching
 * @param matchResolver The match resolver for testing patterns
 * @param xPath The XPath instance for parsing
 * @returns The selection result
 */
export function selectBestTemplate(
    templates: TemplatePriority[],
    context: ExprContext,
    matchResolver: MatchResolver,
    xPath: XPath
): TemplateSelectionResult {
    // 1. Filter to templates that match the current node
    const matching: TemplatePriority[] = [];
    const currentNode = context.nodeList[context.position];

    for (const t of templates) {
        try {
            if (nodeMatchesPattern(currentNode, t.matchPattern, context, matchResolver, xPath)) {
                matching.push(t);
            }
        } catch (e) {
            // If pattern matching fails, skip this template
            console.warn(`Failed to match pattern "${t.matchPattern}":`, e);
        }
    }

    if (matching.length === 0) {
        return {
            selectedTemplate: null,
            hasConflict: false,
            conflictingTemplates: []
        };
    }

    // 2. Sort by: importPrecedence DESC, effectivePriority DESC, documentOrder DESC
    matching.sort((a, b) => {
        // Higher import precedence wins
        if (a.importPrecedence !== b.importPrecedence) {
            return b.importPrecedence - a.importPrecedence;
        }
        // Higher priority wins
        if (a.effectivePriority !== b.effectivePriority) {
            return b.effectivePriority - a.effectivePriority;
        }
        // Later document order wins (last template wins)
        return b.documentOrder - a.documentOrder;
    });

    // 3. Detect conflicts - templates with same import precedence and priority
    const winner = matching[0];
    const conflicts = matching.filter(t =>
        t.importPrecedence === winner.importPrecedence &&
        t.effectivePriority === winner.effectivePriority
    );

    return {
        selectedTemplate: winner.template,
        hasConflict: conflicts.length > 1,
        conflictingTemplates: conflicts.length > 1 ? conflicts : []
    };
}

/**
 * Emit a warning when template conflicts are detected.
 *
 * @param result The template selection result
 * @param node The node being matched
 */
export function emitConflictWarning(result: TemplateSelectionResult, node: XNode): void {
    if (!result.hasConflict || result.conflictingTemplates.length < 2) {
        return;
    }

    const patterns = result.conflictingTemplates
        .map(t => `"${t.matchPattern}" (priority: ${t.effectivePriority})`)
        .join(', ');

    console.warn(
        `XSLT Warning: Ambiguous template match for node <${node.nodeName}>. ` +
        `Multiple templates match with equal priority: ${patterns}. ` +
        `Using the last one in document order.`
    );
}
