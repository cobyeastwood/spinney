import {
	NodeWithChildren,
	DataNode,
	Node,
	Document,
	Element,
} from 'domhandler';

type DocumentNode = null | Node | NodeWithChildren | DataNode | Element;
type Stack = DocumentNode[];
type Memoized = { [key: string]: string };
type Raws = { data: DocumentNode[]; [key: string]: any[] };

export {
	Document,
	DocumentNode,
	Element,
	DataNode,
	NodeWithChildren,
	Stack,
	Memoized,
	Raws,
};
