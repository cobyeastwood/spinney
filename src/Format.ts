import { NodeElement } from './types';
import { RegularExpression } from './constants';

export default class Format {
	data: any;

	constructor(nodes: NodeElement[]) {
		this.data = {};
		this.setUp(nodes);
	}

	private setUp(nodes: NodeElement[]) {
		for (const node of nodes) {
			if (this.data[node.getId()]) {
				return this.data[node.getId()];
			}

			const format = node?.data?.split(' ').reduce((acc: any, word: string) => {
				const key = this.getKey(word);

				if (key) {
					if (acc[key]) {
						acc[key].push(word);
					} else {
						acc[key] = [word];
					}
				}

				return acc;
			}, {});

			this.data[node.getId()] = format;
		}
	}

	getKey(word: string): string {
		return word
			.trim()
			.replace(RegularExpression.SpecialCharachter, '_')
			.toLowerCase();
	}

	getNodes() {
		return this.data;
	}

	toJSON() {
		return JSON.stringify(this.data);
	}
}
