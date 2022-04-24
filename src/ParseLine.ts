import { RegularExpression } from './constants';

export default class ParseLine {
	href: string;
	data: string;
	isParsing: boolean;
	isSiteMap: boolean;

	constructor(data: any) {
		this.href = '';
		this.data = '';
		this.isSiteMap = false;
		this.isParsing = false;
		this.setUp(data);
	}

	private setUp(line: string) {
		this.onSiteMap(line);
		this.onUserAgent(line);
		this.onDisallow(line);
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
			if (!(line.indexOf('*') === -1)) {
				this.isParsing = true;
			}
		}
	}

	onDisallow(line: string): void {
		if (this.isParsing) {
			if (RegularExpression.Disallow.test(line)) {
				const index = line.indexOf('/');
				if (!(index === -1)) {
					this.data += line.slice(index);
				}
			} else {
				this.isParsing = false;
			}
		}
	}
}
