/**
 * XSLT 3.0 Package System
 * 
 * Implements package management for XSLT 3.0 including:
 * - Package definition (xsl:package)
 * - Component visibility (xsl:expose, xsl:accept)
 * - Package usage (xsl:use-package)
 * - Component overrides
 * 
 * Reference: XSLT 3.0 Specification Section 3 (Packages)
 */

import { XNode } from '../dom';

/**
 * Visibility level for package components.
 */
export type ComponentVisibility = 'public' | 'private' | 'final' | 'abstract';

/**
 * Types of components that can be exposed or used from packages.
 */
export type ComponentType = 'template' | 'function' | 'variable' | 'attribute-set' | 'mode';

/**
 * A component within a package (template, function, variable, etc.).
 */
export interface PackageComponent {
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

/**
 * Represents an XSLT 3.0 package.
 */
export interface XsltPackage {
    /** Package name (from name attribute) */
    name: string;
    
    /** Package version (from package-version attribute) */
    version?: string;
    
    /** Root node of the package */
    root: XNode;
    
    /** Components defined in this package */
    components: Map<string, PackageComponent>;
    
    /** Packages used by this package */
    usedPackages: Map<string, UsedPackage>;
    
    /** Whether this is the top-level package */
    isTopLevel: boolean;
}

/**
 * Information about a package being used via xsl:use-package.
 */
export interface UsedPackage {
    /** The package being used */
    package: XsltPackage;
    
    /** Components accepted (overridden) from this package */
    acceptedComponents: Map<string, PackageComponent>;
}

/**
 * Package registry for managing loaded packages.
 */
export class PackageRegistry {
    private packages: Map<string, XsltPackage> = new Map();
    
    /**
     * Register a package in the registry.
     */
    register(pkg: XsltPackage): void {
        const key = this.makePackageKey(pkg.name, pkg.version);
        this.packages.set(key, pkg);
    }
    
    /**
     * Retrieve a package from the registry.
     */
    get(name: string, version?: string): XsltPackage | undefined {
        const key = this.makePackageKey(name, version);
        return this.packages.get(key);
    }
    
    /**
     * Check if a package exists in the registry.
     */
    has(name: string, version?: string): boolean {
        const key = this.makePackageKey(name, version);
        return this.packages.has(key);
    }
    
    /**
     * Create a unique key for a package based on name and version.
     */
    private makePackageKey(name: string, version?: string): string {
        return version ? `${name}@${version}` : name;
    }
    
    /**
     * Clear all registered packages.
     */
    clear(): void {
        this.packages.clear();
    }
}

/**
 * Create a component key for looking up components in the registry.
 */
export function makeComponentKey(component: PackageComponent): string {
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
export function isComponentVisible(component: PackageComponent, fromPackage: boolean): boolean {
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
export function canOverrideComponent(component: PackageComponent): boolean {
    // Final components cannot be overridden
    if (component.visibility === 'final') {
        return false;
    }
    
    // Otherwise check the overridable flag
    return component.overridable;
}
