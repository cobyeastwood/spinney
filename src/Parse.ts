import { parseStringPromise } from 'xml2js';
import { RegularExpression } from './constants';
import Not from './utils/Not';

export class ParseXML {
	sites: string[];

	constructor() {
		this.sites = [];
	}

	async write(data: any, options = {}): Promise<void> {
		try {
			const raw = await parseStringPromise(data, options);

			if (raw?.sitemapindex?.sitemap) {
				for (const site of raw.sitemapindex.sitemap) {
					if (site.loc[0]) {
						this.sites.push(site.loc[0]);
					}
				}
			} else if (raw?.urlset?.url) {
				for (const site of raw.urlset.url) {
					if (site.loc[0]) {
						this.sites.push(site.loc[0]);
					}
				}
			}
		} catch {}
	}

	end() {
		const endOutput = {
			sites: this.sites,
		};

		Object.assign(this, new ParseXML());

		return endOutput;
	}
}

export class ParseText {
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

	write(chunk: Buffer): void {
		const newLines = new String(chunk).split(RegularExpression.NewLine);

		for (const newLine of newLines) {
			this.onSiteMap(newLine);
			this.onUserAgent(newLine);
			this.onDisallow(newLine);
		}
	}

	end() {
		const endOutput = {
			forbidden: this.forbidden,
			site: this.site,
			isSiteMap: this.isSiteMap,
		};

		Object.assign(this, new ParseText());

		return endOutput;
	}
}
