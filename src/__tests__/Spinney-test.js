import { Observable } from 'rxjs';
import Spinney from '..';

describe('Spinney class', () => {
	it('spin should return an error', () => {
		const spinney = new Spinney('https://www.example.com/');

		expect(() => spinney.spin()).toThrow();
	});
	it('spin should return an observable instance', () => {
		const spinney = new Spinney('https://www.example.com/');

		expect(spinney.spin('keys') instanceof Observable).toEqual(true);
	});
});
