import { Handler, Parser } from 'htmlparser2/lib/Parser';

export { Handler, Parser };

export default class WritableStreamHandler implements Handler {
	public context: any;
	private cbs: any;

	constructor(cbs: any) {
		this.cbs = cbs ?? {};
		this.context = { hrefs: [] };
	}

	onattribute(name: string, value: string, quote?: string | undefined | null) {
		switch (name) {
			case 'href':
				this.context.hrefs.push(value);
				break;
		}
		this.cbs.onattribute?.(name, value, quote);
	}

	onparserinit(parser: Parser) {
		this.cbs.onparserinit?.(parser);
	}

	onreset() {
		this.cbs.onreset?.();
	}

	onend() {
		this.cbs.onend?.();
	}

	onerror(error: Error) {
		this.cbs.onerror?.(error);
	}

	onclosetag(name: string, isImplied: boolean) {
		this.cbs.onclosetag?.(name, isImplied);
	}

	onopentagname(name: string) {
		this.cbs.onopentagname?.(name);
	}

	onopentag(
		name: string,
		attribs: {
			[s: string]: string;
		},
		isImplied: boolean
	) {
		this.cbs.onopentag?.(name, attribs, isImplied);
	}

	ontext(data: string) {
		this.cbs.ontext?.(data);
	}

	oncomment(data: string) {
		this.cbs.oncomment?.(data);
	}

	oncdatastart() {
		this.cbs.oncdatastart?.();
	}

	oncdataend() {
		this.cbs.oncdataend?.();
	}

	oncommentend() {
		this.cbs.oncommentend?.();
	}

	onprocessinginstruction(name: string, data: string) {
		this.cbs.onprocessinginstruction?.(name, data);
	}
}
