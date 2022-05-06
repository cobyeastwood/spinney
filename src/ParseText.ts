import { RegExps } from './constants';
import Not from './utils/Not';

export default class ParseText {
	site: string;
	forbidden: Set<string>;
	isParsing: boolean;
	isSiteMap: boolean;

	constructor() {
		this.site = '';
		this.forbidden = new Set();
		this.isSiteMap = false;
		this.isParsing = false;
	}

	reset() {
		Object.assign(this, new ParseText());
	}

	onSiteMap(line: string): void {
		if (RegExps.SiteMap.test(line)) {
			const index = line.indexOf('http');
			if (Not(index === -1)) {
				this.isSiteMap = true;
				this.site += line.slice(index);
			}
		}
	}

	onUserAgent(line: string): void {
		if (RegExps.UserAgent.test(line)) {
			const index = line.indexOf('*');
			if (Not(index === -1)) {
				this.isParsing = true;
			} else {
				this.isParsing = false;
			}
		}
	}

	onDisallow(line: string): void {
		if (this.isParsing) {
			if (RegExps.Disallow.test(line)) {
				const index = line.indexOf('/');
				if (Not(index === -1)) {
					this.forbidden.add(line.slice(index));
				}
			}
		}
	}

	write(chunk: Buffer): void {
		for (const line of String(chunk).split(RegExps.NewLine)) {
			this.onSiteMap(line);
			this.onUserAgent(line);
			this.onDisallow(line);
		}
	}

	end() {
		const endOutput = {
			forbidden: this.forbidden,
			site: this.site,
			isSiteMap: this.isSiteMap,
		};

		this.reset();

		return endOutput;
	}
}
