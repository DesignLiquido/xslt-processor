import { DOM_ATTRIBUTE_NODE, DOM_ELEMENT_NODE } from '../constants';

// operate on native DOM nodes.
/**
 * Our W3C DOM Node implementation. Note we call it XNode because we
 * can't define the identifier Node. We do this mostly for Opera,
 * where we can't reuse the HTML DOM for parsing our own XML, and for
 * Safari, where it is too expensive to have the template processor.
 */
export class XNode {
    id: number;
    childNodes: XNode[];
    nodeType: number;
    nodeName: string;
    nodeValue: any;
    firstChild: XNode;
    lastChild: XNode;
    nextSibling: XNode;
    previousSibling: XNode;
    siblingPosition: number;

    ownerDocument: any;
    namespaceUri: any;
    prefix: string;
    localName: string;

    parentNode: XNode;

    outputNode: XNode;
    transformedChildNodes: XNode[];
    transformedNodeType: any;
    transformedNodeName: string;
    transformedNodeValue: any;
    transformedFirstChild: XNode;
    transformedLastChild: XNode;
    transformedNextSibling: XNode;
    transformedPreviousSibling: XNode;
    transformedPrefix: any;
    transformedLocalName: string;

    transformedParentNode: XNode;

    visited: boolean;
    escape: boolean;

    static _unusedXNodes: any[] = [];

    constructor(type: any, name: string, opt_value: any, opt_owner: any, opt_namespace?: any) {
        this.id = Math.random() * (Number.MAX_SAFE_INTEGER - 1) + 1;
        this.childNodes = [];
        this.transformedChildNodes = [];
        this.visited = false;
        this.escape = true;
        this.siblingPosition = -1;

        this.init(type, name, opt_value, opt_owner, opt_namespace);
    }

    /**
     * Node initialization. Called by the constructor and `recycle` method.
     * @param type The node type.
     * @param name The node name.
     * @param value The node value.
     * @param owner The node owner.
     * @param namespaceUri The node namespace.
     */
    init(type: number, name: string, value: string, owner: any, namespaceUri: any) {
        this.nodeType = type - 0;
        this.nodeName = `${name}`;
        this.nodeValue = `${value}`;
        this.ownerDocument = owner;
        this.namespaceUri = namespaceUri || null;
        [this.prefix, this.localName] = this.qualifiedNameToParts(`${name}`);

        this.firstChild = null;
        this.lastChild = null;
        this.nextSibling = null;
        this.previousSibling = null;
        this.parentNode = null;
    }

    protected qualifiedNameToParts(name: string) {
        if (name.includes(':')) {
            return name.split(':');
        }

        return [null, name];
    }

    // Traverses the element nodes in the DOM section underneath the given
    // node and invokes the given callbacks as methods on every element
    // node encountered. Function opt_pre is invoked before a node's
    // children are traversed; opt_post is invoked after they are
    // traversed. Traversal will not be continued if a callback function
    // returns boolean false. NOTE(mesch): copied from
    // <//google3/maps/webmaps/javascript/dom.js>.
    protected domTraverseElements(node: any, opt_pre: any, opt_post: any) {
        let ret;
        if (opt_pre) {
            ret = opt_pre.call(null, node);
            if (typeof ret == 'boolean' && !ret) {
                return false;
            }
        }

        for (let c = node.firstChild; c; c = c.nextSibling) {
            if (c.nodeType == DOM_ELEMENT_NODE) {
                ret = this.domTraverseElements.call(this, c, opt_pre, opt_post);
                if (typeof ret == 'boolean' && !ret) {
                    return false;
                }
            }
        }

        if (opt_post) {
            ret = opt_post.call(null, node);
            if (typeof ret == 'boolean' && !ret) {
                return false;
            }
        }
    }

