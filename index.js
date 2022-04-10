const { Spider } = require('./dist/bundle.js');

// Register an endpoint to scrape
const spider = new Spider('https://google.com/');

// Begin search process on provided keys
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
