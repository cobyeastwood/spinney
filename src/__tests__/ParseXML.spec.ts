import ParseXML from '../ParseXML';

describe('ParseXML class', () => {
	it('should find urls in parsed output', async () => {
		const parse = new ParseXML(
			`<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
			<!-- This is the parent sitemap linking to additional sitemaps for products, collections and pages as shown below. The sitemap can not be edited manually, but is kept up to date in real time. -->
			<sitemap>
			  <loc>https://www.marucoffee.com/sitemap_products_1.xml?from=4352247758959&amp;to=6965001125999</loc>
			</sitemap>
			<sitemap>
			  <loc>https://www.marucoffee.com/sitemap_pages_1.xml</loc>
			</sitemap>
			<sitemap>
			  <loc>https://www.marucoffee.com/sitemap_collections_1.xml</loc>
			</sitemap>
			<sitemap>
			  <loc>https://www.marucoffee.com/sitemap_blogs_1.xml</loc>
			</sitemap>
		  </sitemapindex>`
		);

		const { hrefs } = await parse.findHrefs();

		expect(Boolean(hrefs.length)).toEqual(true);
	});
});
