import WebSocket from 'ws';
import { SmartBuffer } from 'smart-buffer';

import { Minion } from './Minion.js';

export class CaptchaQueue {
    /** @param {WebSocket} ws */
    constructor(ws) {
        this.ws = ws;

        /** @type {Minion} */
        this.waitingMinion = null;

        /** @type {Array<String>} */
        this.tokens = [];
    }

    get active() {
        return this.ws && this.ws.readyState === WebSocket.OPEN;
    }

    /** @param {SmartBuffer} data */
	send = data => this.active && this.ws.send(data.toBuffer());

    /** @param {Minion} minion */
    add(minion) {
        if (!this.active || !minion.active)
            return;

        if (this.tokens.length !== 0) {
            const token = this.tokens.pop();
            minion.sendRecaptchaToken(token);
            return;
        }

        console.log(`Requesting captcha token from client for minion '${minion.id}'`);

        this.waitingMinion = minion;

        const packet = SmartBuffer.fromSize(1);
        packet.writeUInt8(1);
        this.send(packet);        
    }
    
    /** @param {String} token */
    handleToken(token) {
        if (!this.active)
            return;

        if (!this.waitingMinion?.active) {
            this.tokens.push(token);
            return;
        }

        const minion = this.waitingMinion;

        console.log(`Got captcha token for minion '${minion.id}'`);

        this.waitingMinion.sendRecaptchaToken(token);
        this.waitingMinion = null;
    }
};
