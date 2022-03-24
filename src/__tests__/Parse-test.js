import Parse from '..';

describe('Parse class', () => {
	it('should find a string in parsed output', () => {
		const parse = new Parse(
			`<span style="font-size:15px;"><span style="font-size:15px;">-THE MISSION IS OURS-</span></p></span></p><span style="font-size:15px;">-THE MISSION IS OURS-</span></p>`
		);

		const { data } = parse.find('mission');

		expect(Boolean(data.length)).toEqual(true);
	});
});
