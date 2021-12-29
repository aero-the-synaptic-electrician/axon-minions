import * as randomUseragent from 'random-useragent';

const generateHeaders = () => {
	const tags = [
		['en-US', 'en'],
		['en-GN', 'en'],
		['fr-CH', 'fr']
	];

	const tag = tags[Math.floor(Math.random() * tags.length)];
	const weight = Math.max(0.1, Math.random() * 0.9).toFixed(1);

	return {
		Origin: 'https://vanis.io',
		Pragma: 'no-cache',
		'Cache-Control': 'no-cache',
		'Accept-Encoding': 'gzip, deflate',
		'Accept-Language': `${tag[0]}, ${tag[1]};${weight}`,
		'User-Agent': randomUseragent.getRandom()
	};
};

/**
 * @param {Number} value
 * @param {Number} min
 * @param {Number} max
 * @returns {Number}
 */
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const noop = () => {};

export { generateHeaders, clamp, noop };