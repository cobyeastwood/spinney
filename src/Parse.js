import { parseDocument } from 'htmlparser2';
import { Iterable } from './Iterable';

export class Parse {
	constructor(data, options = {}) {
		this.root = null;

		this.memoized = {};
		this.adjacency = new Map();
		this.attribs = new Set();

		this.setUp(data, options);
	}

	setUp(data, options) {
		if (typeof data === 'string') {
			this.root = parseDocument(data, options);
		}
	}

	toArray(data) {
		if (Array.isArray(data)) {
			return data;
		}
		return [data];
	}

	fromSet(set) {
		if (set instanceof Set) {
			return Array.from(set.values());
		}
		return [];
	}

	fromMap(map) {
		if (map instanceof Map) {
			return Array.from(map.values());
		}
		return [];
	}

	memoize(keys) {
		const array = this.toArray(keys).filter(key => {
			if (typeof key !== 'string') {
				return false;
			}

			if (this.memoized[key] === undefined) {
				this.memoized[key] = key.toLowerCase();
			}

			return true;
		});
		return new Iterable(array);
	}

	includes(node, key) {
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

	transverse(callback = () => {}) {
		let stack = [this.root];

		while (stack.length) {
			let node = stack.pop();

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

	find(keys, attrib) {
		const isAttrib = typeof attrib === 'string';
		const memoized = this.memoize(keys);

		const callback = node => {
			if (isAttrib) {
				if (node?.attribs?.[attrib]) {
					this.attribs.add(node.attribs[attrib]);
				}
			}

			for (let key of memoized) {
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

		const data = this.fromMap(this.adjacency);
		const raws = { data: data.flat(1) };

		if (isAttrib) {
			const attribsKey = attrib.concat('s');
			raws[attribsKey] = this.fromSet(this.attribs);
		}

		return raws;
	}
}
