import axios from 'axios';
import { Parse } from './Parse';

async function Crawler(url) {
	try {
		const { data } = await axios.get(url);
		const parse = new Parse(data);

		console.log(parse.findAttrib('href'));
	} catch (e) {}
}

Crawler('https://www.marucoffee.com/');

export { Crawler };
