import { parseDocument } from 'htmlparser2';
import { Iterable } from './Iterable';

export class Parse {
	constructor(options) {
		this.root = null;

		this.memoize = {};
		this.adjacency = new Map();

		this.setUp(options);
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
		const values = this.arrayify(data);

		values.forEach(value => {
			if (typeof value !== 'string') {
				throw new Error('parameter value must be of type string');
			}

			if (this.memoize[value] === undefined) {
				this.memoize[value] = value.toLowerCase();
			}
		});

		return this.iterify(values);
	}

	setUp({ data, options }) {
		if (typeof Buffer !== 'undefined' && Buffer.isBuffer(data)) {
			data = data.toString();
		}

		if (typeof data === 'string') {
			this.root = parseDocument(data, options);
		}
	}

	has(node, value) {
		if (!node) {
			return false;
		}

		if (node?.attribs?.href) {
			return node.attribs.href.includes(value);
		}

		if (node?.data) {
			return node.data.toLowerCase().includes(value);
		}

		return false;
	}

	find(data, root = this.root) {
		if (!root) {
			return this;
		}

		const values = this.memoify(data);

		let stack = [root];

		while (stack.length) {
			let node = stack.pop();

			for (let value of values) {
				if (this.memoize[value] && this.has(node, this.memoize[value])) {
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