    // TODO: Do we still need this?
    static recycle(node: any) {
        if (!node) {
            return;
        }

        if (node.constructor.name === 'XDocument') {
            this.recycle((node as any).documentElement);
            return;
        }

        if (node.constructor != this) {
            return;
        }

        this._unusedXNodes.push(node);
        /* for (let a = 0; a < node.attributes.length; ++a) {
            this.recycle(node.attributes[a]);
        } */

        for (let c = 0; c < node.childNodes.length; ++c) {
            this.recycle(node.childNodes[c]);
        }

        // node.attributes.length = 0;
        node.childNodes.length = 0;
        node.init.call(0, '', '', null);
    }

    static create(type: any, name: string, value: any, owner: any, namespace?: any): XNode {
        if (this._unusedXNodes.length > 0) {
            const node = this._unusedXNodes.pop();
            node.init(type, name, value, owner, namespace);
            return node;
        }

        return new XNode(type, name, value, owner, namespace);
    }

    static clone(node: XNode, newOwner: XNode): XNode {
        const newNode = new XNode(node.nodeType, node.nodeName, node.nodeValue, newOwner, node.namespaceUri);
        newNode.id = node.id;
        for (let child of node.childNodes) {
            newNode.appendChild(XNode.clone(child, newNode));
        }

        /* for (let attribute of node.attributes) {
            newNode.setAttribute(attribute.nodeName, attribute.nodeValue);
        } */

        return newNode;
    }

    appendChild(node: XNode) {
        // firstChild
        if (this.childNodes.length == 0) {
            this.firstChild = node;
        }

        // previousSibling
        node.previousSibling = this.lastChild;

        // nextSibling
        node.nextSibling = null;
        if (this.lastChild) {
            this.lastChild.nextSibling = node;
        }

        // parentNode
        node.parentNode = this;

        // lastChild
        this.lastChild = node;

        // childNodes
        this.childNodes.push(node);
    }

    appendTransformedChild(node: XNode) {
        // firstChild
        if (this.transformedChildNodes.length == 0) {
            this.transformedFirstChild = node;
        }

        // previousSibling
        node.transformedPreviousSibling = this.lastChild;

        // nextSibling
        node.transformedNextSibling = null;
        if (this.transformedLastChild) {
            this.transformedLastChild.transformedNextSibling = node;
        }

        // parentNode
        node.transformedParentNode = this;

        // lastChild
        this.transformedLastChild = node;

        // childNodes
        this.transformedChildNodes.push(node);
    }

    replaceChild(newNode: any, oldNode: any) {
        if (oldNode == newNode) {
            return;
        }

        for (let i = 0; i < this.childNodes.length; ++i) {
            if (this.childNodes[i] == oldNode) {
                this.childNodes[i] = newNode;

                let p = oldNode.parentNode;
                oldNode.parentNode = null;
                newNode.parentNode = p;

                p = oldNode.previousSibling;
                oldNode.previousSibling = null;
                newNode.previousSibling = p;
                if (newNode.previousSibling) {
                    newNode.previousSibling.nextSibling = newNode;
                }

                p = oldNode.nextSibling;
                oldNode.nextSibling = null;
                newNode.nextSibling = p;
                if (newNode.nextSibling) {
                    newNode.nextSibling.previousSibling = newNode;
                }

                if (this.firstChild == oldNode) {
                    this.firstChild = newNode;
                }

                if (this.lastChild == oldNode) {
                    this.lastChild = newNode;
                }

                break;
            }
        }
    }

    insertBefore(newNode: any, oldNode: any) {
        if (oldNode == newNode) {
            return;
        }

        if (oldNode.parentNode != this) {
            return;
        }

        if (newNode.parentNode) {
            newNode.parentNode.removeChild(newNode);
        }

        const newChildren = [];

        for (const c of this.childNodes) {
            if (c == oldNode) {
                newChildren.push(newNode);

                newNode.parentNode = this;

                newNode.previousSibling = oldNode.previousSibling;
                oldNode.previousSibling = newNode;
                if (newNode.previousSibling) {
                    newNode.previousSibling.nextSibling = newNode;
                }

                newNode.nextSibling = oldNode;

                if (this.firstChild == oldNode) {
                    this.firstChild = newNode;
                }
            }
            newChildren.push(c);
        }

        this.childNodes = newChildren;
    }

