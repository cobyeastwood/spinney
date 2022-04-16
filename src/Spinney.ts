import axios, { AxiosResponse } from 'axios';
import { Observable } from 'rxjs';
import ParseXML from './ParseXML';
import ParseDocument from './ParseDocument';
import ParseText from './ParseText';
import Format from './Format';

import { Context, Options } from './types';
import { MAX_RETRIES, RegularExpression, Attribute } from './constants';

export default class Spinney {
	private isOverideOn: boolean;
	private isSiteMap: boolean;
	private siteMap: string;
	private isProcessing: boolean;
	private noPaths: string[];
	private seen: Set<string>;
	private decodedURL: URL;
	private subscriber: any;
	private keys: string[];

	constructor(href: string, options?: Options) {
		this.isOverideOn = !!options?.overide;
		this.isSiteMap = false;
		this.siteMap = '';
		this.isProcessing = false;
		this.noPaths = [];
		this.seen = new Set();
		this.decodedURL = new URL(href);
		this.subscriber;
		this.keys = [];
	}

	debug(value: any): void {
		console.log(String(value), value);
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
		await this.getText('/robots.txt');

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
		if (RegularExpression.ForwardSlashWord.test(testPathName)) {
			const index = testPathName.indexOf('/');
			if (index === -1) {
				return this.getRegExp(testPathName).test(basePathName);
			}
			return this.getRegExp(testPathName.slice(index)).test(basePathName);
		}
		return false;
	}

	checkIsMatch(href: string): boolean {
		if (this.isOverideOn) {
			return true;
		}

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

	setURL(pathname: string): void {
		this.decodedURL.pathname = pathname;
	}

	getURL(pathname: string): string {
		if (pathname.startsWith('/')) {
			this.setURL(pathname);
			return this.decodedURL.toString();
		}
		return pathname;
	}

	async getText(pathname: string): Promise<void> {
		try {
			const resp: AxiosResponse = await axios.get(this.getURL(pathname));

			if (resp.status === 200) {
				let texts;
				if ((texts = resp.data.match(RegularExpression.NewLine))) {
					const txt = new ParseText(texts);

					this.isSiteMap = txt.isSiteMap;
					this.siteMap = txt.href;

					if (this.isOverideOn) {
						return;
					}

					this.noPaths = txt.data;
				}
			}
		} catch (error) {
			this.subscriber.error(error);
			this.pause();
		}
	}

	isXML({ headers }: AxiosResponse): boolean {
		return headers['content-type'].indexOf('application/xml') !== -1;
	}

	private async fetch(href: string): Promise<any> {
		try {
			let retryAttempts = 0;

			const getOriginURL = (hrefs: string[]): any[] => {
				return hrefs
					.filter(href => this.isOrigin(href))
					.map(href => this.getURL(href));
			};

			const context: Context = {};

			const retry: () => Promise<this | any[] | undefined> = async () => {
				try {
					const resp: AxiosResponse = await axios.get(href);

					if (this.isXML(resp)) {
						const xml = await new ParseXML(resp.data).findHrefs();
						context.hrefs = xml.hrefs;
					} else {
						const doc = new ParseDocument(resp.data).find(
							this.keys,
							Attribute.Href
						);
						context.hrefs = doc.hrefs;
						context.nodes = new Format(doc.nodes).getNodes();
					}

					this.subscriber.next(context);
					return getOriginURL(context.hrefs);
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
