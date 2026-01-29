import { PackageComponentInterface } from "./package-component-interface";

/**
 * Create a component key for looking up components in the registry.
 */
export function makeComponentKey(component: PackageComponentInterface): string {
    switch (component.type) {
        case 'function':
        case 'variable':
        case 'attribute-set':
            return `${component.type}:${component.name || ''}`;
        case 'template':
            if (component.name) {
                return `template:name:${component.name}`;
            } else if (component.match) {
                const mode = component.mode || '#default';
                return `template:match:${mode}:${component.match}`;
            }
            return 'template:unknown';
        case 'mode':
            return `mode:${component.name || '#default'}`;
        default:
            return `unknown:${component.type}`;
    }
}

/**
 * Check if a component is visible (accessible) based on visibility rules.
 */
export function isComponentVisible(component: PackageComponentInterface, fromPackage: boolean): boolean {
    // Private components are only visible within the same package
    if (component.visibility === 'private') {
        return fromPackage;
    }
    
    // Public, final, and abstract components are visible from other packages
    return true;
}

/**
 * Check if a component can be overridden.
 */
export function canOverrideComponent(component: PackageComponentInterface): boolean {
    // Final components cannot be overridden
    if (component.visibility === 'final') {
        return false;
    }
    
    // Otherwise check the overridable flag
    return component.overridable;
}
