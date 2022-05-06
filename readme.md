## Spinney

An efficient and flexible web scraper.

### Basic Example

```javascript
const Spinney = require('spinney');

// Set base endpoint
const spinney = new Spinney('http://example.com/');

// Subscribe custom handlers
const subscription = spinney.subscribe({
	next(site) {
		console.log(site);
	},
	ontext(text) {
		console.log(text);
	},
	onattribute(name, value, quote) {
		console.log(name, value, quote);
	},
	error(error) {
		console.log(error);
	},
	complete() {
		console.log('done');
	},
});

// Unsubscribe
subscription.unsubscribe();
```
