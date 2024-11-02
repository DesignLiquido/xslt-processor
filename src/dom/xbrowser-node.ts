import { XNode } from "./xnode";

/**
 * Special XNode class, that retains properties from browsers like 
 * IE, Opera, Safari, etc.
 */
export class XBrowserNode extends XNode {
    innerText?: string;
    textContent?: string;
}
