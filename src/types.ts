import { NodeWithChildren, Node, Document } from 'domhandler';

type DocumentNode = null | Node | NodeWithChildren;
type Stack = DocumentNode[];
type Memoized = { [key: string]: string };
type Raws = { data: DocumentNode[]; [key: string]: any[] };

export { Document, DocumentNode, NodeWithChildren, Stack, Memoized, Raws };
