// Our W3C DOM Node implementation. Note we call it XNode because we
// can't define the identifier Node. We do this mostly for Opera,
// where we can't reuse the HTML DOM for parsing our own XML, and for
// Safari, where it is too expensive to have the template processor

import { DOM_ATTRIBUTE_NODE } from '../constants';
import { domTraverseElements } from './functions';
import { XDocument } from './xdocument';

// operate on native DOM nodes.
export class XNode {
    attributes: XNode[];
    childNodes: XNode[];
    nodeType: any;
    nodeName: string;
    nodeValue: any;
    transformedNodeType: any;
    transformedNodeName: string;
    transformedNodeValue: any;
    ownerDocument: any;
    namespaceURI: any;
    prefix: any;
    localName: any;
    firstChild: any;
    lastChild: any;
    nextSibling: any;
    previousSibling: any;
    parentNode: any;

    static _unusedXNodes: any[] = [];

    constructor(type: any, name: any, opt_value: any, opt_owner: any, opt_namespace?: any) {
        this.attributes = [];
        this.childNodes = [];

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
    init(type: any, name: string, value: string, owner: any, namespaceUri: any) {
        this.nodeType = type - 0;
        this.nodeName = `${name}`;
        this.nodeValue = `${value}`;
        this.ownerDocument = owner;
        this.namespaceURI = namespaceUri || null;
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

    static recycle(node: any) {
        if (!node) {
            return;
        }

        if (node.constructor == XDocument) {
            this.recycle((node as any).documentElement);
            return;
        }

        if (node.constructor != this) {
            return;
        }

        this._unusedXNodes.push(node);
        for (let a = 0; a < node.attributes.length; ++a) {
            this.recycle(node.attributes[a]);
        }

        for (let c = 0; c < node.childNodes.length; ++c) {
            this.recycle(node.childNodes[c]);
        }

        node.attributes.length = 0;
        node.childNodes.length = 0;
        node.init.call(0, '', '', null);
    }

    static create(type: any, name: any, value: any, owner: any, namespace?: any) {
        if (this._unusedXNodes.length > 0) {
            const node = this._unusedXNodes.pop();
            node.init(type, name, value, owner, namespace);
            return node;
        }

        return new XNode(type, name, value, owner, namespace);
    }

    static clone(node: XNode, newOwner: XNode): XNode {
        const newNode = new XNode(node.nodeType, node.nodeName, node.nodeValue, newOwner, node.namespaceURI);
        for (let child of node.childNodes) {
            newNode.appendChild(XNode.clone(child, newNode));
        }

        for (let attribute of node.attributes) {
            newNode.setAttribute(attribute.nodeName, attribute.nodeValue);
        }

        return newNode;
    }

    appendChild(node: any) {
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
        return this.attributes.length > 0;
    }

    setAttribute(name: any, value: any) {
        for (let i = 0; i < this.attributes.length; ++i) {
            if (this.attributes[i].nodeName == name) {
                this.attributes[i].nodeValue = `${value}`;
                return;
            }
        }

        this.attributes.push(XNode.create(DOM_ATTRIBUTE_NODE, name, value, this));
    }

    setAttributeNS(namespace: any, name: any, value: any) {
        for (let i = 0; i < this.attributes.length; ++i) {
            if (
                this.attributes[i].namespaceURI == namespace &&
                this.attributes[i].localName == this.qualifiedNameToParts(`${name}`)[1]
            ) {
                this.attributes[i].nodeValue = `${value}`;
                this.attributes[i].nodeName = `${name}`;
                this.attributes[i].prefix = this.qualifiedNameToParts(`${name}`)[0];
                return;
            }
        }

        this.attributes.push(XNode.create(DOM_ATTRIBUTE_NODE, name, value, this, namespace));
    }

    getAttributeValue(name: any): any {
        for (let i = 0; i < this.attributes.length; ++i) {
            if (this.attributes[i].nodeName == name) {
                return this.attributes[i].nodeValue;
            }
        }

        return null;
    }

    getAttributeNS(namespace: any, localName: any) {
        for (let i = 0; i < this.attributes.length; ++i) {
            if (this.attributes[i].namespaceURI == namespace && this.attributes[i].localName == localName) {
                return this.attributes[i].nodeValue;
            }
        }

        return null;
    }

    hasAttribute(name: any) {
        for (let i = 0; i < this.attributes.length; ++i) {
            if (this.attributes[i].nodeName == name) {
                return true;
            }
        }

        return false;
    }

    hasAttributeNS(namespace: any, localName: any) {
        for (let i = 0; i < this.attributes.length; ++i) {
            if (this.attributes[i].namespaceURI == namespace && this.attributes[i].localName == localName) {
                return true;
            }
        }
        return false;
    }

    removeAttribute(name: any) {
        const a = [];
        for (let i = 0; i < this.attributes.length; ++i) {
            if (this.attributes[i].nodeName != name) {
                a.push(this.attributes[i]);
            }
        }
        this.attributes = a;
    }

    removeAttributeNS(namespace: any, localName: any) {
        const a = [];
        for (let i = 0; i < this.attributes.length; ++i) {
            if (this.attributes[i].localName != localName || this.attributes[i].namespaceURI != namespace) {
                a.push(this.attributes[i]);
            }
        }
        this.attributes = a;
    }

    getElementsByTagName(name: any) {
        const ret = [];
        const self = this;
        if ('*' == name) {
            domTraverseElements(
                this,
                (node: any) => {
                    if (self == node) return;
                    ret.push(node);
                },
                null
            );
        } else {
            domTraverseElements(
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

    getElementsByTagNameNS(namespace: any, localName: any) {
        const ret = [];
        const self = this;
        if ('*' == namespace && '*' == localName) {
            domTraverseElements(
                this,
                (node: any) => {
                    if (self == node) return;
                    ret.push(node);
                },
                null
            );
        } else if ('*' == namespace) {
            domTraverseElements(
                this,
                (node: any) => {
                    if (self == node) return;
                    if (node.localName == localName) ret.push(node);
                },
                null
            );
        } else if ('*' == localName) {
            domTraverseElements(
                this,
                (node: any) => {
                    if (self == node) return;
                    if (node.namespaceURI == namespace) ret.push(node);
                },
                null
            );
        } else {
            domTraverseElements(
                this,
                (node: any) => {
                    if (self == node) return;
                    if (node.localName == localName && node.namespaceURI == namespace) {
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
        domTraverseElements(
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
}
