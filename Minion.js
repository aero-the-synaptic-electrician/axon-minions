import capmonster from 'capmonster';
import HttpsProxyAgent from 'https-proxy-agent';
import WebSocket from 'ws';
import { SmartBuffer } from 'smart-buffer';

import config from './config.js';
import { XorKey } from './Authenticator.js';
import { generateHeaders, clamp, noop } from './util.js';
import { parseOwnCells } from './cells/Parsers.js';

const captcha = new capmonster(config.apiKey);

export class Minion {
    constructor() {
        // your proxy API code here . . .
    }

    /** @param {String} url */
    connect(url) {
        this.serverUrl = url;

        this.ws = new WebSocket(url, 'tFoL46WDlZuRja7W6qCl', {
            agent: this.agent,
            rejectUnauthorized: false,
            headers: generateHeaders()
        });

        this.ws.binaryType = 'buffer';

        this.ws.on('message', this.onMessage.bind(this));
        this.ws.on('open', this.onOpen.bind(this));
        this.ws.on('close', this.onClose.bind(this));
        this.ws.on('error', noop);

        this.x = 0;
        this.y = 0;

        this.movementEnabled = true;

        this.id = Math.floor(Math.pow(2, 14) * Math.random()).toString(36);
    }

    disconnect() {
        if(this.ws) {
            this.ws.terminate();
            delete this.ws;
        }

        clearInterval(this.pingInterval);

        clearTimeout(this.spawnTimeout);

        delete this.connected;
        delete this.open;
    }

    /** @param {Buffer} message */
    onMessage(message) {
        const reader = SmartBuffer.fromBuffer(message);

        switch(reader.readUInt8()) {
            case 1:
                this.initialData(reader);
                break;

            case 2: {
                const key = message.slice(1);
                this.authenticate(new XorKey(key).build());
                break;
            }

            case 6:
                this.pong();
                break;

            case 10:
                this.computeCells(reader);
                break;

            case 20:
                setTimeout(() => this.spawn(), config.respawnDelay);
                break;

            case 22: {
                if(!this.open)
                    return;

                console.log(`Got captcha request for minion '${this.id}'`);

                if(config.manualSolving) {
                    if(!this.captchaQueue)
                        return;

                    this.captchaQueue.add(this);
                } else {
                    captcha.decodeReCaptchaV2(
                        'https://vanis.io',
                        '6LfN7J4aAAAAAPN5k5E2fltSX2PADEyYq6j1WFMi'
                    ).then(result => {
                        console.log(`Got captcha token for minion '${this.id}'`);

                        const {
                            gRecaptchaResponse: token
                        } = result.solution;
                        this.sendRecaptchaToken(token);
                    });
                }

                break;
            }

            default:
                break;
        }
    }

    onOpen() {
        console.log(`Minion '${this.id}' connected`);

        this.name = config.getName();
        this.tag = config.getTag();
        this.skin = config.skinOnJoin ? config.getSkin() : 'vanis1';

        this.open = true;
    }

    onClose() {
        console.warn(`Minion '${this.id}' disconnected`);

        clearInterval(this.pingInterval);
	    
        clearTimeout(this.spawnTimeout);

        delete this.connected;
        delete this.open;
    }

    get active() {
        return this.ws && this.ws.readyState === WebSocket.OPEN;
    }

    /** @param {SmartBuffer} data */
    send(data) {
        if(this.active)
            this.ws.send(data.toBuffer());
    }

    /** @param {SmartBuffer} reader */
    initialData(reader) {
        if(!this.open)
            return;

        this.connected = true;

        this.pingInterval = setInterval(() => this.ping(), 1000);

        if(config.spawnOnJoin) {
            this.spawnTimeout = setTimeout(() => this.spawn(), Math.max(500, Math.random() * 1000));
        }

        const protocol = reader.readUInt8();

        if(protocol >= 4) {
            reader.readUInt8();
            reader.readUInt16LE();

            this.playerId = reader.readUInt16LE();

            reader.readInt16LE();
            reader.readInt16LE();
            reader.readInt16LE();
            reader.readInt16LE();

            reader.readUInt8();
        } else {
            if(protocol >= 2) {
                reader.readUInt8();
                reader.readUInt16LE();
                this.playerId = reader.readUInt16LE();
            } else {
                reader.readUInt16LE();
                this.playerId = reader.readUInt16LE();
            }
        }
    }

