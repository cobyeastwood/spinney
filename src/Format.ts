import { NodeElement } from './types';

export default class Format {
	data: any;

	constructor(nodes: NodeElement[]) {
		this.data = {};
		this.setUp(nodes);
		return this.data;
	}

	setUp(nodes: NodeElement[]) {
		for (const node of nodes) {
			if (this.data[node.getId()]) {
				return;
			}

			const format = Object.keys(node).reduce((acc: any, curr: string) => {
				acc[curr] = curr;
				return acc;
			}, {});

			this.data[node.getId()] = format;
		}
	}

	toJSON() {
		return JSON.stringify(this.data);
	}
}
