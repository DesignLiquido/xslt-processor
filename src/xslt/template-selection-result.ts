import { XNode } from "../dom/xnode";
import { TemplatePriority } from "./template-priority";

/**
 * Result of selecting the best matching template.
 */
export interface TemplateSelectionResult {
    /** The selected template, or null if no templates match */
    selectedTemplate: XNode | null;
    /** Whether there was a conflict (multiple templates with same priority) */
    hasConflict: boolean;
    /** Templates that tied for highest priority (for conflict reporting) */
    conflictingTemplates: TemplatePriority[];
}
