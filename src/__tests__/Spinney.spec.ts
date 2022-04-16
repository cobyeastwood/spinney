import { Observable } from 'rxjs';
import Spinney from '../Spinney';

describe('Spinney class', () => {
	it('isMatch should see if a provided path matches a RegExp base path', () => {
		const spinney = new Spinney('https://www.example.com/');

		let isMatch;

		isMatch = spinney.isMatch(
			'/*/collections/name',
			'https://www.example.com/dontdoit/collections/name'
		);

		expect(isMatch).toBe(true);

		isMatch = spinney.isMatch(
			'/*/collections/name',
			'https://www.example.com/dontdoit/collections'
		);

		expect(isMatch).toBe(false);
	});
	it('spin should return an error on empty input', () => {
		const spinney = new Spinney('https://www.example.com/');

		expect(() => spinney.spin('')).toThrow();
	});
	it('spin should return an observable instance', () => {
		const spinney = new Spinney('https://www.example.com/');

		expect(spinney.spin('keys') instanceof Observable).toEqual(true);
	});
});
