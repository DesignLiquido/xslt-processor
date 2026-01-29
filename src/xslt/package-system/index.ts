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

export * from './functions';
export * from './package-component-interface';
export * from './package-registry'
export * from './used-package-interface';
export * from './xslt-package-interface';
export * from './types';
