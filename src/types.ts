import { NodeWithChildren, Node, Document, Element } from 'domhandler';

type Options = { overide?: boolean };

type Callback = (node: NodeElement) => void;

type DocumentNode = null | Node | NodeWithChildren | NodeElement | Element;
type Stack = DocumentNode[];
type Memoized = { [key: string]: string };

type Raw = { nodes: NodeElement[]; [key: string]: any[] };
type RawHrefs = { hrefs: string[]; freqs?: string[] };

type SiteMapOuput =
	| {
			urlset?: { url: Array<any> };
			sitemapindex?: { $?: any; sitemap: Array<{ loc: string[] }> };
	  }
	| undefined;

interface NodeElement extends Element {
	data?: string;
	getId: () => string;
}

type Context = { href?: string; hrefs?: string[]; nodes?: any };

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
