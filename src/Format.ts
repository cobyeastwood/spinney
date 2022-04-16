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

			const format = node?.data?.split(' ').reduce((acc: any, word: string) => {
				acc[word] = word;
				return acc;
			}, {});

			this.data[node.getId()] = format;
		}
	}

	toJSON() {
		return JSON.stringify(this.data);
	}
}
