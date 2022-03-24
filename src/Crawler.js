import axios from 'axios';
import { Observable } from 'rxjs';
import { Parse } from './Parse';

class Crawler {
	constructor(href) {
		this.seen = new Set();
		this.href = href;
		this.data = [];
		this.subscriber;
		this.keys = [];
	}

	begin(keys) {
		return new Observable(subscriber => {
			this.subscriber = subscriber;
			this.keys = keys;
			this.next([this.href]);
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

	async fetch(href) {
		try {
			const resps = await axios.get(href);
			const parse = new Parse(resps.data);

			const { data, hrefs } = parse.find(this.keys, 'href');

			const originHrefs = hrefs
				.map(href => this.findOriginHref(href))
				.filter(Boolean);

			this.subscriber.next({ href, data });

			return originHrefs;
		} catch (e) {
			if (e?.response?.status) {
				switch (e.response.status) {
					case 404:
						break;
					default:
						this.subscriber.error(e);
						break;
				}
			} else {
				this.subscriber.error(e);
			}
		}
	}

	async next(hrefs) {
		if (this.isEmpty(hrefs)) {
			this.subscriber.complete();
			return;
		}

		const nextHrefs = await Promise.all(hrefs.map(href => this.fetch(href)));

		await this.next(...nextHrefs);
	}
}

export { Crawler };
