import { XPathLexer } from './lib/src/lexer';
import { XPath10Parser } from './lib/src/parser';
import { createContext } from './lib/src/context';
import { XPathNode } from './lib/src/node';
import { XNode } from '../dom';

export class XPathSelector {
    private lexer: XPathLexer;
    private parser: XPath10Parser;
    private nodeCache: WeakMap<XNode, XPathNode> = new WeakMap();

    constructor() {
        // Use XPath 1.0 for backward compatibility
        this.lexer = new XPathLexer('1.0');
        this.parser = new XPath10Parser();
    }

    public select(expression: string, contextNode: XNode): XNode[] {
        const tokens = this.lexer.scan(expression);
        const ast = this.parser.parse(tokens);
        
        // Limpar cache para cada seleção
        this.nodeCache = new WeakMap();
        
        const xpathNode = this.convertToXPathNode(contextNode);
        const context = createContext(xpathNode);
        const result = ast.evaluate(context);
        
        return this.convertResult(result);
    }

    private convertToXPathNode(node: XNode): XPathNode {
        // Verificar se já foi convertido
        if (this.nodeCache.has(node)) {
            return this.nodeCache.get(node)!;
        }

        const childNodes = node.childNodes ? Array.from(node.childNodes) : [];
        const attributes = childNodes.filter(n => n.nodeType === 2); // DOM_ATTRIBUTE_NODE = 2
        const elementChildren = childNodes.filter(n => n.nodeType !== 2);

        // Criar o nó XPath ANTES de converter filhos para evitar recursão infinita
        const xpathNode: XPathNode = {
            nodeType: this.getNodeType(node),
            nodeName: node.nodeName || '#document',
            localName: node.localName || node.nodeName,
            namespaceUri: node.namespaceUri || null,
            textContent: node.nodeValue,
            parentNode: null, // Não converter para evitar ciclos
            childNodes: [], // Será preenchido depois
            attributes: [], // Será preenchido depois
            nextSibling: null, // Não converter para evitar ciclos
            previousSibling: null, // Não converter para evitar ciclos
            ownerDocument: null, // Não converter para evitar ciclos
        };

        // Cachear ANTES de converter filhos
        this.nodeCache.set(node, xpathNode);

        // AGORA converter filhos e atribuir
        xpathNode.childNodes = elementChildren.map(child => this.convertToXPathNode(child));
        xpathNode.attributes = attributes.map(attr => this.convertToXPathNode(attr));

        return xpathNode;
    }

    private getNodeType(node: XNode): number {        
        if (node.nodeType !== undefined) return node.nodeType;
        
        switch (node.nodeName?.toLowerCase()) {
            case '#text':
                return 3; // TEXT_NODE
            case '#comment':
                return 8; // COMMENT_NODE
            case '#document':
                return 9; // DOCUMENT_NODE
            case '#document-fragment':
                return 11; // DOCUMENT_FRAGMENT_NODE
            default:
                return node.childNodes && node.childNodes.length > 0 ? 1 : 1;
        }
    }

    private convertResult(result: any): XNode[] {
        if (Array.isArray(result)) {
            return result.map(node => this.convertFromXPathNode(node));
        }
        
        if (result && typeof result === 'object' && 'nodeType' in result) {
            return [this.convertFromXPathNode(result)];
        }
            
        return [];
    }

    private convertFromXPathNode(xpathNode: XPathNode): XNode {
        return {
            name: xpathNode.nodeName,
            nodeType: xpathNode.nodeType,
            text: xpathNode.textContent,
            value: xpathNode.textContent,
            localName: xpathNode.localName,
            namespaceUri: xpathNode.namespaceUri,
            parentNode: xpathNode.parentNode ? this.convertFromXPathNode(xpathNode.parentNode) : undefined,
            children: xpathNode.childNodes ? Array.from(xpathNode.childNodes).map(child => this.convertFromXPathNode(child)) : undefined,
            attributes: xpathNode.attributes ? Array.from(xpathNode.attributes).map(attr => this.convertFromXPathNode(attr)) : undefined,
            nextSibling: xpathNode.nextSibling ? this.convertFromXPathNode(xpathNode.nextSibling) : undefined,
            previousSibling: xpathNode.previousSibling ? this.convertFromXPathNode(xpathNode.previousSibling) : undefined,
        } as any;
    }
}
