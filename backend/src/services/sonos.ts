import { SonosManager } from '@svrooij/sonos';
import { findSonosDevices } from '../discovery'; // Assuming discovery.ts stays in src/
import { config } from '../config';

export const sonosManager = new SonosManager();

export async function initSonos() {
    console.log('Starting discovery...');
    try {
        const devices = await findSonosDevices(3000);
        console.log(`Discovery finished. Found ${devices.length} devices.`);
        if (devices.length > 0) {
            const firstDevice = devices[0];
            console.log(`Initializing manager with ${firstDevice.model} at ${firstDevice.host}`);
            await sonosManager.InitializeFromDevice(firstDevice.host);
            devices.forEach(d => console.log(` - ${d.model} (${d.host})`));
        } else {
            console.warn('No Sonos devices found on network.');
        }
    } catch (e) {
        console.error('Error discovering devices:', e);
    }
}

export function getDeviceByName(name: string) {
    try {
        return sonosManager.Devices.find(d => d.Name === name);
    } catch (e) {
        return undefined;
    }
}
