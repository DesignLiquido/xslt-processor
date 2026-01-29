import { XNode } from "../../dom/xnode";
import { ComponentType, ComponentVisibility } from "./types";

/**
 * A component within a package (template, function, variable, etc.).
 */
export interface PackageComponentInterface {
    /** Component type */
    type: ComponentType;
    
    /** Component name (for functions, variables, attribute-sets) */
    name?: string;
    
    /** Match pattern (for templates) */
    match?: string;
    
    /** Mode (for templates) */
    mode?: string | null;
    
    /** Visibility level */
    visibility: ComponentVisibility;
    
    /** Whether this component can be overridden */
    overridable: boolean;
    
    /** The actual XNode representing this component */
    node: XNode;
    
    /** Priority (for templates) */
    priority?: number;
}
