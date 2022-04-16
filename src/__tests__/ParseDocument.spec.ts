import ParseDocument from '../ParseDocument';

xdescribe('ParseDocument class', () => {
	it('should find a string in parsed output', () => {
		const parse = new ParseDocument(
			`<span style="font-size:15px;"><span style="font-size:15px;">-THE MISSION IS OURS-</span></p></span></p><span style="font-size:15px;">-THE MISSION IS OURS-</span></p>`
		);

		const { nodes } = parse.find('mission');

		expect(Boolean(nodes.length)).toEqual(true);
	});
});
