import { NodeWithChildren, Node, Document, Element } from 'domhandler';

type Options = { overide?: boolean };

type Callback = (node: NodeElement) => void;

type DocumentNode = null | Node | NodeWithChildren | NodeElement | Element;
type Stack = DocumentNode[];
type Memoized = { [key: string]: string };

type Raw = { nodes: DocumentNode[]; [key: string]: any[] };
type RawHrefs = { hrefs: string[] };

type SiteMapOuput =
	| { sitemapindex: { $?: any; sitemap: Array<{ loc: string[] }> } }
	| undefined;

interface NodeElement extends Element {
	data?: string;
	getId: () => string;
}

type Context = { hrefs?: string[]; nodes?: any };

export {
	Callback,
	Context,
	Document,
	DocumentNode,
	Element,
	NodeElement,
	NodeWithChildren,
	Options,
	SiteMapOuput,
	Stack,
	Memoized,
	Raw,
	RawHrefs,
};
