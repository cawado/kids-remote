"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lib_1 = require("@svrooij/sonos/lib");
const HOST = '192.168.188.127'; // Küche
async function forcePlay() {
    console.log(`Sending Play to ${HOST}...`);
    const device = new lib_1.SonosDevice(HOST);
    try {
        const result = await device.Play();
        console.log('Play command result:', result);
        // Check state again after 1s
        setTimeout(async () => {
            const transportInfo = await device.AVTransportService.GetTransportInfo({ InstanceID: 0 });
            console.log(`Transport State after 1s: ${transportInfo.CurrentTransportState}`);
        }, 1000);
    }
    catch (e) {
        console.error('Error playing:', e.message);
        if (e.cause)
            console.error('Cause:', e.cause);
    }
}
forcePlay();
