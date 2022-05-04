export default class CommonError extends Error {
	constructor(func: Function, parameter: any) {
		super(
			`${func.name} received unexpected parameter of type ${typeof parameter}`
		);
	}
}
