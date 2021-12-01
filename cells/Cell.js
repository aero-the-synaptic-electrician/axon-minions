export class Cell {
	/** @param {Number} id */
	constructor(id) {
		this.id = id;

		this.x = 0;
		this.y = 0;

		this.radius = 0;
	}

	/**
	 * @param {Number} x 
	 * @param {Number} y 
	 */
	setPosition(x, y) {
		this.x = x;
		this.y = y;
	}

	/** @returns {Number} */
	get mass() {
		return Math.round(Math.pow(this.radius / 10, 2));
	}
}