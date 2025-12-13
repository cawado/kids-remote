import * as dgram from 'dgram';
import * as os from 'os';

const SEARCH_STRING = Buffer.from([
    'M-SEARCH * HTTP/1.1',
    'HOST: 239.255.255.250:1900',
    'MAN: "ssdp:discover"',
    'MX: 1',
    'ST: urn:schemas-upnp-org:device:ZonePlayer:1',
].join('\r\n'));

export interface SonosDeviceDiscoveryResult {
    host: string;
    model: string;
}

async function discoverOnInterface(ip: string, name: string, timeout: number): Promise<SonosDeviceDiscoveryResult[]> {
    // console.log(`Starting discovery on interface ${name} (${ip})...`);
    return new Promise((resolve) => {
        const devices: SonosDeviceDiscoveryResult[] = [];
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
            } catch (e) {
                // Ignore multicast join errors
            }

            const send = () => {
                socket.send(SEARCH_STRING, 0, SEARCH_STRING.length, 1900, '239.255.255.250');
                socket.send(SEARCH_STRING, 0, SEARCH_STRING.length, 1900, '255.255.255.255');
            };

            send();
            setTimeout(send, 500);
            if (timeout > 1000) setTimeout(send, 1000);
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
export async function findSonosDevices(timeout = 3000): Promise<SonosDeviceDiscoveryResult[]> {
    const interfaces = os.networkInterfaces();
    const tasks: Promise<SonosDeviceDiscoveryResult[]>[] = [];

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

    if (tasks.length === 0) return [];

    const results = await Promise.all(tasks);
    const allDevices = results.flat();

    // Deduplicate by host
    const uniqueDevices: SonosDeviceDiscoveryResult[] = [];
    const seenHosts = new Set<string>();

    for (const device of allDevices) {
        if (!seenHosts.has(device.host)) {
            uniqueDevices.push(device);
            seenHosts.add(device.host);
        }
    }

    return uniqueDevices;
}
