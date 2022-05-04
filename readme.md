## Spinney

An efficient and flexible web scraper.

### Basic Example

```javascript
const Spinney = require('spinney');

// Set an endpoint
const spinney = new Spinney('https://google.com/');

// Subscribe
const subscription = spinney.subscribe({
	next({ href, nodes }) {
		console.log(href, nodes);
	},
	error(error) {
		console.log(error);
	},
	complete() {
		console.log('completed');
	},
});

// Unsubscribe
subscription.unsubscribe();
```
