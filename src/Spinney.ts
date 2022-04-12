import axios from 'axios'; // replace with npm follow-redirects?
import { Observable } from 'rxjs';
import { ParseDocument } from './Parse';

import { MAX_RETRIES, RegularExpression } from './constants';

export default class Spinney {
	private disallows: Set<string>;
	private siteMap: string[];
	private seen: Set<string>;
	private subscriber: any;
	private processing: boolean | undefined;
	private href: string;
	private keys: string[];
	private takeDisallow: boolean;

	constructor(href: string) {
		this.takeDisallow = false;
		this.disallows = new Set();
		this.siteMap = [];
		this.seen = new Set();
		this.href = href;
		this.subscriber;
		this.keys = [];
	}

	toArray(data: any) {
		if (Array.isArray(data)) {
			return data;
		}
		return [data];
	}

	isEmpty(data: any) {
		return !Array.isArray(data) || data.length === 0;
	}

	resume() {
		this.processing = true;
	}

	pause() {
		this.processing = false;
	}

	spin(keys: string | string[]): Observable<any> {
		if (!keys) {
			throw new Error(`spin expected parameter keys not to be ${typeof keys}`);
		}

		this.keys = this.toArray(keys);

		const { origin } = new URL(this.href);

		return new Observable(subscriber => {
			this.subscriber = subscriber;

			this.getRobotsText(origin);

			this.resume();
			this.next([origin]);

			return () => {
				this.pause();
			};
		});
	}

	findOriginHref(href: string): string | undefined {
		const decodedURL = new URL(href);

		if (href.startsWith('/')) {
			decodedURL.pathname = href;
			const originHref = decodedURL.toString();

			// todo: if in robots.txt

			if (this.disallows.has(href)) {
				// todo: check
			}

			if (href.indexOf('cdn') !== -1) {
				return undefined;
			}

			if (href.indexOf('assets') !== -1) {
				return undefined;
			}

			if (!this.seen.has(originHref)) {
				this.seen.add(originHref);
				return originHref;
			}
		}

		if (href.startsWith(decodedURL.origin)) {
			if (!this.seen.has(href)) {
				this.seen.add(href);
				return href;
			}
		}

		return undefined;
	}

	findSiteMap(text: string): void {
		const siteMap = text.match(RegularExpression.SiteMap);

		if (siteMap) {
			// todo: parse
			this.siteMap = siteMap;
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
				const idx = matchedDisallow.indexOf('/');
				this.disallows.add(matchedDisallow.slice(idx));
			} else {
				this.takeDisallow = false;
			}
		}
	}

	async getRobotsText(origin: string): Promise<void> {
		try {
			const resps = await axios.get(origin.concat('/robots.txt'));

			if (resps.status === 200) {
				const robotsText = resps.data.match(RegularExpression.NewLine);

				if (robotsText) {
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

			const findOriginHrefs = (hrefs: string[]): any[] => {
				return hrefs
					.map((href: string) => this.findOriginHref(href))
					.filter(Boolean);
			};

			const retry: () => Promise<this | any[] | undefined> = async () => {
				try {
					const resps = await axios.get(href);
					const parse = new ParseDocument(resps.data);

					if (this.siteMap) {
						const { data } = parse.find(this.keys);
						this.subscriber.next({ href, data });
						return findOriginHrefs(this.siteMap);
					} else {
						const { data, hrefs } = parse.find(this.keys, 'href');
						this.subscriber.next({ href, data });
						return findOriginHrefs(hrefs);
					}
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

	private async next(hrefs: string[]): Promise<void> {
		if (this.isEmpty(hrefs)) {
			this.subscriber.complete();
			this.pause();
			return;
		}

		if (this.processing) {
			const nextHrefs: string[] = await Promise.all(
				hrefs.map(href => this.fetch(href))
			);
			await this.next(nextHrefs.flat(1));
		}
	}
}