    /** @param {SmartBuffer} reader */
    computeCells(reader) {
        /* snip */

        const cells = parseOwnCells(reader, this.playerId);

        this.alive = cells.size !== 0;
    }

    spawn() {
        if(this.spawnTimeout) {
            clearTimeout(this.spawnTimeout);
            delete this.spawnTimeout;
        }

        /* snip */

        if(config.skinOnSpawn)
            this.skin = config.getSkin();
        else if(config.staticSkin)
            this.skin = config.staticSkin;

        const packet = SmartBuffer.fromSize(1);

        packet.writeUInt8(1);

        packet.writeStringNT(this.name);
        packet.writeStringNT(`https://skins.vanis.io/s/${this.skin}`);
        packet.writeStringNT(this.tag);

        this.send(packet);
    }

    /** @param {Number} count */
    split(count) {
        this.move();

        const packet = SmartBuffer.fromSize(2);
        packet.writeUInt8(17);
        packet.writeUInt8(count);
        this.send(packet);

        this.splitCount += count;

        if(this.splitCount <= 2)
            this.pauseMovementUntil = Date.now() + 300;
        else {
            this.pauseMovementUntil = 0;
            this.splitCount = 0;
        }
    }

    /** @param {Array<Number>} key */
    authenticate(key) {
        if(config.skinOnJoin)
            this.skin = config.getSkin();
        else
            this.skin = 'vanis1';

        const packet = SmartBuffer.fromSize(2 + key.length);

        packet.writeUInt8(5);
        packet.writeUInt8(18);

        key.forEach(x => packet.writeUInt8(x));

        packet.writeStringNT(this.name);
        packet.writeStringNT(`https://skins.vanis.io/s/${this.skin}`);
        packet.writeStringNT(this.tag);

        if(this.token) {
            packet.writeStringNT(this.token);
        }

        this.send(packet);
    }

    /** @param {String} message */
    chat(message) {
        const packet = SmartBuffer.fromSize(1 + message.length);
        packet.writeUInt8(99);
        packet.writeString(message);
        this.send(packet);
    }

    /**
     * @param {Number} x 
     * @param {Number} y 
     */
    move(x, y) {
        if(this.movementEnabled) {
            const packet = SmartBuffer.fromSize(5);
            packet.writeUInt8(16);
            packet.writeInt16LE(x);
            packet.writeInt16LE(y);
            this.send(packet);
        } else {
            const packet = SmartBuffer.fromSize(1);
            packet.writeUInt8(9);
            this.send(packet);
        }
    }

    pong() {
        const packet = SmartBuffer.fromSize(1);
        packet.writeUInt8(6);
        this.send(packet);
    }

    /** @param {Boolean} state */
    feed(state) {
        const packet = SmartBuffer.fromSize(2);
        packet.writeUInt8(21);
        packet.writeUInt8(+state);
        this.send(packet);
    }

    ping() {
        const packet = SmartBuffer.fromSize(1);
        packet.writeUInt8(3);
        this.send(packet);
    }

    /** @param {Number} pid  */
    spectate(pid) {
        const packet = SmartBuffer.fromSize(pid ? 3 : 1);
        packet.writeUInt8(2);
        pid && packet.writeUInt16LE(pid);
        this.send(packet);
    }

    /** @param {String} token */
    sendRecaptchaToken(token) {
        const packet = SmartBuffer.fromSize(1 + token.length + 1);
        packet.writeUInt8(11);
        packet.writeStringNT(token);
        this.send(packet);
    }
}
