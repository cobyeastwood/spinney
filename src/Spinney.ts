import axios, { Axios, AxiosRequestConfig, AxiosResponseHeaders } from 'axios';

import { WritableStream } from 'htmlparser2/lib/WritableStream';
import { Observable, Subscription } from 'rxjs';

import ParseXML from './ParseXML';
import ParseText from './ParseText';
import StringWritable from './StringWritable';
import Not from './utils/Not';

import { MAX_RETRIES, RegExps } from './constants';
import { Options } from './types';

const noop = () => {};

const debug = (error?: Error): void => {
	console.error(error?.message);
};

export default class Spinney extends Observable<any> {
	private cbs: any;
	private axiosInstance: Axios;
	private debug: (error?: Error) => void;
	private isOveride: boolean;
	private isProcessing: boolean;
	private forbidden: Set<string>;
	private site: string;
	private seen: Set<string>;
	private decodeURL: URL;
	private subscriber: any;

	constructor(site: string, options?: Options, config?: AxiosRequestConfig) {
		super((subscriber: any) => {
			this.subscriber = subscriber;
			this.setUp();
		});

		this.cbs = {};
		this.debug = options?.debug ? debug : noop;
		this.isOveride = options?.overide ?? false;
		this.isProcessing = false;
		this.forbidden = new Set();
		this.seen = new Set();
		this.site = site;
		this.decodeURL = new URL(site);

		this.axiosInstance = axios.create(
			Object.assign({ responseType: 'stream' }, config ?? {})
		);
	}

	override subscribe(options: any): Subscription {
		const { next, error, complete, ...cbs } = options ?? {};
		Object.assign(this.cbs, cbs);
		return super.subscribe({ next, error, complete });
	}

	private async _setUp(sites: string[]): Promise<void> {
		try {
			if (this.isArrayEmpty(sites)) {
				this.subscriber.complete();
				this.pause();
				return;
			}

			if (this.isProcessing) {
				if (Not(this.axiosInstance.defaults.timeout === 0)) {
					this.axiosInstance.defaults.timeout = 0;
				}

				const promises = sites
					.filter(Boolean)
					.map(this.httpXMLOrDocument.bind(this));

				while (promises.length) {
					const sitesBatch = await Promise.all(promises.splice(0, 4));
					await this._setUp(sitesBatch.flat(1));
				}
			}
		} catch (error) {
			this.debug?.(error as any);
			this.subscriber.error(error);
		}
	}

	private setUp(): () => void {
		try {
			this.httpText('/robots.txt').then(context => {
				this.setForbidden(context);
				this.resume();

				const sites = Array(
					context.isSiteMap ? context.site : this.decodeURL.origin
				);

				this._setUp(sites);
			});
		} catch (error) {
			this.debug?.(error as any);
			this.subscriber.error(error);
		}

		return () => {
			this.pause();
		};
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

	isArrayEmpty(data: any): boolean {
		return Not(Array.isArray(data)) || data.length === 0;
	}

	isMatch(testPathname: string, basePathname: string): boolean {
		if (RegExps.ForwardSlashWord.test(testPathname)) {
			const index = testPathname.indexOf('/');
			const hostname = this.decodeURL.hostname;

			if (Not(index === -1)) {
				const pathname = testPathname.slice(index);
				return RegExps.getHostnameAndPathname(hostname, pathname).test(
					basePathname
				);
			}

			return RegExps.getHostnameAndPathname(hostname, testPathname).test(
				basePathname
			);
		}
		return false;
	}

	setForbidden({ forbidden }: { forbidden: Set<string> }) {
		this.forbidden = forbidden;
	}

	_isForbidden(href: string): boolean {
		if (this.isOveride) {
			return true;
		}

		for (const path of this.forbidden) {
			if (this.isMatch(path, href)) {
				return false;
			}
		}

		return true;
	}

	isForbidden(site: string): boolean {
		if (Not(this.seen.has(site))) {
			this.seen.add(site);
			return this._isForbidden(site);
		}
		return false;
	}

	getURL(pathname: string): string {
		if (Not(typeof pathname === 'string')) {
			throw new TypeError('pathname is not type string');
		}

		if (pathname.startsWith('/')) {
			const newURL = new URL(this.site);
			if (pathname.charAt(1) === '/') {
				newURL.pathname = pathname.slice(1);
			} else {
				newURL.pathname = pathname;
			}
			return newURL.toString();
		}

		return pathname;
	}

	isApproved(site: string): boolean {
		try {
			if (RegExps.getURL().test(site)) {
				const decodeURL = new URL(site);

				if (decodeURL.hostname.startsWith(this.decodeURL.hostname)) {
					return this.isForbidden(decodeURL.toString());
				}

				if (decodeURL.origin.startsWith(this.decodeURL.origin)) {
					return this.isForbidden(decodeURL.toString());
				}
			}
		} catch (error) {
			this.debug?.(error as any);
			this.subscriber.error(error);
		}

		return false;
	}

	getApproved(hrefs: string[]): string[] {
		return hrefs.map(this.getURL.bind(this)).filter(this.isApproved.bind(this));
	}

	async httpText(pathname: string): Promise<any> {
		try {
			const { data, status } = await this.axiosInstance.get(
				this.getURL(pathname)
			);

			if (Not(status === 200)) {
				throw new Error('status code' + status);
			}

			const parse = new ParseText();

			await new Promise(resolve =>
				data.on('data', parse.write).on('end', resolve)
			);

			return parse.end();
		} catch (error) {
			this.debug?.(error as any);
			this.subscriber.error(error);
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

	async httpXMLOrDocument(site: string): Promise<any> {
		let retries = 0;

		try {
			const retry: () => Promise<any> = async () => {
				try {
					const { data, headers, status } = await this.axiosInstance.get(site);

					if (Not(status === 200)) {
						throw new Error('status code' + status);
					}

					if (this.isHeaderXML(headers)) {
						const writable = new StringWritable();
						const parse = new ParseXML();
						return new Promise((resolve, reject) => {
							data.pipe(writable).on('finish', async () => {
								try {
									await parse
										.promise(writable.string)
										.then(({ sites }) => resolve(sites));
								} catch (error) {
									reject(error);
								}
							});
						});
					}

					return new Promise(resolve => {
						const { onattribute, ...rest } = this.cbs;

						const context = { sites: [] } as any;
						const handler = {
							...rest,
							onattribute: (name: string, value: string, quote?: string) => {
								if (name === 'href') {
									context.sites.push(value);
								}
								onattribute?.(name, value, quote);
							},
						};

						data.pipe(new WritableStream(handler)).on('finish', () => {
							this.subscriber.next(site);
							resolve(this.getApproved(context.sites));
						});
					});
				} catch (error: any) {
					if (retries >= MAX_RETRIES) {
						throw new Error('retries reached maximum' + retries);
					}

					if (error?.response?.status) {
						switch (error.response.status) {
							case 404:
								return Promise.resolve();
							default:
								retries++;
								this.axiosInstance.defaults.timeout = (retries * 1000) / 4;
								return await retry();
						}
					} else {
						throw error;
					}
				}
			};

			return await retry();
		} catch (error) {
			this.debug?.(error as any);
			this.subscriber.error(error);
			this.pause();
		}
	}
}
