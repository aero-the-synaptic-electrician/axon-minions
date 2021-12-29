import { WebSocketServer } from 'ws';
import { SmartBuffer } from 'smart-buffer';

import config from './config.js';

import { Minion } from './Minion.js';
import { CaptchaQueue } from './CaptchaQueue.js';

const wss = new WebSocketServer({ port: 6969 });

/** @type {Set<Minion>} */
const minions = new Set();

/**
 * @param {String} url 
 * @param {Boolean} state 
 */
const updateMovement = state => {	
	for (const minion of minions.values())
		minion.movementEnabled = state;
}

const info = {
	url: null,
	name: config.name,
	tag: config.tag
};

wss.on('connection', ws => {
	console.log('Established connection with the client');

	const captchaQueue = new CaptchaQueue(ws);
	
	ws.on('message', message => {
		const reader = SmartBuffer.fromBuffer(message);

		const activeMinions = [...minions.values()]
			.filter(x => x.active && x.connected);

		switch (reader.readUInt8()) {
			case 1: {
				let i = 0;

				for (const minion of activeMinions) {
					setTimeout(() => minion.spawn(), ++i % 2 === 0 ? Math.max(1, Math.floor(Math.random() * 4)) : 0);
				}
				
				break;
			}

			case 16: {
				const x = reader.readInt16LE();
				const y = reader.readInt16LE();

				for (const minion of activeMinions)
					minion.move(x, y);
					
				break;
			}

			case 17: {
				const count = reader.readUInt8();

				let i = 0;

				for (const minion of activeMinions) {
					if (minion.alive) {
						setTimeout(() => minion.split(count), ++i % 3 === 0 ? i * 4 : 0);
					}
				}

				break;
			}

			case 21: {
				const state = !!reader.readUInt8();

				let i = 0;

				for (const minion of activeMinions) {					
					if (minion.alive) {
						setTimeout(() => minion.feed(state), ++i % 3 === 0 ? i * 4 : 0);
					}
				}

				break;
			}

			case 4: {
				const currentPlayers = reader.readUInt8();
				const maxPlayers = reader.readUInt8();
				
				const freeSlots = maxPlayers - currentPlayers;

				if (freeSlots <= 0 || freeSlots >= 200 || !info.url) {
					console.warn('Invalid usage of start operation!');
					return;
				}

				console.log(`Connecting ${freeSlots} minion(s)`);

				/** @type {Array<Minion>} */
				const joinQueue = [];

				for (let i = 0; i < freeSlots; i++)
					joinQueue.push(new Minion(captchaQueue, info));

				/** @type {{url:String}} */
				const { url: serverUrl } = info;

				joinQueue.forEach((minion, index) => {
					minion.captchaQueue = captchaQueue;
					
					const delay = index >= 16 && index <= 48 ? 120 * index : 80 * index;
					setTimeout(() => {
						minion.connect(serverUrl);
						minions.add(minion);
					}, delay);
				});
				
				break;
			}

			case 5: {
				console.log(`Disconnecting ${activeMinions.length} minion(s)`);

				for (const minion of minions.values()) {
					if (minion.active)
						minion.ws.terminate();
				}

				minions.clear();

				break;
			}

			case 6: {
				const message = reader.readString();

				for (const minion of activeMinions)
					minion.chat(message);

				break;
			}

			case 7: {
				const pid = reader.readUInt16LE();

				for (const minion of activeMinions)
					minion.spectate(pid);

				break;
			}

			case 8: {
				info.url = reader.readString();
				console.log(`Connected to server URL ${info.url}`);
				setTimeout(() => updateMovement(true), 1000); 
				break;
			}

			case 9: {
				info.name = decodeURIComponent(reader.readStringNT());

				const tagChanged = !!reader.readUInt8();

				if (tagChanged)
					info.tag = decodeURIComponent(reader.readStringNT());

				for (const minion of minions.values()) {
					minion.name = info.name;
					minion.tag = info.tag;
				}

				break;
			}

			case 10: {
				const state = !!reader.readUInt8();

				for (const minion of minions.values())
					minion.movementEnabled = state;

				break;
			}

			case 11: {
				captchaQueue.handleToken(reader.readString());
				break;
			}

			default: break;
		}
	});

    ws.on('close', () => {
        console.warn('Connection lost with the client');

		updateMovement(false);
    });
});