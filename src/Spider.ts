import axios from 'axios';
import { Observable } from 'rxjs';
import { Parse } from './Parse';

const MAX_RETRIES = 5;
const DISALLOWEDS = new Set();

class Spider {
	private seen: Set<string>;
	private subscriber: any;
	private processing: boolean | undefined;
	private href: string;
	private keys: string[];

	constructor(href: string) {
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

	protected resume() {
		this.processing = true;
	}

	protected pause() {
		this.processing = false;
	}

	spin(keys: string | string[]): Observable<any> {
		if (!keys) {
			throw new Error(`spin expected parameter keys not to be ${typeof keys}`);
		}

		this.keys = this.toArray(keys);

		const { origin } = this.decode(this.href);

		return new Observable(subscriber => {
			this.subscriber = subscriber;

			this.robotsTxt(origin);

			this.resume();
			this.next([origin]);

			return () => {
				this.pause();
			};
		});
	}

	protected decode(href: string): URL {
		return new URL(href);
	}

	protected findOriginHref(href: string): string | undefined {
		const decoded = this.decode(href);

		if (href.startsWith('/')) {
			decoded.pathname = href;
			const originHref = decoded.toString();

			// todo: if in robots.txt

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

		if (href.startsWith(decoded.origin)) {
			if (!this.seen.has(href)) {
				this.seen.add(href);
				return href;
			}
		}

		return undefined;
	}

	protected timeout(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	protected async robotsTxt(origin: string): Promise<void> {
		try {
			const resps = await axios.get(origin.concat('/robots.txt'));

			if (resps.status === 200) {
				const robotsTxt = resps.data.match(/[^\r\n]+/g);
	
				if (robotsTxt) {
					let takeNext;
	
					for (let txt of robotsTxt) {
						let useragent = '';
						if ((useragent = txt.match(/^([Uu]ser-agent:) (.+)$/))) {
							if (useragent.indexOf('*')) {
								takeNext = true;
							}
							continue;
						}
	
						if (takeNext) {
							let disallow = '';
							if ((disallow = txt.match(/^([Dd]isallow:) (\/.+)$/))) {
								const idx = disallow.indexOf('/');
								DISALLOWEDS.add(disallow.slice(idx)[0]);
							}
						}
					}
				}
			}
		} catch (error) {
			this.subscriber.error(error);
			this.pause();
		}

	}

	private async fetch(href: any): Promise<any> {
		try {
			let retryAttempts = 0;

			const retry: () => Promise<this | any[] | undefined> = async () => {
				try {
					const resps = await axios.get(href);
					const parse = new Parse(resps.data);

					const { data, hrefs } = parse.find(this.keys, 'href');

					const originHrefs = hrefs
						.map((href: string) => this.findOriginHref(href))
						.filter(Boolean);

					this.subscriber.next({ href, data });

					return originHrefs;
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
								await this.timeout(500);
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

export { Spider };
