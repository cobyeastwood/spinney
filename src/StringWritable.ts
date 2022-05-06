import { Writable } from 'stream';
import { StringDecoder } from 'string_decoder';

export default class StringWritable extends Writable {
	string: any;
	decode: StringDecoder;

	constructor() {
		super({ decodeStrings: false });

		this.string = String();
		this.decode = new StringDecoder();
	}

	override _write(
		chunk: Buffer | string,
		encoding: string,
		cb: () => void
	): void {
		if (encoding === 'buffer') {
			this.string += this.decode.write(chunk as Buffer);
		} else {
			this.string += chunk;
		}
		cb();
	}

	override _final(cb: () => void): void {
		this.string += this.decode.end();
		cb();
	}
}
