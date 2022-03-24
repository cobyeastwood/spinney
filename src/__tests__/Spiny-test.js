import { Observable } from 'rxjs';
import Spiny from '..';

describe('Spiny class', () => {
	it('spiny should return an observable instance', () => {
		const spiny = new Spiny('https://www.marucoffee.com/');

		expect(spiny.spin('keys') instanceof Observable).toEqual(true);
	});
	it('spin should return an error', () => {
		const spiny = new Spiny('https://www.marucoffee.com/');

		expect(() => spiny.spin()).toThrow();
	});
	it('spin should return an observable instance', () => {
		const spiny = new Spiny('https://www.marucoffee.com/');

		expect(spiny.spin('keys') instanceof Observable).toEqual(true);
	});
});
