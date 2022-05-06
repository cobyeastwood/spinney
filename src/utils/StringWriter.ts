import { StringDecoder } from 'string_decoder';

export default class StringWriter {
	string: any;
	decode: StringDecoder;

	constructor() {
		this.string = String();
		this.decode = new StringDecoder();
	}

	write(chunk: any, encoding: string) {
		if (encoding === 'buffer') {
			this.string += this.decode.write(chunk);
		} else {
			this.string += chunk;
		}
	}

	final() {
		this.string += this.decode.end();
	}
}
