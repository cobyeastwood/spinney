import { parseStringPromise } from 'xml2js';

export default class ParseXML {
	context: { sites: string[] };

	constructor() {
		this.context = { sites: [] };

		this.promise = this.promise.bind(this);
		this.reset = this.reset.bind(this);
		this.write = this.write.bind(this);
		this.end = this.end.bind(this);
	}

	promise(data: string): Promise<any> {
		return new Promise(async (resolve, reject) => {
			try {
				await this.write(data);
				resolve(this.end());
			} catch (error) {
				reject(error);
			}
		});
	}

	reset() {
		Object.assign(this, new ParseXML());
	}

	async write(data: string, options?: any): Promise<void> {
		try {
			const raw = await parseStringPromise(data, options);

			if (raw?.sitemapindex?.sitemap) {
				for (const site of raw.sitemapindex.sitemap) {
					if (site?.loc?.[0]) {
						this.context.sites.push(site.loc[0]);
					}
				}
			} else if (raw?.urlset?.url) {
				for (const site of raw.urlset.url) {
					if (site?.loc?.[0]) {
						this.context.sites.push(site.loc[0]);
					}
				}
			}
		} catch (error) {
			throw error;
		}
	}

	end() {
		const endOutput = this.context;

		this.reset();

		return endOutput;
	}
}
