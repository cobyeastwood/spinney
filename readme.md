## Spinney

An efficient and flexible web scraper.

### Basic Example

```javascript
const Spinney = require('spinney');

// Register an endpoint to scrape
const spinney = new Spinney('https://google.com/');

// Begin process on provided keys
const observable = spinney.spin(['foo', 'bar']);

// Subscribe to key changes
const subscription = observable.subscribe({
	next(elements) {
		console.log(elements);
	},
	error(error) {
		console.log(error);
	},
	complete() {
		console.log('completed');
	},
});

// Unsubscribe to key changes
subscription.unsubscribe();
```
