import { RegularExpression } from './constants';

export default class Parse {
	href: string;
	data: Set<string>;
	isParsing: boolean;
	isSiteMap: boolean;

	constructor() {
		this.href = '';
		this.data = new Set();
		this.isSiteMap = false;
		this.isParsing = false;
	}

	onSiteMap(line: string): void {
		if (RegularExpression.SiteMap.test(line)) {
			const index = line.indexOf('http');
			if (!(index === -1)) {
				this.isSiteMap = true;
				this.href += line.slice(index);
			}
		}
	}

	onUserAgent(line: string): void {
		if (RegularExpression.UserAgent.test(line)) {
			const index = line.indexOf('*');
			if (!(index === -1)) {
				this.isParsing = true;
			} else {
				this.isParsing = false;
			}
		}
	}

	onDisallow(line: string): void {
		if (this.isParsing) {
			if (RegularExpression.Disallow.test(line)) {
				const index = line.indexOf('/');
				if (!(index === -1)) {
					this.data.add(line.slice(index));
				}
			}
		}
	}

	onLine(data: string) {
		this.onSiteMap(data);
		this.onUserAgent(data);
		this.onDisallow(data);
	}

	onEnd() {
		const endOutput = {
			data: this.data,
			href: this.href,
			isSiteMap: this.isSiteMap,
		};

		Object.assign(this, new Parse());

		return endOutput;
	}
}
