/**
 * Create an object composed of the picked object properties
 * @param {Record<string, unknown>} object The source object
 * @param {string[]} keys The keys to pick from the object
 * @returns {Record<string, unknown>} The new object containing the picked properties
 */
const pick = <T extends Record<string, unknown>>(
	object: T,
	keys: string[],
): Record<string, unknown> => {
	return keys.reduce(
		(obj, key) => {
			if (object && Object.prototype.hasOwnProperty.call(object, key)) {
				obj[key] = object[key];
			}
			return obj;
		},
		{} as Record<string, unknown>,
	);
};

export default pick;
