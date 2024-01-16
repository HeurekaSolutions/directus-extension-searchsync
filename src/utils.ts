/**
 * Flattens objects to use keys separated by specified glue.\
 * Objects are flattened as far as a concrete value is assigned to the flattened path, or an array of values is reached.\
 * Inside arrays, paths are currently not flattened.
 * 
 * @export
 * @param {object} ob The object to be flattened.
 * @param {string} [glue='#'] Character used for path concatenation.\
 * 							  Dot (".") is used internally by meilisearch for dot notation flattening -> String fields stored with key "part1.part2.(...)" discard their values.
 * @return {*} The passed on object with a structure that is as flat as possible.
 */
export function flattenObject(ob: object, glue = '#') {
	const toReturn = new Object();

	for (const itemName in ob) {
		const itemNameKey = (itemName as keyof Object)
		if (!ob.hasOwnProperty(itemName)) continue;

		if (typeof ob[itemNameKey] === 'object' && ob[itemNameKey] !== null) {
			if (Array.isArray(ob[itemNameKey]))
				Object.assign(toReturn, { [itemName]: ob[itemNameKey] });
			else {
				const flatObject = flattenObject(ob[itemNameKey], glue);
				for (const childKey in flatObject) {
					if (!flatObject.hasOwnProperty(childKey)) continue;

					Object.assign(toReturn, { [`${itemNameKey}${glue}${childKey}`]: flatObject[childKey as keyof Object] });
					// toReturn[(i + glue + x))] = flatObject[x as keyof Object];
				}
			}
		} else {
			Object.assign(toReturn, { [itemName]: ob[itemNameKey] })
		}
	}

	return toReturn;
}

/**
 * LEGACY function from initial fork base. Kept for transform functionality.\
 * For more information see "prepareObject()" inside {@link IndexerFacade}.
 * 
 * @export
 * @param {Record<string, any>} object
 * @param {((value: any, key: string) => any)} mapFn
 * @return {*}  {Object}
 */
export function objectMap(object: Record<string, any>, mapFn: ((value: any, key: string) => any)): Object {
	return Object.keys(object).reduce((result, key) => {
		const value = object[key];
		if (value instanceof Object) {
			Object.assign(result[key as keyof Object], value);
		} else {
			Object.assign(result[key as keyof Object], mapFn(object[key], key));
		}

		return result;
	}, new Object());
}

/**
 * Helper function to generalize axios errors and common TS {@link Error}s.
 *
 * @export
 * @param {*} error The basic error object to be derived from.
 * @return {*} A generalized string representing received error information.
 */
export function buildErrorMessage(error: any): any {
	if (error && error.message) return error.message;

	if (error && error.response && error.response.data && error.response.data.error) return error.response.data.error;

	return error.toString();
}