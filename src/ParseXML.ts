import { parseStringPromise } from 'xml2js';

export default class ParseXML {
	sites: string[];

	constructor() {
		this.sites = [];
	}

	reset() {
		Object.assign(this, new ParseXML());
	}

	async write(data: any, options = {}): Promise<void> {
		try {
			const raw = await parseStringPromise(data, options);

			if (raw?.sitemapindex?.sitemap) {
				for (const site of raw.sitemapindex.sitemap) {
					if (site?.loc?.[0]) {
						this.sites.push(site.loc[0]);
					}
				}
			} else if (raw?.urlset?.url) {
				for (const site of raw.urlset.url) {
					if (site?.loc?.[0]) {
						this.sites.push(site.loc[0]);
					}
				}
			}
		} catch (error) {
			throw error;
		}
	}

	end() {
		const endOutput = this.sites;

		this.reset();

		return endOutput;
	}
}
