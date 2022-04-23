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
	private noFetchPaths: string[];
	private href: string;
	private seen: Set<string>;
	private decodedURL: URL;
	private subscriber: any;
	private keys: string[];

	constructor(href: string, options?: Options) {
		this.isOverideOn = !!options?.overide;
		this.isSiteMap = false;
		this.siteMap = '';
		this.isProcessing = false;
		this.noFetchPaths = [];
		this.seen = new Set();
		this.href = href;
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
				hrefs.filter(Boolean).map(href => this.fetchXMLOrDocument(href))
			);
			await this._setUp(nextHrefs.flat(1));
		}
	}

	private async setUp(): Promise<void> {
		await this.fetchText('/robots.txt');

		let href;

		if (this.isSiteMap) {
			href = this.siteMap;
		} else {
			href = this.decodedURL.origin;
		}

		await this._setUp([href]);
	}

	newError(method: Function, parameter: any) {
		return new Error(
			`${method.name} received unexpected parameter of type ${typeof parameter}`
		);
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
			throw this.newError(this.spin, keys);
		}

		this.keys = this.toArray(keys);

		return new Observable(subscriber => {
			this.subscriber = subscriber;

			this.resume();
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

	readIsMatch(href: string): boolean {
		if (this.isOverideOn) {
			return true;
		}

		for (const path of this.noFetchPaths) {
			if (this.isMatch(path, href)) {
				return false;
			}
		}

		return true;
	}

	canFetch(href: string): boolean {
		if (!this.seen.has(href)) {
			this.seen.add(href);
			return this.readIsMatch(href);
		}
		return false;
	}

	getURL(pathname: string): string {
		if (!(typeof pathname === 'string')) {
			throw this.newError(this.getURL, pathname);
		}

		if (pathname.startsWith('/')) {
			const newURL = new URL(this.href, this.decodedURL);
			if (pathname.charAt(1) === '/') {
				newURL.pathname = pathname.slice(1);
			} else {
				newURL.pathname = pathname;
			}
			return newURL.toString();
		}

		return pathname;
	}

	isOrigin(href: string): boolean {
		try {
			const decodedURL = new URL(href);

			if (decodedURL.hostname.startsWith(this.decodedURL.hostname)) {
				return this.canFetch(decodedURL.toString());
			}

			if (decodedURL.origin.startsWith(this.decodedURL.origin)) {
				return this.canFetch(decodedURL.toString());
			}
		} catch {}

		return false;
	}

	getOriginURL(hrefs: string[]): any[] {
		return hrefs
			.map(href => this.getURL(href))
			.filter(href => href && this.isOrigin(href));
	}

	isOnce = true;

	async fetchText(pathname: string): Promise<void> {
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

					if (this.isOnce) {
						this.isOnce = false;
						this.noFetchPaths = txt.data;
					}
				}
			}
		} catch (error) {
			this.subscriber.error(error);
			this.pause();
		}
	}

	isXML({ headers }: AxiosResponse): boolean {
		const isHeaderXML = (header: string) =>
			header.indexOf('application/xml') !== -1;

		if (headers['Content-Type']) {
			return isHeaderXML(headers['Content-Type']);
		}

		if (headers['content-type']) {
			return isHeaderXML(headers['content-type']);
		}

		return false;
	}

	async fetchXMLOrDocument(href: string): Promise<any> {
		try {
			let retryAttempts = 0;

			const context: Context = { href };

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
					return this.getOriginURL(context.hrefs);
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
