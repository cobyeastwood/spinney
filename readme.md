## Spinney

A fast and powerful web harvester.

### Basic Example

```javascript
const { Spider } = require('spinney');

// Register an endpoint to harvest
const spider = new Spider('https://google.com/');

// Begin extracting process on provided keys
const observable = spider.spin(['foo', 'bar']);

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
