// Copyright 2024 Design Liquido
// XSLT Template Conflict Resolution
// Implements XSLT 3.0 compliant template priority calculation and selection
// See: https://www.w3.org/TR/xslt-30/#conflict

import { XNode } from '../dom';
import { ExprContext, XPath, MatchResolver } from '../xpath';
import { Expression } from '../xpath/expressions/expression';
import { LocationExpr, UnionExpr } from '../xpath/expressions';
import {
    NodeTestAny,
    NodeTestComment,
    NodeTestElementOrAttribute,
    NodeTestName,
    NodeTestNC,
    NodeTestPI,
    NodeTestText
} from '../xpath/node-tests';

/**
 * Represents priority metadata for a single template rule.
 */
export interface TemplatePriority {
    /** The template XNode */
    template: XNode;
    /** Explicit priority from the priority attribute, or null if not specified */
    explicitPriority: number | null;
    /** Calculated default priority based on pattern structure */
    defaultPriority: number;
    /** Effective priority (explicit if set, otherwise default) */
    effectivePriority: number;
    /** Import precedence (higher value = higher precedence) */
    importPrecedence: number;
    /** Document order (0-based index in stylesheet) */
    documentOrder: number;
    /** The match pattern string */
    matchPattern: string;
}

