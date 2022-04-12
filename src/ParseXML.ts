import { parseStringPromise } from 'xml2js';
import { Site, SiteMapOuput } from './types';

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

	private _findHrefs(output: SiteMapOuput): Site {
		const hrefs: string[] = [];

		if (output?.sitemapindex?.sitemap) {
			for (let site of output.sitemapindex.sitemap) {
				let href;
				if (([href] = site.loc)) {
					hrefs.push(href);
				}
			}
		}

		return { hrefs };
	}

	async findHrefs(): Promise<Site> {
		if (this.isWaiting) {
			await this.setUpPromise;
		}
		return this._findHrefs(this.setUpOutput);
	}
}