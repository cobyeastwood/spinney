import { parseDocument } from 'htmlparser2';
import { Iterable } from './Iterable';

export class Parse {
	constructor(data, options = {}) {
		this.root = null;

		this.memoized = {};
		this.adjacency = new Map();

		this.setUp(data, options);
	}

	get keys() {
		return this.adjacency.keys();
	}

	get values() {
		return this.adjacency.values();
	}

	get(key) {
		return this.adjacency.get(key);
	}

	has(key) {
		return this.adjacency.has(key);
	}

	toArray(data) {
		if (Array.isArray(data)) {
			return data;
		}
		return [data];
	}

	memoize(data) {
		return this.toArray(data).filter(value => {
			if (!(typeof value === 'string')) {
				return false;
			}

			if (this.memoized[value] === undefined) {
				this.memoized[value] = value.toLowerCase();
			}

			return true;
		});
	}

	setUp(data, options) {
		if (!(typeof Buffer === 'undefined') && Buffer.isBuffer(data)) {
			data = data.toString();
		}

		if (typeof data === 'string') {
			this.root = parseDocument(data, options);
		}
	}

	includes(node, value) {
		if (node.data) {
			return node.data.toLowerCase().includes(value);
		}

		if (node.attribs) {
			const attribs = new Iterable(Object.values(node.attribs));

			for (let attrib of attribs) {
				if (attrib.toLowerCase().includes(value)) {
					return true;
				}
			}
		}

		return false;
	}

	transverse(callback) {
		if (!(typeof cb === 'function')) {
			return false;
		}

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

		return true;
	}

	find(data) {
		const values = new Iterable(this.memoize(data));

		const callback = node => {
			for (let value of values) {
				if (this.includes(node, this.memoized[value])) {
					if (this.adjacency.has(value)) {
						this.adjacency.set(value, this.adjacency.get(value).concat(node));
					} else {
						this.adjacency.set(value, [node]);
					}
				}
			}
		};

		this.transverse(callback);

		return this;
	}

	findAttrib(attrib) {
		const attribs = new Set();

		const callback = node => {
			if (node?.attribs?.[attrib]) {
				attribs.add(node.attribs[attrib]);
			}
		};

		this.transverse(callback);

		return Array.from(attribs.values());
	}
}
