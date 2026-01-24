import {
    DOM_ATTRIBUTE_NODE,
    DOM_CDATA_SECTION_NODE,
    DOM_COMMENT_NODE,
    DOM_DOCUMENT_FRAGMENT_NODE,
    DOM_DOCUMENT_NODE,
    DOM_DOCUMENT_TYPE_NODE,
    DOM_ELEMENT_NODE,
    DOM_PROCESSING_INSTRUCTION_NODE,
    DOM_TEXT_NODE
} from '../constants';
import { XNode } from './xnode';

export class XDocument extends XNode {
    documentElement: any;

    constructor() {
        // NOTE(mesch): According to the DOM Spec, ownerDocument of a
        // document node is null.
        super(DOM_DOCUMENT_NODE, '#document', null, null);
        this.documentElement = null;
    }

    appendChild(node: any) {
        super.appendChild(node);
        this.documentElement = this.childNodes[0];
    }

    createElement(name: string): XNode {
        return XNode.create(DOM_ELEMENT_NODE, name, null, this);
    }

    createElementNS(namespace: any, name: any) {
        return XNode.create(DOM_ELEMENT_NODE, name, null, this, namespace);
    }

    createDocumentFragment(): XNode {
        return XNode.create(DOM_DOCUMENT_FRAGMENT_NODE, '#document-fragment', null, this);
    }

    createTextNode(value: any) {
        return XNode.create(DOM_TEXT_NODE, '#text', value, this);
    }

    createAttribute(name: any) {
        return XNode.create(DOM_ATTRIBUTE_NODE, name, null, this);
    }

    createAttributeNS(namespace: any, name: any) {
        return XNode.create(DOM_ATTRIBUTE_NODE, name, null, this, namespace);
    }

    createComment(data: any) {
        return XNode.create(DOM_COMMENT_NODE, '#comment', data, this);
    }

    createCDATASection(data: any) {
        return XNode.create(DOM_CDATA_SECTION_NODE, '#cdata-section', data, this);
    }

    createDTDSection(data: any) {
        return XNode.create(DOM_DOCUMENT_TYPE_NODE, '#dtd-section', data, this);
    }

    createProcessingInstruction(target: string, data: any) {
        return XNode.create(DOM_PROCESSING_INSTRUCTION_NODE, target, data, this);
    }
}
