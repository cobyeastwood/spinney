import { Observable } from 'rxjs';
import Spider from '..';

describe('Spider class', () => {
	it('spin should return an error on empty input', () => {
		const spider = new Spider('https://www.example.com/');

		expect(() => spider.spin()).toThrow();
	});
	it('spin should return an observable instance', () => {
		const spider = new Spider('https://www.example.com/');

		expect(spider.spin('keys') instanceof Observable).toEqual(true);
	});
});
