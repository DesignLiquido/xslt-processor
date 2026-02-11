// Copyright 2026 Design Liquido
// All Rights Reserved

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
import { XDocument } from './xdocument';
import { XNode } from './xnode';

/**
 * Converts a native browser DOM Document or Node into an XDocument/XNode tree
 * compatible with the XSLT processor. This allows browser users who already
 * have a parsed DOM to skip the string-based xmlParse() step.
 *
 * @param nativeNode A browser DOM Document, Element, or other Node.
 * @returns An XDocument representing the same tree structure.
 */
export function domDocumentToXDocument(nativeNode: Document | Node): XDocument {
    if (nativeNode.nodeType === DOM_DOCUMENT_NODE) {
        const xDoc = new XDocument();
        const childNodes = nativeNode.childNodes;
        for (let i = 0; i < childNodes.length; i++) {
            const converted = convertNode(childNodes[i], xDoc);
            if (converted) {
                converted.siblingPosition = xDoc.childNodes.length;
                xDoc.appendChild(converted);
            }
        }
        return xDoc;
    }

    // If a non-document node is passed, wrap it in an XDocument
    const xDoc = new XDocument();
    const converted = convertNode(nativeNode, xDoc);
    if (converted) {
        converted.siblingPosition = 0;
        xDoc.appendChild(converted);
    }
    return xDoc;
}

function convertNode(nativeNode: Node, ownerDoc: XDocument): XNode | null {
    switch (nativeNode.nodeType) {
        case DOM_ELEMENT_NODE: {
            const element = nativeNode as Element;
            const xNode = XNode.create(
                DOM_ELEMENT_NODE,
                element.nodeName,
                null,
                ownerDoc,
                element.namespaceURI
            );
            xNode.prefix = element.prefix || null;
            xNode.localName = element.localName || element.nodeName;

            // Convert attributes from NamedNodeMap to XNode children
            const attrs = element.attributes;
            for (let i = 0; i < attrs.length; i++) {
                const attr = attrs[i];
                const attrNode = XNode.create(
                    DOM_ATTRIBUTE_NODE,
                    attr.name,
                    attr.value,
                    xNode,
                    attr.namespaceURI
                );
                attrNode.prefix = attr.prefix || null;
                attrNode.localName = attr.localName || attr.name;
                attrNode.parentNode = xNode;
                attrNode.siblingPosition = xNode.childNodes.length;
                xNode.appendChild(attrNode);
            }

            // Convert child nodes
            const childNodes = nativeNode.childNodes;
            for (let i = 0; i < childNodes.length; i++) {
                const converted = convertNode(childNodes[i], ownerDoc);
                if (converted) {
                    converted.siblingPosition = xNode.childNodes.length;
                    xNode.appendChild(converted);
                }
            }

            return xNode;
        }

        case DOM_TEXT_NODE:
            return XNode.create(DOM_TEXT_NODE, '#text', nativeNode.nodeValue || '', ownerDoc);

        case DOM_CDATA_SECTION_NODE:
            return XNode.create(DOM_CDATA_SECTION_NODE, '#cdata-section', nativeNode.nodeValue || '', ownerDoc);

        case DOM_COMMENT_NODE:
            return XNode.create(DOM_COMMENT_NODE, '#comment', nativeNode.nodeValue || '', ownerDoc);

        case DOM_PROCESSING_INSTRUCTION_NODE: {
            const pi = nativeNode as ProcessingInstruction;
            return XNode.create(DOM_PROCESSING_INSTRUCTION_NODE, pi.target, pi.data, ownerDoc);
        }

        case DOM_DOCUMENT_TYPE_NODE: {
            const dt = nativeNode as DocumentType;
            return XNode.create(DOM_DOCUMENT_TYPE_NODE, '#dtd-section', dt.name, ownerDoc);
        }

        case DOM_DOCUMENT_FRAGMENT_NODE: {
            const fragment = XNode.create(DOM_DOCUMENT_FRAGMENT_NODE, '#document-fragment', null, ownerDoc);
            const childNodes = nativeNode.childNodes;
            for (let i = 0; i < childNodes.length; i++) {
                const converted = convertNode(childNodes[i], ownerDoc);
                if (converted) {
                    converted.siblingPosition = fragment.childNodes.length;
                    fragment.appendChild(converted);
                }
            }
            return fragment;
        }

        default:
            return null;
    }
}
