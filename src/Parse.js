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
			if (!(typeof key === 'string')) {
				return false;
			}

			if (this.memoized[key] === undefined) {
				this.memoized[key] = key.toLowerCase();
			}

			return true;
		});
		return new Iterable(array);
	}

	setUp(data, options) {
		if (!(typeof Buffer === 'undefined') && Buffer.isBuffer(data)) {
			data = data.toString();
		}

		if (typeof data === 'string') {
			this.root = parseDocument(data, options);
		}
	}

	includes(node, key) {
		if (node.data) {
			return node.data.toLowerCase().includes(key);
		}

		if (node.attribs) {
			const attribs = new Iterable(Object.values(node.attribs));

			for (let attrib of attribs) {
				if (attrib.toLowerCase().includes(key)) {
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
		const iterableKeys = this.memoize(keys);

		const pickAttrib = node => {
			if (node?.attribs?.[attrib]) {
				this.attribs.add(node.attribs[attrib]);
			}
		};

		const callback = node => {
			if (isAttrib) pickAttrib(node);

			for (let key of iterableKeys) {
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
