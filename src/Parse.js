import htmlparser2 from 'htmlparser2';

export class Parse {
	constructor(options) {
		this.root = null;
		this.seen = new Set();

		this.elements = [];
		this.adjacency = new Map();

		this.setUp(options);
	}

	setUp({ data, options }) {
		if (typeof Buffer !== 'undefined' && Buffer.isBuffer(data)) {
			data = data.toString();
		}

		if (typeof data === 'string') {
			this.root = htmlparser2.parseDocument(data, options);
			this.transverse(this.root);
		}
	}

	getAdjacency() {
		return this.adjacency;
	}

	find(target) {
		if (typeof target !== 'string') {
			throw new Error('parameter target must be of type string');
		}

		if (this.adjacency.has(target)) {
			return this;
		}

		const targetLowerCased = target.toLowerCase();

		const matches = this.elements.filter(node => {
			if (node?.attribs?.href) {
				return node.attribs.href.includes(targetLowerCased);
			}

			if (node?.data) {
				return node.data.toLowerCase().includes(targetLowerCased);
			}

			return false;
		});

		this.adjacency.set(target, matches);

		return this;
	}

	findByArray(targetArray) {
		if (!Array.isArray(targetArray)) {
			throw new Error('parameter targetArray must be an Array');
		}

		targetArray.forEach(target => this.find(target));

		return this;
	}

	transverse(root = this.root) {
		if (!root) {
			return [];
		}

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
			this.elements.push(node);

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
