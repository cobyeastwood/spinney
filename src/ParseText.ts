import { RegularExpression } from './constants';

export default class ParseText {
	href: string;
	data: string[];
	isParsing: boolean;
	isSiteMap: boolean;

	constructor(data: any) {
		this.href = '';
		this.data = [];
		this.isSiteMap = false;
		this.isParsing = false;

		this.setUp(data);
	}

	private setUp(data: string[]) {
		for (const text of data) {
			this.findSiteMap(text);
			this.findUserAgent(text);
			this.findDisallow(text);
		}
	}

	findSiteMap(text: string): void {
		if (RegularExpression.SiteMap.test(text)) {
			const index = text.indexOf('http');
			if (index !== -1) {
				this.isSiteMap = true;
				this.href = text.slice(index);
			}
		}
	}

	findUserAgent(text: string): void {
		if (RegularExpression.UserAgent.test(text)) {
			if (text.indexOf('*') !== -1) {
				this.isParsing = true;
			}
		}
	}

	findDisallow(text: string): void {
		if (this.isParsing) {
			if (RegularExpression.Disallow.test(text)) {
				const index = text.indexOf('/');
				if (index !== -1) {
					this.data.push(text.slice(index));
				}
			} else {
				this.isParsing = false;
			}
		}
	}
}
