import { parseDocument } from 'htmlparser2';
import { Iterable } from './Iterable';

export class Parse {
	constructor(data, options = {}) {
		this.root = null;

		this.memoize = {};
		this.adjacency = new Map();

		this.setUp(data, options);
	}

	setUp(data, options) {
		if (typeof Buffer !== 'undefined' && Buffer.isBuffer(data)) {
			data = data.toString();
		}

		if (typeof data === 'string') {
			this.root = parseDocument(data, options);
		}
	}

	get nodes() {
		return this.adjacency;
	}

	arrayify(data) {
		return Array.isArray(data) ? data : [data];
	}

	iterify(data) {
		return new Iterable(data);
	}

	memoify(data) {
		const values = this.arrayify(data).filter(value => {
			if (!(typeof value === 'string')) {
				return false;
			}

			if (this.memoize[value] === undefined) {
				this.memoize[value] = value.toLowerCase();
			}

			return true;
		});

		return this.iterify(values);
	}

	includes(node, value) {
		if (node.attribs) {
			const attribs = this.iterify(Object.values(node.attribs));

			for (let attrib of attribs) {
				if (attrib.toLowerCase().includes(value)) {
					return true;
				}
			}
		}

		if (node.data) {
			return node.data.toLowerCase().includes(value);
		}

		return false;
	}

	find(data, root = this.root) {
		if (!root) {
			return this;
		}

		let values = this.memoify(data);
		let stack = [root];

		while (stack.length) {
			let node = stack.pop();

			if (!node) {
				continue;
			}

			for (let value of values) {
				if (this.includes(node, this.memoize[value])) {
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
