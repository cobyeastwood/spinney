import ParseDocument from '../ParseDocument';
import Format from '../Format';

describe('Format class', () => {
	it('should find urls in parsed output', async () => {
		const doc = new ParseDocument(
			`<span style="font-size:15px;"><span style="font-size:15px;">-THE MISSION IS OURS-</span></p></span></p><span style="font-size:15px;">-THE MISSION IS OURS-</span></p>`
		).find('mission');

		const nodes = new Format(doc.nodes);

		expect(Object.keys(nodes)).toHaveLength(1);
	});
});
