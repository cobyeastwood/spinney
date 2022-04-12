import { ParseDocument, ParseXml } from '../Parse';

describe('ParseDocument class', () => {
	it('should find a string in parsed output', () => {
		const parse = new ParseDocument(
			`<span style="font-size:15px;"><span style="font-size:15px;">-THE MISSION IS OURS-</span></p></span></p><span style="font-size:15px;">-THE MISSION IS OURS-</span></p>`
		);

		const { data } = parse.find('mission');

		expect(Boolean(data.length)).toEqual(true);
	});
});

describe('ParseXml class', () => {
	it('should find urls in parsed output', async () => {
		const parse = new ParseXml(
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

		const { hrefs } = await parse.find();

		expect(Boolean(hrefs.length)).toEqual(true);
	});
});
