import { XNode } from "../../dom/xnode";
import { PackageComponentInterface } from "./package-component-interface";
import { UsedPackageInterface } from "./used-package-interface";

/**
 * Represents an XSLT 3.0 package.
 */
export interface XsltPackageInterface {
    /** Package name (from name attribute) */
    name: string;
    
    /** Package version (from package-version attribute) */
    version?: string;
    
    /** Root node of the package */
    root: XNode;
    
    /** Components defined in this package */
    components: Map<string, PackageComponentInterface>;
    
    /** Packages used by this package */
    usedPackages: Map<string, UsedPackageInterface>;
    
    /** Whether this is the top-level package */
    isTopLevel: boolean;
}