    removeChild(node: any) {
        const newChildren = [];

        for (const c of this.childNodes) {
            if (c != node) {
                newChildren.push(c);
            } else {
                if (c.previousSibling) {
                    c.previousSibling.nextSibling = c.nextSibling;
                }
                if (c.nextSibling) {
                    c.nextSibling.previousSibling = c.previousSibling;
                }
                if (this.firstChild == c) {
                    this.firstChild = c.nextSibling;
                }
                if (this.lastChild == c) {
                    this.lastChild = c.previousSibling;
                }
            }
        }

        this.childNodes = newChildren;
    }

    hasAttributes() {
        const attributes = this.childNodes.filter(n => n.nodeType === DOM_ATTRIBUTE_NODE);
        return attributes.length > 0;
    }

    setAttribute(name: string, value: any) {
        const attributes = this.childNodes.filter(n => n.nodeType === DOM_ATTRIBUTE_NODE);
        for (let i = 0; i < attributes.length; ++i) {
            if (attributes[i].nodeName == name) {
                attributes[i].nodeValue = `${value}`;
                return;
            }
        }

        const newAttribute = XNode.create(DOM_ATTRIBUTE_NODE, name, value, this);
        newAttribute.parentNode = this;
        this.childNodes.push(newAttribute);
    }

    setTransformedAttribute(name: string, value: any) {
        const transformedAttributes = this.transformedChildNodes.filter(n => n.nodeType === DOM_ATTRIBUTE_NODE);
        for (let i = 0; i < transformedAttributes.length; ++i) {
            const transformedAttribute = transformedAttributes[i];
            if (transformedAttribute.nodeName === name) {
                transformedAttribute.transformedNodeName = name;
                transformedAttribute.transformedNodeValue = `${value}`;
                return;
            }
        }

        const newAttribute = XNode.create(DOM_ATTRIBUTE_NODE, name, value, this);
        newAttribute.transformedNodeName = name;
        newAttribute.transformedNodeValue = value;
        newAttribute.parentNode = this;
        this.transformedChildNodes.push(newAttribute);
    }

    setAttributeNS(namespace: any, name: any, value: any) {
        const attributes = this.childNodes.filter(n => n.nodeType === DOM_ATTRIBUTE_NODE);
        for (let i = 0; i < attributes.length; ++i) {
            const attribute = attributes[i];
            if (
                attribute.namespaceUri == namespace &&
                attribute.localName == this.qualifiedNameToParts(`${name}`)[1]
            ) {
                attribute.nodeValue = `${value}`;
                attribute.nodeName = `${name}`;
                attribute.prefix = this.qualifiedNameToParts(`${name}`)[0];
                return;
            }
        }

        this.childNodes.push(XNode.create(DOM_ATTRIBUTE_NODE, name, value, this, namespace));
    }

    getAttributeValue(name: string): any {
        const attributes = this.childNodes.filter(n => n.nodeType === DOM_ATTRIBUTE_NODE);
        for (let i = 0; i < attributes.length; ++i) {
            if (attributes[i].nodeName === name) {
                return attributes[i].nodeValue;
            }
        }

        return null;
    }

    getAttributeNS(namespace: any, localName: any) {
        const attributes = this.childNodes.filter(n => n.nodeType === DOM_ATTRIBUTE_NODE);
        for (let i = 0; i < attributes.length; ++i) {
            const attribute = attributes[i];
            if (attribute.namespaceUri === namespace && attribute.localName === localName) {
                return attribute.nodeValue;
            }
        }

        return null;
    }

