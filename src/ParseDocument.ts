import { parseDocument } from 'htmlparser2';
import {
	Document,
	DocumentNode,
	NodeElement,
	Memoized,
	Stack,
	Raws,
} from './types';

export default class ParseDocument {
	private setUpOutput: Document | DocumentNode;
	private memoized: Memoized;
	private adjacency: Map<string, DocumentNode[]>;
	private attribs: Set<string>;

	constructor(data: string, options = {}) {
		this.setUpOutput = null;

		this.memoized = {};
		this.adjacency = new Map();
		this.attribs = new Set();

		this.setUp(data, options);
	}

	private setUp(data: string, options: any): void {
		if (typeof data === 'string') {
			this.setUpOutput = parseDocument(data, options) as Document;
		}
	}

	private addMemoized(keys: string | string[]): string[] {
		return this.toArray(keys).filter(key => {
			if (typeof key === 'string') {
				if (this.memoized[key] === undefined) {
					this.memoized[key] = key.toLowerCase();
				}
				return true;
			}
			return false;
		});
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

	hasKey(node: NodeElement, key: string): boolean {
		if (node.data) {
			return node.data.toLowerCase().indexOf(key) !== -1;
		}

		if (node.attribs) {
			for (let attrib in node.attribs) {
				if ((attrib = node.attribs[attrib])) {
					return attrib.toLowerCase().indexOf(key) !== -1;
				}
			}
		}

		return false;
	}

	depthSearch(callback: (node: NodeElement) => void): void {
		let stack: Stack = [this.setUpOutput];

		while (stack.length) {
			const node = stack.pop() as NodeElement;

			if (!node) {
				continue;
			}

			callback(node);

			if (node?.children) {
				for (let child of node.children) {
					stack.push(child);
				}
			}
		}
	}

	private _find(callback: (node: NodeElement) => void, attrib?: string): Raws {
		this.depthSearch(callback);

		const data = this.fromMap(this.adjacency);
		const raws = {
			data: data.flat(1),
		} as Raws;

		if (attrib) {
			const attribsKey = attrib.concat('s');
			raws[attribsKey] = this.fromSet(this.attribs);
		}

		return raws;
	}

	find(keys: string | string[], attrib?: string): Raws {
		const isAttribs = typeof attrib === 'string';
		const memoizedKeys = this.addMemoized(keys);

		const callback = (node: NodeElement) => {
			if (isAttribs) {
				if (node?.attribs?.[attrib]) {
					this.attribs.add(node.attribs[attrib]);
				}
			}

			for (let key of memoizedKeys) {
				if (this.hasKey(node, this.memoized[key])) {
					if (this.adjacency.has(key)) {
						this.adjacency.set(
							key,
							(this.adjacency.get(key) as NodeElement[]).concat(node)
						);
					} else {
						this.adjacency.set(key, [node]);
					}
				}
			}
		};

		return this._find(callback, attrib);
	}
}
