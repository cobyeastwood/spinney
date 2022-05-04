import { StringDecoder } from 'string_decoder';

export default class StringWriter {
	string: any;
	decode: StringDecoder;

	constructor() {
		this.string = new String();
		this.decode = new StringDecoder();
	}

	isBuffer(encoding: string): boolean {
		return encoding === 'buffer';
	}

	write(chunk: any, encoding: string) {
		if (this.isBuffer(encoding)) {
			this.string += this.decode.write(chunk);
		} else {
			this.string += chunk;
		}
	}

	final() {
		this.string += this.decode.end();
	}
}