    hasAttribute(name: string) {
        const attributes = this.childNodes.filter(n => n.nodeType === DOM_ATTRIBUTE_NODE);
        for (let i = 0; i < attributes.length; ++i) {
            if (attributes[i].nodeName === name) {
                return true;
            }
        }

        return false;
    }

    hasAttributeNS(namespace: string, localName: string) {
        const attributes = this.childNodes.filter(n => n.nodeType === DOM_ATTRIBUTE_NODE);
        for (let i = 0; i < attributes.length; ++i) {
            const attribute = attributes[i];
            if (attribute.namespaceUri === namespace && attribute.localName === localName) {
                return true;
            }
        }
        return false;
    }

    removeAttribute(name: string) {
        const newChildNodes: XNode[] = [];
        for (let i = 0; i < this.childNodes.length; ++i) {
            const childNode = this.childNodes[i];
            if (childNode.nodeType !== DOM_ATTRIBUTE_NODE) {
                newChildNodes.push(childNode);
                continue;
            }

            if (childNode.nodeName !== name) {
                newChildNodes.push(childNode);
            }
        }

        this.childNodes = newChildNodes;
    }

    removeAttributeNS(namespace: string, localName: string) {
        const newChildNodes: XNode[] = [];
        for (let i = 0; i < this.childNodes.length; ++i) {
            const childNode = this.childNodes[i];
            if (childNode.nodeType !== DOM_ATTRIBUTE_NODE) {
                newChildNodes.push(childNode);
                continue;
            }

            if (childNode.localName !== localName || childNode.namespaceUri !== namespace) {
                newChildNodes.push(childNode);
            }
        }

        this.childNodes = newChildNodes;
    }

    getElementsByTagName(name: string) {
        const ret = [];
        const self = this;
        if ('*' == name) {
            this.domTraverseElements(
                this,
                (node: any) => {
                    if (self == node) return;
                    ret.push(node);
                },
                null
            );
        } else {
            this.domTraverseElements(
                this,
                (node: any) => {
                    if (self == node) return;
                    if (node.nodeName == name) {
                        ret.push(node);
                    }
                },
                null
            );
        }
        return ret;
    }

    getElementsByTagNameNS(namespace: string, localName: string) {
        const ret = [];
        const self = this;
        if ('*' == namespace && '*' == localName) {
            this.domTraverseElements(
                this,
                (node: any) => {
                    if (self == node) return;
                    ret.push(node);
                },
                null
            );
        } else if ('*' == namespace) {
            this.domTraverseElements(
                this,
                (node: any) => {
                    if (self == node) return;
                    if (node.localName == localName) ret.push(node);
                },
                null
            );
        } else if ('*' == localName) {
            this.domTraverseElements(
                this,
                (node: any) => {
                    if (self == node) return;
                    if (node.namespaceUri == namespace) ret.push(node);
                },
                null
            );
        } else {
            this.domTraverseElements(
                this,
                (node: any) => {
                    if (self == node) return;
                    if (node.localName == localName && node.namespaceUri == namespace) {
                        ret.push(node);
                    }
                },
                null
            );
        }
        return ret;
    }

    getElementById(id: any): any {
        let ret = null;
        this.domTraverseElements(
            this,
            (node: any) => {
                if (node.getAttributeValue('id') == id) {
                    ret = node;
                    return false;
                }
            },
            null
        );
        return ret;
    }

    getAncestorByLocalName(localName: string): XNode | undefined {
        if (this.parentNode === null || this.parentNode === undefined) {
            return undefined;
        }

        if (this.parentNode.localName === localName) {
            return this.parentNode;
        }

        return this.parentNode.getAncestorByLocalName(localName);
    }

    getAncestorById(id: number): XNode | undefined {
        if (this.parentNode === null || this.parentNode === undefined) {
            return undefined;
        }

        if (this.parentNode.id === id) {
            return this.parentNode;
        }

        return this.parentNode.getAncestorById(id);
    }
}
