import { parseStringPromise } from 'xml2js';
import { RawHrefs, SiteMapOuput } from './types';

export default class ParseXML {
	private isWaiting: boolean = false;
	private setUpOutput: SiteMapOuput;
	private setUpPromise: Promise<any>;

	constructor(data: string) {
		this.setUpOutput;
		this.setUpPromise = this.setUp(data);
	}

	private async setUp(data: string, options = undefined) {
		this.isWaiting = true;

		return await parseStringPromise(data, options).then(value => {
			this.setUpOutput = value;
			this.isWaiting = false;
		});
	}

	private _findHrefs(output: SiteMapOuput): RawHrefs {
		const hrefs: string[] = [];

		if (output?.sitemapindex?.sitemap) {
			let href;
			console.log('sitemap ', output.sitemapindex.sitemap);
			for (const site of output.sitemapindex.sitemap) {
				if (([href] = site.loc)) {
					hrefs.push(href);
				}
			}
		}

		return { hrefs };
	}

	async findHrefs(): Promise<RawHrefs> {
		if (this.isWaiting) {
			await this.setUpPromise;
		}
		return this._findHrefs(this.setUpOutput);
	}
}
