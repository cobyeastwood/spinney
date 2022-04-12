import ParseDocument from '../ParseDocument';

describe('ParseDocument class', () => {
	it('should find a string in parsed output', () => {
		const parse = new ParseDocument(
			`<span style="font-size:15px;"><span style="font-size:15px;">-THE MISSION IS OURS-</span></p></span></p><span style="font-size:15px;">-THE MISSION IS OURS-</span></p>`
		);

		const { data } = parse.find('mission');

		expect(Boolean(data.length)).toEqual(true);
	});
});
