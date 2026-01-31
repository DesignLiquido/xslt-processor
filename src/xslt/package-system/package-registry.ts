import { XsltPackageInterface } from "./xslt-package-interface";

/**
 * Package registry for managing loaded packages.
 */
export class PackageRegistry {
    private packages: Map<string, XsltPackageInterface> = new Map();
    private loading: Set<string> = new Set();
    
    /**
     * Register a package in the registry.
     */
    register(pkg: XsltPackageInterface): void {
        const key = this.makePackageKey(pkg.name, pkg.version);
        this.packages.set(key, pkg);
    }
    
    /**
     * Retrieve a package from the registry.
     * Supports version constraints: exact, wildcards (1.*), ranges (>=1.0), and combined (>=1.0,<2.0).
     */
    get(name: string, version?: string): XsltPackageInterface | undefined {
        // If no version specified, try to get without version
        if (!version) {
            return this.packages.get(name);
        }

        // Try exact match first
        const exactKey = this.makePackageKey(name, version);
        const exactMatch = this.packages.get(exactKey);
        if (exactMatch) {
            return exactMatch;
        }

        // Check if version contains constraint operators
        const hasConstraint = /[*<>=,]/.test(version);
        if (!hasConstraint) {
            return undefined;
        }

        // Find all packages with matching name and filter by version constraint
        const matchingPackages: XsltPackageInterface[] = [];
        this.packages.forEach((pkg, key) => {
            if (pkg.name === name && pkg.version && this.satisfiesVersion(pkg.version, version)) {
                matchingPackages.push(pkg);
            }
        });

        if (matchingPackages.length === 0) {
            return undefined;
        }

        // Return highest matching version
        matchingPackages.sort((a, b) => this.compareVersions(b.version!, a.version!));
        return matchingPackages[0];
    }

    /**
     * Check if a package version satisfies a version constraint.
     */
    private satisfiesVersion(packageVersion: string, constraint: string): boolean {
        // Handle combined constraints (e.g., ">=1.0.0,<2.0.0")
        if (constraint.includes(',')) {
            const constraints = constraint.split(',').map(c => c.trim());
            return constraints.every(c => this.satisfiesSingleConstraint(packageVersion, c));
        }
        return this.satisfiesSingleConstraint(packageVersion, constraint);
    }

    /**
     * Evaluate a single version constraint.
     */
    private satisfiesSingleConstraint(packageVersion: string, constraint: string): boolean {
        // Handle wildcard (e.g., "1.*", "1.2.*")
        if (constraint.includes('*')) {
            const prefix = constraint.replace(/\*$/, '').replace(/\.$/, '');
            if (!prefix) {
                return true; // "*" matches everything
            }
            // Check if package version starts with the prefix
            const pkgParts = packageVersion.split('.');
            const prefixParts = prefix.split('.');
            for (let i = 0; i < prefixParts.length; i++) {
                if (pkgParts[i] !== prefixParts[i]) {
                    return false;
                }
            }
            return true;
        }

        // Handle comparison operators
        const operatorMatch = constraint.match(/^(>=|<=|>|<|=)?(.+)$/);
        if (!operatorMatch) {
            return false;
        }

        const operator = operatorMatch[1] || '=';
        const targetVersion = operatorMatch[2].trim();
        const comparison = this.compareVersions(packageVersion, targetVersion);

        switch (operator) {
            case '>=':
                return comparison >= 0;
            case '>':
                return comparison > 0;
            case '<=':
                return comparison <= 0;
            case '<':
                return comparison < 0;
            case '=':
            default:
                return comparison === 0;
        }
    }

    /**
     * Compare two semantic versions.
     * @returns -1 if a < b, 0 if a === b, 1 if a > b
     */
    private compareVersions(a: string, b: string): number {
        const aParts = a.split('.').map(p => parseInt(p, 10) || 0);
        const bParts = b.split('.').map(p => parseInt(p, 10) || 0);
        const maxLength = Math.max(aParts.length, bParts.length);

        for (let i = 0; i < maxLength; i++) {
            const aPart = aParts[i] || 0;
            const bPart = bParts[i] || 0;
            if (aPart < bPart) return -1;
            if (aPart > bPart) return 1;
        }
        return 0;
    }
    
    /**
     * Check if a package exists in the registry.
     */
    has(name: string, version?: string): boolean {
        const key = this.makePackageKey(name, version);
        return this.packages.has(key);
    }

    /**
     * Mark a package as currently being loaded.
     * Used to detect circular dependencies.
     * @returns true if the package can be loaded, false if it's already being loaded (circular dependency)
     */
    beginLoading(packageKey: string): boolean {
        if (this.loading.has(packageKey)) {
            return false; // Circular dependency detected
        }
        this.loading.add(packageKey);
        return true;
    }

    /**
     * Mark a package as finished loading.
     */
    endLoading(packageKey: string): void {
        this.loading.delete(packageKey);
    }

    /**
     * Check if a package is currently being loaded.
     * Used to detect circular dependencies when a package tries to use another package that is still loading.
     */
    isLoading(packageKey: string): boolean {
        return this.loading.has(packageKey);
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
        this.loading.clear();
    }
}
