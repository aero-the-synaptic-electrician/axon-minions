import { SmartBuffer } from 'smart-buffer';

/**
 * Cell imports
 */
import { Player } from './Player.js';
import { Virus } from './Virus.js';
import { Food } from './Food.js';
import { EjectedMass } from './EjectedMass.js';
import { DeadCell } from './DeadCell.js';
import { Crown } from './Crown.js';

/**
 * Cell types
 */
const types = {
	Player: 1,
	Virus: 2,
	Food: 3,
	EjectedMass: 4,
	DeadCell: 5,
	Crown: 6
};

/**
 * Parses cells into a ordered map.
 * @param {SmartBuffer} reader 
 * @returns {Map<Number, Player | Virus | Food | EjectedMass | DeadCell | Crown>} 
 */
const parseCells = reader => {
	const cells = new Map();

	for (let type; type = reader.readUInt8();) {
		const pid = type === 1 && reader.readUInt16BE();
		const id = reader.readUInt16BE();

		let cell;

		switch (type) {
			case types.Player:
				cell = new Player(id, pid);
				break;

			case types.Virus:
				cell = new Virus(id);
				break;

			case types.Food:
				cell = new Food(id);
				break;

			case types.EjectedMass:
				cell = new EjectedMass(id);
				break;

			case types.DeadCell:
				cell = new DeadCell(id);
				break;

			case types.Crown:
				cell = new Crown(id);
				break;

			default:
				// Was originally some flag bullshit before Luka broke it.
				cell = new DeadCell(id);
				break;
		}

		cell.setPosition(
			reader.readInt16BE(),
			reader.readInt16BE()
		)

		cell.radius = reader.readUInt16BE();

		cells.set(id, cell);
	}

	let count = reader.readUInt16BE();

	while (count--) {
		const id = reader.readUInt16BE();

		if (!cells.has(id))
			continue;

		cells.delete(id);
	}

	count = reader.readUInt16BE();

	while (count--) {
		const id = reader.readUInt16BE();
		reader.readUInt16BE(); // Player that consumed the prey

		if (!cells.has(id))
			continue;

		cells.delete(id);
	}

	return cells;
}

/**
 * Optimised parser for returning specific player cells.
 * @param {SmartBuffer} reader 
 * @param {Number} sid
 * @returns {Map<Number, Player>}
 */
const parseOwnCells = (reader, sid) => {
	const cells = new Map();

	for (let type; type = reader.readUInt8();) {
		if (type !== 1) {
			reader.readOffset += 4 * 2; // Player ID, ID, X/Y, Radius
			continue;
		}

		const pid = reader.readUInt16BE();

		if (pid !== sid) {
			reader.readOffset += 2 * 4; // ID, X/Y, Radius
			continue;
		}

		const id = reader.readUInt16BE();

		const cell = new Player(id, pid);

		cell.setPosition(
			reader.readInt16BE(),
			reader.readInt16BE()
		);

		cell.radius = reader.readUInt16BE();

		cells.set(id, cell);
	}

	let count = reader.readUInt16BE();

	while (count--) {
		const id = reader.readUInt16BE();

		if (!cells.has(id))
			continue;

		cells.delete(id);
	}

	count = reader.readUInt16BE();

	while (count--) {
		const id = reader.readUInt16BE();
		reader.readUInt16BE(); // Player that consumed the prey

		if (!cells.has(id))
			continue;

		cells.delete(id);
	}

	return cells;
}

export { parseCells, parseOwnCells };