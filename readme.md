### Example

```javascript
// Setup the scraper
const spinney = new Spinney('http://example.com/');

// Subscribe to custom handlers
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
