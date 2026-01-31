import { XNode } from "../../dom/xnode";
import { TemplatePriorityInterface } from "./template-priority-interface";
import { PackageComponentInterface } from "../package-system/package-component-interface";

/**
 * Result of selecting the best matching template.
 */
export interface TemplateSelectionResultInterface {
    /** The selected template, or null if no templates match */
    selectedTemplate: XNode | null;
    /** Whether there was a conflict (multiple templates with same priority) */
    hasConflict: boolean;
    /** Templates that tied for highest priority (for conflict reporting) */
    conflictingTemplates: TemplatePriorityInterface[];
    /** Original component (for overridden templates, to support xsl:original) */
    originalComponent?: PackageComponentInterface;
}
