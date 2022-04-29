import axios, {
	Axios,
	AxiosRequestConfig,
	AxiosResponse,
	AxiosResponseHeaders,
} from 'axios';
import { Observable } from 'rxjs';
import { WritableStream } from 'htmlparser2/lib/WritableStream';

import { Context, Options } from './types';
import { MAX_RETRIES, RegularExpression } from './constants';
import Parse from './Parse';

import Not from './utils/Not';
import ExistNot from './utils/ExistNot';

export default class Spinney {
	private axiosInstance: Axios;
	private isOverideOn: boolean;
	private isProcessing: boolean;
	private forbidden: Set<string>;
	private href: string;
	private seen: Set<string>;
	private decodeURL: URL;
	private subscriber: any;

	constructor(href: string, options?: Options, config?: AxiosRequestConfig) {
		this.axiosInstance = axios.create(config || { responseType: 'stream' });
		this.isOverideOn = !!options?.overide;
		this.isProcessing = false;
		this.forbidden = new Set();
		this.seen = new Set();
		this.href = href;
		this.decodeURL = new URL(href);
		this.subscriber;
	}

	private async _setUp(hrefs: string[]): Promise<void> {
		if (this.isEmpty(hrefs)) {
			this.subscriber.complete();
			this.pause();
			return;
		}

		if (this.isProcessing) {
			const nextHrefs: string[] = await Promise.all(
				hrefs.filter(Boolean).map(href => this.httpXMLOrDocument(href))
			);
			await this._setUp(nextHrefs.flat(1));
		}
	}

	private async setUp(): Promise<void> {
		try {
			const context = await this.httpText('/robots.txt');

			this.setForbidden(context);
			this.resume();

			const hrefs = Array(
				context.isSiteMap ? context.site : this.decodeURL.origin
			);

			await this._setUp(hrefs);
		} catch {}
	}

	setForbidden({ forbidden }: { forbidden: Set<string> }) {
		this.forbidden = forbidden;
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
		return Not(Array.isArray(data)) || data.length === 0;
	}

	spin(keys: string | string[]): Observable<any> {
		if (ExistNot(keys)) {
			throw this.newError(this.spin, keys);
		}

		return new Observable(subscriber => {
			this.subscriber = subscriber;

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
			if (Not(index === -1)) {
				return this.getRegExp(testPathName.slice(index)).test(basePathName);
			}
			return this.getRegExp(testPathName).test(basePathName);
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
		if (Not(this.seen.has(href))) {
			this.seen.add(href);
			return this._isForbidden(href);
		}
		return false;
	}

	getURL(pathname: string): string {
		if (Not(typeof pathname === 'string')) {
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
			if (URL && this.isOrigin(URL)) {
				originURLs.push(URL);
			}
		}

		return originURLs;
	}

	async httpText(pathname: string): Promise<void | any> {
		try {
			const resp = await this.axiosInstance.get(this.getURL(pathname));

			if (Not(resp.status === 200)) {
				return Promise.reject();
			}

			const parse = new Parse();
			return new Promise(resolve =>
				resp.data
					.on('data', (chunk: Buffer) => {
						for (const line of String(chunk).split(/\r?\n/)) {
							parse.onLine(line);
						}
					})
					.on('end', () => resolve(parse.onEnd()))
			);
		} catch (error) {
			this.subscriber.error(error);
			this.pause();
		}
	}

	isHeaderXML(headers: AxiosResponseHeaders): boolean {
		const isXML = (header: string) => Not(header.indexOf('xml') === -1);

		if (headers['Content-Type']) {
			return isXML(headers['Content-Type']);
		}

		if (headers['content-type']) {
			return isXML(headers['content-type']);
		}

		return false;
	}

	async httpXMLOrDocument(href: string): Promise<any> {
		let retryAttempts = 0;

		try {
			const retry: () => Promise<this | any[] | undefined> = async () => {
				const { data, headers, status } = await this.axiosInstance.get(href);

				try {
					const context: Context = { href };

					const hrefs: string[] = [];
					const nodes: string[] = [];

					if (Not(status === 200)) {
						throw new Error();
					}

					if (this.isHeaderXML(headers)) {
						return Promise.resolve(undefined);
					}

					const writeStream = new WritableStream({
						onattribute(name, value) {
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
					});

					return new Promise(resolve =>
						data.pipe(writeStream).on('finish', () => {
							this.subscriber.next(context);
							resolve(this.getOriginURL(hrefs));
						})
					);
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
								await new Promise(resolve => {
									setTimeout(resolve, 500);
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
