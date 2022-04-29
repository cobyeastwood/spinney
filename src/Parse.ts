import { RegularExpression } from './constants';
import Not from './utils/Not';

export default class Parse {
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

	onSiteMap(line: string): void {
		if (RegularExpression.SiteMap.test(line)) {
			const index = line.indexOf('http');
			if (Not(index === -1)) {
				this.isSiteMap = true;
				this.site += line.slice(index);
			}
		}
	}

	onUserAgent(line: string): void {
		if (RegularExpression.UserAgent.test(line)) {
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
			if (RegularExpression.Disallow.test(line)) {
				const index = line.indexOf('/');
				if (Not(index === -1)) {
					this.forbidden.add(line.slice(index));
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
			forbidden: this.forbidden,
			site: this.site,
			isSiteMap: this.isSiteMap,
		};

		Object.assign(this, new Parse());

		return endOutput;
	}
}
