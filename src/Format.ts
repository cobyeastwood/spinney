import { NodeElement } from './types';

export default class Format {
	data: any;

	constructor(nodes: NodeElement[]) {
		this.data = {};
		this.setUp(nodes);
	}

	setUp(nodes: NodeElement[]) {
		for (const node of nodes) {
			if (this.data[node.getId()]) {
				return this.data[node.getId()];
			}

			const format = node?.data?.split(' ').reduce((acc: any, word: string) => {
				if (acc[word]) {
					acc[word].push(word);
				} else {
					acc[word] = [word];
				}
				return acc;
			}, {});

			this.data[node.getId()] = format;
		}
	}

	getNodes() {
		return this.data;
	}

	toJSON() {
		return JSON.stringify(this.data);
	}
}
