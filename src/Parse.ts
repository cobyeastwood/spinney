import { parseDocument } from 'htmlparser2';
import {
	Document,
	DocumentNode,
	Element,
	DataNode,
	NodeWithChildren,
	Memoized,
	Stack,
	Raws,
} from './types';

export class Parse {
	private root: Document | DocumentNode;
	private memoized: Memoized;
	private adjacency: Map<string, DocumentNode[]>;
	private attribs: Set<string>;

	constructor(data: string, options = {}) {
		this.root = null;

		this.memoized = {};
		this.adjacency = new Map();
		this.attribs = new Set();

		this.setUp(data, options);
	}

	private setUp(data: string, options: any): void {
		if (typeof data === 'string') {
			this.root = parseDocument(data, options) as Document;
		}
	}

	private memo(keys: string | string[]): string[] {
		return this.toArray(keys).filter(key => {
			if (typeof key !== 'string') {
				return false;
			}

			if (this.memoized[key] === undefined) {
				this.memoized[key] = key.toLowerCase();
			}

			return true;
		});
	}

	private includes(node: DocumentNode, key: string): boolean {
		if (node instanceof DataNode && node.data) {
			return node.data.toLowerCase().indexOf(key) !== -1;
		}

		if (node instanceof Element && node.attribs) {
			for (let attrib in node.attribs) {
				if ((attrib = node.attribs[attrib])) {
					return attrib.toLowerCase().indexOf(key) !== -1;
				}
			}
		}

		return false;
	}

	toArray(data: any): any[] {
		if (Array.isArray(data)) {
			return data;
		}
		return [data];
	}

	fromSet(set: Set<any>): any[] {
		if (set instanceof Set) {
			return Array.from(set.values());
		}
		return [];
	}

	fromMap(map: Map<any, any>): any[] {
		if (map instanceof Map) {
			return Array.from(map.values());
		}
		return [];
	}

	transverse(callback: (node: DocumentNode) => void): void {
		let stack: Stack = [this.root];

		while (stack.length) {
			const node: DocumentNode = stack.pop() as DocumentNode;

			if (!node) {
				continue;
			}

			callback(node);

			if (node instanceof NodeWithChildren && node?.children) {
				for (let child of node.children) {
					stack.push(child);
				}
			}
		}
	}

	find(keys: string | string[], attrib?: string) {
		const isAttrib = typeof attrib === 'string';
		const memoizedKeys = this.memo(keys);

		const callback = (node: DocumentNode) => {
			if (isAttrib) {
				if (node instanceof Element && node?.attribs?.[attrib]) {
					this.attribs.add(node.attribs[attrib]);
				}
			}

			for (let key of memoizedKeys) {
				if (this.includes(node, this.memoized[key])) {
					if (this.adjacency.has(key)) {
						this.adjacency.set(
							key,
							(this.adjacency.get(key) as DocumentNode[]).concat(node)
						);
					} else {
						this.adjacency.set(key, [node]);
					}
				}
			}
		};

		this.transverse(callback);

		const data: DocumentNode[] = this.fromMap(this.adjacency);
		const raws: Raws = {
			data: data.flat(1),
		};

		if (isAttrib) {
			const attribsKey = attrib.concat('s');
			raws[attribsKey] = this.fromSet(this.attribs);
		}

		return raws;
	}
}
