import { XNode } from "../../dom/xnode";
import { PackageComponentInterface } from "./package-component-interface";
import { UsedPackageInterface } from "./used-package-interface";
import { ModeProperties } from "./types";

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
    
    /** Component overrides (key -> overriding component) */
    overrides: Map<string, PackageComponentInterface>;
    
    /** Declared modes in this package (name -> mode properties) */
    modes?: Map<string, ModeProperties>;
    
    /** Whether modes are declared (vs implicit) */
    declaredModes?: 'yes' | 'no';
    
    /** How to handle type annotations on input documents */
    inputTypeAnnotations?: 'preserve' | 'strip' | 'unspecified';
}
