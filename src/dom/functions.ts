// Copyright 2023-2024 Design Liquido
// Copyright 2018 Johannes Wilm
// Copyright 2005 Google Inc.
// All Rights Reserved

import { XDocument } from "./xdocument";
import { XNode } from './xnode';

// Wrapper around DOM methods so we can condense their invocations.
export function domGetAttributeValue(node: XNode, name: string) {
    return node.getAttributeValue(name);
}

export function domSetAttribute(node: XNode, name: string, value: any) {
    return node.setAttribute(name, value);
}

export function domAppendChild(node: XNode, child: any) {
    return node.appendChild(child);
}

export function domCreateTextNode(node: XDocument, text: string) {
    return node.createTextNode(text);
}

export function domCreateElement(doc: XDocument, name: string) {
    return doc.createElement(name);
}

export function domCreateCDATASection(doc: XDocument, data: any) {
    return doc.createCDATASection(data);
}

export function domCreateComment(doc: any, text: any) {
    return doc.createComment(text);
}

export function domCreateDocumentFragment(doc: XDocument): XNode {
    return doc.createDocumentFragment();
}

export function domCreateDTDSection(doc: XDocument, data: any) {
    return doc.createDTDSection(data);
}

//XDocument.prototype = new XNode(DOM_DOCUMENT_NODE, '#document');
