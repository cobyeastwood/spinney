const htmlparser2 = require('htmlparser2');

export class Parse {
	constructor(options) {
		this.root = null;
		this.seen = new Set();

		this.setUp(options);
	}

	setUp({ data, options }) {
		if (typeof Buffer != 'undefined' && Buffer.isBuffer(data)) {
			this.root = data.toString();
			return;
		}

		if (typeof data === 'string') {
			this.root = htmlparser2.parseDocument(data, options);
			return;
		}
	}

	find(target, root = this.root) {
		return this.transverse(root).filter(node => node.type === target);
	}

	transverse(root) {
		let elements = [];
		let stack = [root];

		while (stack.length) {
			let node = stack.pop();

			if (!node || !node.type) {
				continue;
			}

			if (this.seen.has(node)) {
				continue;
			}

			this.seen.add(node);
			elements.push(node);

			if (node.prev) {
				stack.push(this.transversePrev(node.prev));
			}

			if (node.next) {
				stack.push(this.transverseNext(node.next));
			}

			for (let key in node.children) {
				stack.push(node.children[key]);
			}
		}

		return elements;
	}

	transversePrev(element) {
		let neighbors = [];

		while (element.prev) {
			neighbors.push(element);
			element = element.prev;
		}

		return neighbors;
	}

	transverseNext(element) {
		let neighbors = [];

		while (element.next) {
			neighbors.push(element);
			element = element.next;
		}

		return neighbors;
	}
}
