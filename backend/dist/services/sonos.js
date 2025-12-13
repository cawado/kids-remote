"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sonosManager = void 0;
exports.initSonos = initSonos;
exports.getDeviceByName = getDeviceByName;
const sonos_1 = require("@svrooij/sonos");
const discovery_1 = require("../discovery"); // Assuming discovery.ts stays in src/
exports.sonosManager = new sonos_1.SonosManager();
async function initSonos() {
    console.log('Starting discovery...');
    try {
        const devices = await (0, discovery_1.findSonosDevices)(3000);
        console.log(`Discovery finished. Found ${devices.length} devices.`);
        if (devices.length > 0) {
            const firstDevice = devices[0];
            console.log(`Initializing manager with ${firstDevice.model} at ${firstDevice.host}`);
            await exports.sonosManager.InitializeFromDevice(firstDevice.host);
            devices.forEach(d => console.log(` - ${d.model} (${d.host})`));
        }
        else {
            console.warn('No Sonos devices found on network.');
        }
    }
    catch (e) {
        console.error('Error discovering devices:', e);
    }
}
function getDeviceByName(name) {
    try {
        return exports.sonosManager.Devices.find(d => d.Name === name);
    }
    catch (e) {
        return undefined;
    }
}
