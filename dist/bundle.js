(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('htmlparser2'), require('axios'), require('rxjs')) :
	typeof define === 'function' && define.amd ? define(['exports', 'htmlparser2', 'axios', 'rxjs'], factory) :
	(global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.Spinney = {}, global.htmlparser2, global.axios, global.rxjs));
})(this, (function (exports, htmlparser2, axios, rxjs) { 'use strict';

	function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

	var axios__default = /*#__PURE__*/_interopDefaultLegacy(axios);

	class Iterable {
		constructor(data) {
			this.data = data;
		}

		[Symbol.iterator]() {
			let index = 0;

			return {
				next: () => {
					if (index < this.data.length) {
						return { value: this.data[index++], done: false };
					} else {
						return { done: true };
					}
				},
			};
		}
	}

	class Parse {
		constructor(data, options = {}) {
			this.root = null;

			this.memoized = {};
			this.adjacency = new Map();
			this.attribs = new Set();

			this.setUp(data, options);
		}

		setUp(data, options) {
			if (typeof data === 'string') {
				this.root = htmlparser2.parseDocument(data, options);
			}
		}

		toArray(data) {
			if (Array.isArray(data)) {
				return data;
			}
			return [data];
		}

		fromSet(set) {
			if (set instanceof Set) {
				return Array.from(set.values());
			}
			return [];
		}

		fromMap(map) {
			if (map instanceof Map) {
				return Array.from(map.values());
			}
			return [];
		}

		memoize(keys) {
			const array = this.toArray(keys).filter(key => {
				if (typeof key !== 'string') {
					return false;
				}

				if (this.memoized[key] === undefined) {
					this.memoized[key] = key.toLowerCase();
				}

				return true;
			});
			return new Iterable(array);
		}

		includes(node, key) {
			if (node.data) {
				return node.data.toLowerCase().includes(key);
			}

			if (node.attribs) {
				for (let attrib in node.attribs) {
					if (node.attribs[attrib].toLowerCase().includes(key)) {
						return true;
					}
				}
			}

			return false;
		}

		transverse(callback = () => {}) {
			let stack = [this.root];

			while (stack.length) {
				let node = stack.pop();

				if (!node) {
					continue;
				}

				callback(node);

				if (node.children) {
					for (let child of node.children) {
						stack.push(child);
					}
				}
			}
		}

		find(keys, attrib) {
			const isAttrib = typeof attrib === 'string';
			const memoized = this.memoize(keys);

			const callback = node => {
				if (isAttrib) {
					if (node?.attribs?.[attrib]) {
						this.attribs.add(node.attribs[attrib]);
					}
				}

				for (let key of memoized) {
					if (this.includes(node, this.memoized[key])) {
						if (this.adjacency.has(key)) {
							this.adjacency.set(key, this.adjacency.get(key).concat(node));
						} else {
							this.adjacency.set(key, [node]);
						}
					}
				}
			};

			this.transverse(callback);

			const data = this.fromMap(this.adjacency);
			const raws = { data: data.flat(1) };

			if (isAttrib) {
				const attribsKey = attrib.concat('s');
				raws[attribsKey] = this.fromSet(this.attribs);
			}

			return raws;
		}
	}

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

			return new rxjs.Observable(subscriber => {
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
						const resps = await axios__default["default"].get(href);
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

	exports.Iterable = Iterable;
	exports.Parse = Parse;
	exports.Spinney = Spinney;

	Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=bundle.js.map
