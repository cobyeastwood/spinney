const Spinney = require('./lib');

const spinney = new Spinney('https://www.marucoffee.com/', { overide: true });

spinney.spin(['coffee']).subscribe({
	next(c) {
		console.log(c);
	},
	error() {
		console.log('Error');
	},
});

// {
// 	hrefs: [
// 		'https://www.marucoffee.com/sitemap_products_1.xml?from=4352247758959&to=6965001125999',
// 		'https://www.marucoffee.com/sitemap_pages_1.xml',
// 		'https://www.marucoffee.com/sitemap_collections_1.xml',
// 		'https://www.marucoffee.com/sitemap_blogs_1.xml',
// 	];
// }
