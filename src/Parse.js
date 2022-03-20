import htmlparser2 from 'htmlparser2';
import { Iterable } from 'Iterable';

class Parse {
	constructor(options) {
		this.root = null;
		this.seen = new Set();

		this.memoize = {};
		this.adjacency = new Map();

		this.setUp(options);
	}

	setUp({ data, options }) {
		if (typeof Buffer !== 'undefined' && Buffer.isBuffer(data)) {
			data = data.toString();
		}

		if (typeof data === 'string') {
			this.root = htmlparser2.parseDocument(data, options);
		}
	}

	getAdjacency() {
		return this.adjacency;
	}

	has(node, target) {
		if (!node) {
			return false;
		}

		if (node?.attribs?.href) {
			return node.attribs.href.includes(this.memoize[target]);
		}

		if (node?.data) {
			return node.data.toLowerCase().includes(this.memoize[target]);
		}

		return false;
	}

	arrayify(data) {
		return Array.isArray(data) ? data : [data];
	}

	iterify(data) {
		return new Iterable(data);
	}

	memoify(data) {
		const array = this.arrayify(data);

		array.forEach(value => {
			if (typeof value !== 'string') {
				throw new Error('parameter value must be of type string');
			}

			if (this.memoize[value] === undefined) {
				this.memoize[value] = value.toLowerCase();
			}
		});

		return this.iterify(array);
	}

	find(target, root = this.root) {
		if (!root) {
			return [];
		}

		const targets = this.memoify(target);

		let stack = [root];

		while (stack.length) {
			let node = stack.pop();

			if (!node) {
				continue;
			}

			if (this.seen.has(node)) {
				continue;
			}

			this.seen.add(node);

			for (let target of targets) {
				if (this.has(node, target)) {
					if (this.adjacency.has(target)) {
						this.adjacency.set(target, this.adjacency.get(target).concat(node));
					} else {
						this.adjacency.set(target, [node]);
					}
				}
			}

			if (node.prev) {
				stack.push(node.prev);
			}

			if (node.next) {
				stack.push(node.next);
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
