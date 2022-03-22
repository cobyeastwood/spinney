import { Iterable } from '..';

describe('Iterable class', () => {
	it('should accept an array and return an interable instance', () => {
		const iterable = new Iterable([1, 2, 3]);

		expect(typeof iterable[Symbol.iterator]).toEqual('function');
	});
});
