import { XsltPackageInterface } from "./xslt-package-interface";

/**
 * Package registry for managing loaded packages.
 */
export class PackageRegistry {
    private packages: Map<string, XsltPackageInterface> = new Map();
    
    /**
     * Register a package in the registry.
     */
    register(pkg: XsltPackageInterface): void {
        const key = this.makePackageKey(pkg.name, pkg.version);
        this.packages.set(key, pkg);
    }
    
    /**
     * Retrieve a package from the registry.
     */
    get(name: string, version?: string): XsltPackageInterface | undefined {
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
