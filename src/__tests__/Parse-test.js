import Parse from '..';

describe('Parse class', () => {
	it('should find a string in parsed output', () => {
		const parse = new Parse({
			data: `<span style="font-size:15px;">-THE MISSION IS OURS-</span></p>`,
		});

		const self = parse.find('mission');

		expect(self.nodes.has('mission')).toEqual(true);
	});
});
