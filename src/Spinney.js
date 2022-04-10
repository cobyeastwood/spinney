import axios from 'axios';
import { Observable } from 'rxjs';
import { Parse } from './Parse';

const MAX_RETRIES = 5;

class Spinney {
	constructor(href) {
		this.seen = new Set();
		this.href = href;
		this.data = [];
		this.subscriber;
		this.keys = [];
	}

	processing;

	resume() {
		this.processing = true;
	}

	pause() {
		this.processing = false;
	}

	spin(keys) {
		if (!keys) {
			throw new Error(`spin expected parameter keys not to be ${typeof keys}`);
		}

		this.keys = keys;

		return new Observable(subscriber => {
			this.subscriber = subscriber;

			this.resume();
			this.next([this.href]);

			return () => {
				this.pause();
			};
		});
	}

	isEmpty(hrefs) {
		return !Array.isArray(hrefs) || hrefs.length === 0;
	}

	findOriginHref(href) {
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

	timeout(ms) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	async fetch(href) {
		try {
			let retryAttempts = 0;

			const retry = async () => {
				try {
					const resps = await axios.get(href);
					const parse = new Parse(resps.data);

					const { data, hrefs } = parse.find(this.keys, 'href');

					const originHrefs = hrefs
						.map(href => this.findOriginHref(href))
						.filter(Boolean);

					this.subscriber.next({ href, data });

					return originHrefs;
				} catch (error) {
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

	async next(hrefs) {
		if (this.isEmpty(hrefs)) {
			this.subscriber.complete();
			this.pause();
			return;
		}

		if (this.processing) {
			const nextHrefs = await Promise.all(hrefs.map(href => this.fetch(href)));
			await this.next(...nextHrefs);
		}
	}
}

export { Spinney };
