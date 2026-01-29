import { PackageComponentInterface } from "./package-component-interface";
import { XsltPackageInterface } from "./xslt-package-interface";

/**
 * Information about a package being used via xsl:use-package.
 */
export interface UsedPackageInterface {
    /** The package being used */
    package: XsltPackageInterface;
    
    /** Components accepted (overridden) from this package */
    acceptedComponents: Map<string, PackageComponentInterface>;
}
