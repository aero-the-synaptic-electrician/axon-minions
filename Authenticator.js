/**
 * @note 
 * The 'authentication' packet uses eight random values, 
 * followed by four seeded values (possibly bruteforced),
 * then the first encoded number in the result.
 * 
 * Ex. N1 N2 N3 N4 N5 N6 N7 N8 S1 S2 S3 S4 N1
 */

/** Array of numbers to be used as constant keys. */
const constants = [
	0x37, 0x3, 0xaa, 0x20,
	0x41, 0x1b, 0x9, 0x80
];

class XorKey {
	/** @param {Buffer | Array<Number>} data Key to be encoded. */
	constructor(data) {
		this.data = data;
	}

	/**
	 * Writes an encoded version of the given index to the output.
	 * @param {Array<Number>} output
	 * @param {Number} index
	 */
	writeIndex(output, index) {
		const value = this.data[index],
			mask = value + 4 & 7;

		const temp = ((value << mask) | (value >>> (8 - mask))) & 0xff;

		if (index > 0) {
			const key = output[index - 1] ^ constants[index];

			output.push(temp ^ key);
		} else {
			output.push(constants[0] ^ temp);
		}
	}

	/**
	 * Constructs an encoded version of the current key.
	 * @returns {Array<Number>}
	 */
	build() {
		const result = [];

		for (let i = 0; i < 8; i++)
			this.writeIndex(result, i);

		const seed = Math.floor((Math.pow(2, 32) - 1) * Math.random());

		result.push((result[0] ^ (seed >>> 24)) & 0xff);
		result.push((result[1] ^ (seed >>> 16)) & 0xff);
		result.push((result[2] ^ (seed >>> 8)) & 0xff);

		result.push((seed ^ result[3]) & 0xff);
		result.push(result[0]);

		return result;
	}
}

export { XorKey };