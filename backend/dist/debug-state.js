"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lib_1 = require("@svrooij/sonos/lib");
const HOST = '192.168.188.127'; // Küche
async function checkState() {
    console.log(`Checking state for device at ${HOST}...`);
    const device = new lib_1.SonosDevice(HOST);
    try {
        const volResp = await device.RenderingControlService.GetVolume({ InstanceID: 0, Channel: 'Master' });
        console.log(`Current Volume: ${volResp.CurrentVolume}`);
        const transportInfo = await device.AVTransportService.GetTransportInfo({ InstanceID: 0 });
        console.log(`Transport State: ${transportInfo.CurrentTransportState}`);
        console.log(`Transport Status: ${transportInfo.CurrentTransportStatus}`);
        const position = await device.AVTransportService.GetPositionInfo({ InstanceID: 0 });
        console.log('Position Info:', position);
        const mediaInfo = await device.AVTransportService.GetMediaInfo({ InstanceID: 0 });
        console.log('Media Info:', mediaInfo);
    }
    catch (e) {
        console.error('Error getting state:', e.message);
        if (e.cause)
            console.error('Cause:', e.cause);
    }
}
checkState();
