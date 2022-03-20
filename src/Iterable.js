export class Iterable {
	constructor(data) {
		this.data = data;
	}

	[Symbol.iterator]() {
		let index = 0;

		return {
			next: () => {
				if (index < this.data.length) {
					return { value: this.data[index++], done: false };
				} else {
					return { done: true };
				}
			},
		};
	}
}
