import axios from 'axios'; // replace with npm follow-redirects?
import { Observable } from 'rxjs';
import ParseXML from './ParseXML';
import ParseDocument from './ParseDocument';

import { Context } from './types';
import { MAX_RETRIES, RegularExpression, Attribute } from './constants';

export default class Spinney {
	private isSiteMap: boolean;
	private siteMap: string;
	private isProcessing: boolean;
	private takeDisallow: boolean;
	private noPaths: Set<string>;
	private seen: Set<string>;
	private decodedURL: URL;
	private subscriber: any;
	private keys: string[];

	constructor(href: string) {
		this.isSiteMap = false;
		this.siteMap = '';
		this.isProcessing = false;
		this.takeDisallow = false;
		this.noPaths = new Set();
		this.seen = new Set();
		this.decodedURL = new URL(href);
		this.subscriber;
		this.keys = [];
	}

	private async _setUp(hrefs: string[]): Promise<void> {
		if (this.isEmpty(hrefs)) {
			this.subscriber.complete();
			this.pause();
			return;
		}

		if (this.isProcessing) {
			const nextHrefs: string[] = await Promise.all(
				hrefs.map(href => this.fetch(href))
			);
			await this._setUp(nextHrefs.flat(1));
		}
	}

	async setUp(): Promise<void> {
		await this.getRobotsText(this.decodedURL.origin);

		let href;

		if (this.isSiteMap) {
			href = this.siteMap;
		} else {
			href = this.decodedURL.origin;
		}

		this.resume();
		await this._setUp([href]);
	}

	resume(): void {
		this.isProcessing = true;
	}

	pause(): void {
		this.isProcessing = false;
	}

	toArray(data: any): any[] {
		if (Array.isArray(data)) {
			return data;
		}
		return [data];
	}

	isEmpty(data: any): boolean {
		return !Array.isArray(data) || data.length === 0;
	}

	spin(keys: string | string[]): Observable<any> {
		if (!keys) {
			throw new Error(`spin expected parameter keys not to be ${typeof keys}`);
		}

		this.keys = this.toArray(keys);

		return new Observable(subscriber => {
			this.subscriber = subscriber;
			this.setUp();

			return () => {
				this.pause();
			};
		});
	}

	getRegExp(pathname: string): RegExp {
		return new RegExp(`(.*\.)?${this.decodedURL.hostname}.*(${pathname})`);
	}

	isMatch(testPathName: string, basePathName: string) {
		let pathName;
		if ((pathName = testPathName.match(RegularExpression.ForwardSlashWord))) {
			const [matchedPathName] = pathName;
			const index = matchedPathName.indexOf('/');
			if (index === -1) {
				return this.getRegExp(matchedPathName).test(basePathName);
			}
			return this.getRegExp(matchedPathName.slice(index)).test(basePathName);
		}
		return false;
	}

	checkIsMatch(href: string): boolean {
		for (const noPath of this.noPaths) {
			if (this.isMatch(noPath, href)) {
				return true;
			}
		}
		return false;
	}

	canFetch(href: string): boolean {
		if (!this.seen.has(href)) {
			this.seen.add(href);
			return this.checkIsMatch(href);
		}
		return false;
	}

	isOrigin(href: string): boolean {
		const decodedURL = new URL(href);

		if (href.startsWith('/')) {
			decodedURL.pathname = href;
			return this.canFetch(decodedURL.toString());
		}

		if (href.startsWith(decodedURL.origin)) {
			return this.canFetch(href);
		}

		return false;
	}

	getOriginURL(href: string): string {
		if (href.startsWith('/')) {
			const decodedURL = new URL(href);
			decodedURL.pathname = href;
			return decodedURL.toString();
		}
		return href;
	}

	findSiteMap(text: string): void {
		let siteMap;
		if ((siteMap = text.match(RegularExpression.SiteMap))) {
			const [matchedSiteMap] = siteMap;
			const index = matchedSiteMap.indexOf('http');
			this.siteMap = matchedSiteMap.slice(index);
			this.isSiteMap = true;
		}
	}

	findUserAgent(text: string): boolean {
		let userAgent;
		if ((userAgent = text.match(RegularExpression.UserAgent))) {
			const [matchedUserAgent] = userAgent;
			if (matchedUserAgent.indexOf('*')) {
				this.takeDisallow = true;
			}
			return true;
		}
		return false;
	}

	findDisallow(text: string): void {
		if (this.takeDisallow) {
			let disallow;
			if ((disallow = text.match(RegularExpression.Disallow))) {
				const [matchedDisallow] = disallow;
				const index = matchedDisallow.indexOf('/');
				this.noPaths.add(matchedDisallow.slice(index));
			} else {
				this.takeDisallow = false;
			}
		}
	}

	async getRobotsText(origin: string): Promise<void> {
		try {
			const robotsEndpoint = origin.concat('/robots.txt');
			const resp = await axios.get(robotsEndpoint);

			if (resp.status === 200) {
				let robotsText;
				if ((robotsText = resp.data.match(RegularExpression.NewLine))) {
					for (let text of robotsText) {
						this.findSiteMap(text);

						if (this.findUserAgent(text)) {
							continue;
						}

						this.findDisallow(text);
					}
				}
			}
		} catch (error) {
			this.subscriber.error(error);
			this.pause();
		}
	}

	private async fetch(href: string): Promise<any> {
		try {
			let retryAttempts = 0;

			const extractOriginHrefs = (hrefs: string[]): any[] => {
				return hrefs
					.filter(href => this.isOrigin(href))
					.map(href => this.getOriginURL(href));
			};

			const context: Context = {};

			const retry: () => Promise<this | any[] | undefined> = async () => {
				try {
					const resp = await axios.get(href);

					if (this.isSiteMap) {
						const xml = await new ParseXML(resp.data).findHrefs();
						const doc = new ParseDocument(resp.data).find(this.keys);

						context.hrefs = xml.hrefs;
						context.data = doc.data;
					} else {
						const doc = new ParseDocument(resp.data).find(
							this.keys,
							Attribute.Href
						);

						context.hrefs = doc.hrefs;
						context.data = doc.data;
					}

					this.subscriber.next(context);
					return extractOriginHrefs(context.hrefs);
				} catch (error: any) {
					if (retryAttempts >= MAX_RETRIES) {
						throw error;
					}

					if (error?.response?.status) {
						switch (error.response.status) {
							case 404:
								return;
							default:
								retryAttempts++;
								await new Promise(function (resolve) {
									return setTimeout(resolve, 500);
								});
								return await retry();
						}
					} else {
						throw error;
					}
				}
			};

			return await retry();
		} catch (error) {
			this.subscriber.error(error);
			this.pause();
		}
	}
}
