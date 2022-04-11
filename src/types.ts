import { NodeWithChildren, Node, Document, Element } from 'domhandler';

type DocumentNode = null | Node | NodeWithChildren | NodeElement | Element;
type Stack = DocumentNode[];
type Memoized = { [key: string]: string };
type Raws = { data: DocumentNode[]; [key: string]: any[] };

interface NodeElement extends Element {
	data?: string;
}

export {
	Document,
	DocumentNode,
	Element,
	NodeElement,
	NodeWithChildren,
	Stack,
	Memoized,
	Raws,
};
