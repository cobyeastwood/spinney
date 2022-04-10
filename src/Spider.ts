import axios from 'axios';
import { Observable } from 'rxjs';
import { Parse } from './Parse';

const MAX_RETRIES = 5;

class Spider {
	seen: Set<string>;
	href: string;
	data: any[];
	subscriber: any;
	keys: string[];
	processing: boolean | undefined;

	constructor(href: string) {
		this.seen = new Set();
		this.href = href;
		this.data = [];
		this.subscriber;
		this.keys = [];
	}

	toArray(data: any) {
		if (Array.isArray(data)) {
			return data;
		}
		return [data];
	}

	resume() {
		this.processing = true;
	}

	pause() {
		this.processing = false;
	}

	spin(keys: string | string[]) {
		if (!keys) {
			throw new Error(`spin expected parameter keys not to be ${typeof keys}`);
		}

		this.keys = this.toArray(keys);

		return new Observable(subscriber => {
			this.subscriber = subscriber;

			this.resume();
			this.next([this.href]);

			return () => {
				this.pause();
			};
		});
	}

	isEmpty(hrefs: any) {
		return !Array.isArray(hrefs) || hrefs.length === 0;
	}

	findOriginHref(href: string) {
		const decoded = new URL(this.href);

		if (href.startsWith('/')) {
			decoded.pathname = href;
			const originHref = decoded.toString();

			if (href.includes('cdn')) {
				return undefined;
			}

			if (href.includes('assets')) {
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

	timeout(ms: number) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	async fetch(href: any): Promise<any> {
		try {
			let retryAttempts = 0;

			const retry: () => string[] | Promise<this> = async () => {
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

	async next(hrefs: string[]) {
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
