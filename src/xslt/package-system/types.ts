/**
 * Visibility level for package components.
 */
export type ComponentVisibility = 'public' | 'private' | 'final' | 'abstract';

/**
 * Types of components that can be exposed or used from packages.
 */
export type ComponentType = 'template' | 'function' | 'variable' | 'attribute-set' | 'mode';

/**
 * Properties for a declared mode.
 */
export interface ModeProperties {
    /** Mode name */
    name: string;
    
    /** Visibility of the mode */
    visibility?: ComponentVisibility;
    
    /** Whether the mode is streamable */
    streamable?: boolean;
    
    /** Action to take when no template matches (recover, fail, etc.) */
    onNoMatch?: string;
    
    /** Action to take when multiple templates match (fail, warning, etc.) */
    onMultipleMatch?: string;
}
