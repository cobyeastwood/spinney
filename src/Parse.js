import { parseDocument } from 'htmlparser2';
import { Iterable } from './Iterable';

export class Parse {
	constructor(data, options = {}) {
		this.root = null;

		this.memoized = {};
		this.adjacency = new Map();

		this.setUp(data, options);
	}

	setUp(data, options) {
		if (!(typeof Buffer === 'undefined') && Buffer.isBuffer(data)) {
			data = data.toString();
		}

		if (typeof data === 'string') {
			this.root = parseDocument(data, options);
		}
	}

	get nodes() {
		return this.adjacency;
	}

	toArray(data) {
		if (Array.isArray(data)) {
			return data;
		}
		return [data];
	}

	memoize(data) {
		const values = this.toArray(data).filter(value => {
			if (!(typeof value === 'string')) {
				return false;
			}

			if (this.memoized[value] === undefined) {
				this.memoized[value] = value.toLowerCase();
			}

			return true;
		});

		return new Iterable(values);
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

	find(data, root = this.root) {
		if (!root) {
			return this;
		}

		let values = this.memoize(data);
		let stack = [root];

		while (stack.length) {
			let node = stack.pop();

			if (!node) {
				continue;
			}

			for (let value of values) {
				if (this.includes(node, this.memoized[value])) {
					if (this.adjacency.has(value)) {
						this.adjacency.set(value, this.adjacency.get(value).concat(node));
					} else {
						this.adjacency.set(value, [node]);
					}
				}
			}

			if (node.children) {
				for (let key in node.children) {
					stack.push(node.children[key]);
				}
			}
		}

		return this;
	}
}
