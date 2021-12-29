import { Cell } from './Cell.js';

export class Player extends Cell {
	/**
	 * @param {Number} id 
	 * @param {Number} pid 
	 */
	constructor(id, pid) {
		super(id);

		this.pid = pid;
	}
}