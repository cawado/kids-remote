"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.findSonosDevices = findSonosDevices;
const dgram = __importStar(require("dgram"));
const os = __importStar(require("os"));
const SEARCH_STRING = Buffer.from([
    'M-SEARCH * HTTP/1.1',
    'HOST: 239.255.255.250:1900',
    'MAN: "ssdp:discover"',
    'MX: 1',
    'ST: urn:schemas-upnp-org:device:ZonePlayer:1',
].join('\r\n'));
async function discoverOnInterface(ip, name, timeout) {
    // console.log(`Starting discovery on interface ${name} (${ip})...`);
    return new Promise((resolve) => {
        const devices = [];
        const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
        socket.on('error', (err) => {
            // console.error(`[${name}] Socket error:`, err.message);
            socket.close();
            resolve([]);
        });
        socket.on('message', (msg, rinfo) => {
            const message = msg.toString();
            if (message.includes('Sonos')) {
                const modelCheck = /SERVER.{0,200}\((.{2,50})\)/.exec(message);
                const model = (modelCheck && modelCheck.length > 1 ? modelCheck[1] : 'Unknown');
                if (!devices.some(d => d.host === rinfo.address)) {
                    // console.log(`[${name}] FOUND DEVICE! ${model} at ${rinfo.address}`);
                    devices.push({ host: rinfo.address, model });
                }
            }
        });
        socket.bind(0, ip, () => {
            try {
                socket.addMembership('239.255.255.250', ip);
                socket.setMulticastTTL(128);
            }
            catch (e) {
                // Ignore multicast join errors
            }
            const send = () => {
                socket.send(SEARCH_STRING, 0, SEARCH_STRING.length, 1900, '239.255.255.250');
                socket.send(SEARCH_STRING, 0, SEARCH_STRING.length, 1900, '255.255.255.255');
            };
            send();
            setTimeout(send, 500);
            if (timeout > 1000)
                setTimeout(send, 1000);
        });
        setTimeout(() => {
            socket.close();
            resolve(devices);
        }, timeout);
    });
}
/**
 * Scans all IPv4 network interfaces to find Sonos devices.
 * Returns a list of found devices.
 */
async function findSonosDevices(timeout = 3000) {
    const interfaces = os.networkInterfaces();
    const tasks = [];
    for (const name of Object.keys(interfaces)) {
        const iface = interfaces[name];
        if (iface) {
            for (const alias of iface) {
                if (alias.family === 'IPv4' && !alias.internal) {
                    tasks.push(discoverOnInterface(alias.address, name, timeout));
                }
            }
        }
    }
    if (tasks.length === 0)
        return [];
    const results = await Promise.all(tasks);
    const allDevices = results.flat();
    // Deduplicate by host
    const uniqueDevices = [];
    const seenHosts = new Set();
    for (const device of allDevices) {
        if (!seenHosts.has(device.host)) {
            uniqueDevices.push(device);
            seenHosts.add(device.host);
        }
    }
    return uniqueDevices;
}
