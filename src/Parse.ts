import { parseDocument } from 'htmlparser2';

export class Parse {
	root: unknown;
	memoized: any;
	adjacency: Map<string, any>;
	attribs: Set<string>;

	constructor(data: string, options = {}) {
		this.root = null;

		this.memoized = {};
		this.adjacency = new Map();
		this.attribs = new Set();

		this.setUp(data, options);
	}

	setUp(data: string, options: any) {
		if (typeof data === 'string') {
			this.root = parseDocument(data, options);
		}
	}

	toArray(data: any) {
		if (Array.isArray(data)) {
			return data;
		}
		return [data];
	}

	fromSet(set: Set<string>) {
		if (set instanceof Set) {
			return Array.from(set.values());
		}
		return [];
	}

	fromMap(map: Map<string, any>) {
		if (map instanceof Map) {
			return Array.from(map.values());
		}
		return [];
	}

	memo(keys: string | string[]) {
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

	includes(node: any, key: string) {
		if (node.data) {
			return node.data.toLowerCase().includes(key);
		}

		if (node.attribs) {
			for (let attrib in node.attribs) {
				if (node.attribs[attrib].toLowerCase().includes(key)) {
					return true;
				}
			}
		}

		return false;
	}

	transverse(callback: (node: any) => void) {
		let stack: any[] = [this.root];

		while (stack.length) {
			let node: any = stack.pop();

			if (!node) {
				continue;
			}

			callback(node);

			if (node.children) {
				for (let child of node.children) {
					stack.push(child);
				}
			}
		}
	}

	find(keys: string | string[], attrib?: any) {
		const isAttrib = typeof attrib === 'string';
		const memoizedKeys = this.memo(keys);

		const callback = (node: any) => {
			if (isAttrib) {
				if (node?.attribs?.[attrib]) {
					this.attribs.add(node.attribs[attrib]);
				}
			}

			for (let key of memoizedKeys) {
				if (this.includes(node, this.memoized[key])) {
					if (this.adjacency.has(key)) {
						this.adjacency.set(key, this.adjacency.get(key).concat(node));
					} else {
						this.adjacency.set(key, [node]);
					}
				}
			}
		};

		this.transverse(callback);

		const data: any = this.fromMap(this.adjacency);
		const raws: any = { data: data.flat(1) };

		if (isAttrib) {
			const attribsKey = attrib.concat('s');
			raws[attribsKey] = this.fromSet(this.attribs);
		}

		return raws;
	}
}
