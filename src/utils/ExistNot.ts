export default function ExistNot(value: any): boolean {
	switch (typeof value) {
		case 'boolean':
			return value === false;
		case 'undefined':
			return true;
		case 'object':
			if (value) return false;
			return true;
		case 'string':
			if (value) return false;
			return true;
		case 'number':
			if (value) return false;
			return true;
		default:
			return false;
	}
}
