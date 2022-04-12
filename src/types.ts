import { NodeWithChildren, Node, Document, Element } from 'domhandler';

type Callback = (node: NodeElement) => void;

type DocumentNode = null | Node | NodeWithChildren | NodeElement | Element;
type Stack = DocumentNode[];
type Memoized = { [key: string]: string };
type Raws = { data: DocumentNode[]; [key: string]: any[] };

type Site = { hrefs: string[] };
type SiteMapOuput =
	| { sitemapindex: { $?: any; sitemap: Array<{ loc: string[] }> } }
	| undefined;

interface NodeElement extends Element {
	data?: string;
}

type Context = { hrefs?: string[]; data?: DocumentNode[] };

export {
	Callback,
	Context,
	Document,
	DocumentNode,
	Element,
	NodeElement,
	NodeWithChildren,
	Site,
	SiteMapOuput,
	Stack,
	Memoized,
	Raws,
};
