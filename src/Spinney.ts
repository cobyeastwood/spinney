import axios, { Axios, AxiosRequestConfig, AxiosResponseHeaders } from 'axios';

import { Writable } from 'stream';
import { WritableStream } from 'htmlparser2/lib/WritableStream';

import { Options } from './types';
import { MAX_RETRIES, RegExps } from './constants';
import { ParseText, ParseXML } from './Parse';

import WritableStreamHandler from './WritableStreamHandler';
import StringWriter from './utils/StringWriter';
import CommonError from './utils/CommonError';
import Not from './utils/Not';
import { Observable, Subscription } from 'rxjs';

function debug(message: string, error?: Error): void {
	console.error(message, error);
}

export default class Spinney extends Observable<any> {
	private handler: any;
	private axiosInstance: Axios;
	private debug: boolean;
	private isOverideOn: boolean;
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

		this.axiosInstance = axios.create(
			Object.assign({ responseType: 'stream' }, config ?? {})
		);
		this.debug = !!options?.debug;
		this.isOverideOn = !!options?.overide;
		this.isProcessing = false;
		this.forbidden = new Set();
		this.seen = new Set();
		this.site = site;
		this.decodeURL = new URL(site);
	}

	override subscribe(options: any): Subscription {
		const { next, error, complete, ...cbs } = options ?? {};
		this.handler = new WritableStreamHandler(cbs);
		return super.subscribe({ next, error, complete });
	}

	private async _setUp(sites: string[]): Promise<void> {
		if (this.isArrayEmpty(sites)) {
			this.subscriber.complete();
			this.pause();
			return;
		}

		if (this.isProcessing) {
			const promises = sites
				.filter(Boolean)
				.map(this.httpXMLOrDocument.bind(this));

			while (promises.length) {
				const sitesBatch = await Promise.all(promises.splice(0, 4));
				await this._setUp(sitesBatch.flat(1));
			}
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
			this.debug ?? debug(this.setUp.name, error as any);
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

	isForbidden(site: string): boolean {
		if (Not(this.seen.has(site))) {
			this.seen.add(site);
			return this._isForbidden(site);
		}
		return false;
	}

	setForbidden({ forbidden }: { forbidden: Set<string> }) {
		this.forbidden = forbidden;
	}

	getURL(pathname: string): string {
		if (Not(typeof pathname === 'string')) {
			throw new CommonError(this.getURL, pathname);
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
			const decodeURL = new URL(site);

			if (decodeURL.hostname.startsWith(this.decodeURL.hostname)) {
				return this.isForbidden(decodeURL.toString());
			}

			if (decodeURL.origin.startsWith(this.decodeURL.origin)) {
				return this.isForbidden(decodeURL.toString());
			}
		} catch (error) {
			this.debug ?? debug(this.isApproved.name, error as any);
		}

		return false;
	}

	getApproved(hrefs: string[]): string[] {
		return hrefs.map(this.getURL.bind(this)).filter(this.isApproved.bind(this));
	}

	async httpText(pathname: string): Promise<any> {
		try {
			const resp = await this.axiosInstance.get(this.getURL(pathname));

			if (Not(resp.status === 200)) {
				return Promise.reject(new CommonError(this.httpText, resp.status));
			}

			const parse = new ParseText();

			await new Promise((resolve, reject) => {
				resp.data
					.on('data', (chunk: Buffer) => parse.write(chunk))
					.on('end', resolve)
					.on('error', reject);
			});

			return parse.end();
		} catch (error) {
			this.debug ?? debug(this.httpText.name, error as any);

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

	async httpXMLOrDocument(site: string): Promise<any> {
		let retries = 0;

		try {
			const retry: () => Promise<any> = async () => {
				try {
					const { data, headers, status } = await this.axiosInstance.get(site);

					if (Not(status === 200)) {
						throw new Error();
					}

					if (this.isHeaderXML(headers)) {
						const writer = new StringWriter();
						return new Promise((resolve, reject) => {
							data
								.pipe(
									new Writable({
										write(chunk, encoding) {
											writer.write(chunk, encoding);
										},
										final(cb) {
											writer.final();
											cb();
										},
									})
								)
								.on('finish', async () => {
									const parse = new ParseXML();
									await parse.write(writer.string);
									return resolve(parse.end());
								})
								.on('error', reject);
						});
					}

					return new Promise((resolve, reject) => {
						data
							.pipe(new WritableStream(this.handler))
							.on('finish', () => {
								const sites = this.handler.context.sites;
								this.subscriber.next(site);
								resolve(this.getApproved(sites));
							})
							.on('error', reject);
					});
				} catch (error: any) {
					if (retries >= MAX_RETRIES) {
						throw error;
					}

					if (error?.response?.status) {
						switch (error.response.status) {
							case 404:
								return;
							default:
								retries++;
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
			this.debug ?? debug(this.httpXMLOrDocument.name, error as any);

			this.subscriber.error(error);
			this.pause();
		}
	}
}
