import axios, { AxiosResponse } from 'axios';
import { Observable } from 'rxjs';
import { WritableStream } from 'htmlparser2/lib/WritableStream';

import { Context, Options } from './types';
import { MAX_RETRIES, RegularExpression } from './constants';
import Parse from './Parse';

export default class Spinney {
	private isOverideOn: boolean;
	private isDecodeOrigin: boolean;
	private isProcessing: boolean;
	private forbidden: Set<string>;
	private href: string;
	private seen: Set<string>;
	private decodeURL: URL;
	private subscriber: any;
	private axiosConfig: any;

	constructor(href: string, options?: Options) {
		this.isDecodeOrigin = false;
		this.isOverideOn = !!options?.overide;
		this.isProcessing = false;
		this.forbidden = new Set();
		this.seen = new Set();
		this.href = href;
		this.decodeURL = new URL(href);
		this.subscriber;
		this.axiosConfig = { responseType: 'stream' };
	}

	private async _setUp(hrefs: string[]): Promise<void> {
		if (this.isEmpty(hrefs)) {
			this.subscriber.complete();
			this.pause();
			return;
		}

		if (this.isProcessing) {
			const nextHrefs: string[] = await Promise.all(
				hrefs.map(href => href && this.httpXMLOrDocument(href))
			);
			await this._setUp(nextHrefs.flat(1));
		}
	}

	private async setUp(): Promise<void> {
		await this.httpText('/robots.txt');
		await this._setUp([
			this.isDecodeOrigin ? this.decodeURL.toString() : this.decodeURL.origin,
		]);
	}

	setDecodeURL(href: string) {
		this.decodeURL = new URL(href);
	}

	newError(method: Function, parameter: any): Error {
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
		return new RegExp(`(.*\.)?${this.decodeURL.hostname}.*(${pathname})`);
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

	_isForbidden(href: string): boolean {
		if (this.isOverideOn) {
			return true;
		}

		for (const path of this.forbidden) {
			if (this.isMatch(path, href)) {
				return false;
			}
		}

		return true;
	}

	isForbidden(href: string): boolean {
		if (!this.seen.has(href)) {
			this.seen.add(href);
			return this._isForbidden(href);
		}
		return false;
	}

	getURL(pathname: string): string {
		if (!(typeof pathname === 'string')) {
			throw this.newError(this.getURL, pathname);
		}

		if (pathname.startsWith('/')) {
			const newURL = new URL(this.href, this.decodeURL);
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
			const decodeURL = new URL(href);

			if (decodeURL.hostname.startsWith(this.decodeURL.hostname)) {
				return this.isForbidden(decodeURL.toString());
			}

			if (decodeURL.origin.startsWith(this.decodeURL.origin)) {
				return this.isForbidden(decodeURL.toString());
			}
		} catch {}

		return false;
	}

	getOriginURL(hrefs: string[]): any[] {
		const originURLs = [];

		for (const href of hrefs) {
			const URL = this.getURL(href);
			if (URL && this.isOrigin(URL)) originURLs.push(URL);
		}

		return originURLs;
	}

	async httpText(pathname: string): Promise<void> {
		try {
			const axiosInstance = axios.create(this.axiosConfig);
			const resp: AxiosResponse = await axiosInstance.get(
				this.getURL(pathname)
			);

			if (resp.status === 200) {
				const parse = new Parse();

				resp.data
					.on('data', (chunk: Buffer) => {
						const string = chunk.toString();

						for (const line of string.split(/\r?\n/)) {
							parse.onLine(line);
						}
					})
					.on('end', () => {
						const { data, href, isSiteMap } = parse.onEnd();

						this.isDecodeOrigin = isSiteMap;
						this.forbidden = data;
						this.setDecodeURL(href);
					});
			}
		} catch (error) {
			this.subscriber.error(error);
			this.pause();
		}
	}

	isXML({ headers }: AxiosResponse): boolean {
		const isHeaderXML = (header: string) => header.indexOf('xml') !== -1;

		if (headers['Content-Type']) {
			return isHeaderXML(headers['Content-Type']);
		}

		if (headers['content-type']) {
			return isHeaderXML(headers['content-type']);
		}

		return false;
	}

	async httpXMLOrDocument(href: string): Promise<any> {
		try {
			let retryAttempts = 0;

			const context: Context = { href };

			const retry: () => Promise<this | any[] | undefined> = async () => {
				const axiosInstance = axios.create(this.axiosConfig);

				try {
					const hrefs: string[] = [];
					const nodes: string[] = [];

					const resp = await axiosInstance.get(href);

					const options = { xmlMode: this.isXML(resp) };

					const writeStream = new WritableStream(
						{
							onattribute(name, value) {
								if (options.xmlMode) {
									console.log('XML Attribute ', name, value);
								}

								switch (name) {
									case 'href':
										hrefs.push(value);
										break;
								}
							},
							ontext(text) {
								nodes.push(text);
							},
							onend() {
								context.nodes = nodes;
							},
						},
						options
					);

					resp.data.pipe(writeStream).on('finish', () => {
						this.subscriber.next(context);
					});

					return this.getOriginURL(hrefs);
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
								axiosInstance.defaults.timeout = 500;
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
