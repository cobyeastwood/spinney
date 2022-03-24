import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';

export default {
	input: 'src/index.js',
	output: {
		file: 'dist/bundle.js',
		format: 'umd',
		name: 'Spiny',
	},
	plugin: [commonjs(), resolve()],
};
