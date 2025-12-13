"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sonos_1 = require("../services/sonos");
const config_1 = require("../config");
const router = (0, express_1.Router)();
// Middleware to normalize deviceName
router.use((req, res, next) => {
    // Handling both query and body for deviceName for convenience if needed, 
    // though usually GET uses query and POST uses body.
    const body = req.body || {};
    let deviceName = body.deviceName || req.query.deviceName;
    if (!deviceName) {
        if (!req.body)
            req.body = {};
        req.body.deviceName = config_1.config.defaultDeviceName; // set for POST
    }
    next();
});
router.get('/devices', async (req, res) => {
    // We need to access manager from service, maybe export it?
    // Importing sonosManager directly
    const { sonosManager } = require('../services/sonos');
    try {
        const devices = sonosManager.Devices.map((d) => ({
            name: d.Name,
            host: d.Host,
            group: d.GroupName
        }));
        res.json(devices);
    }
    catch (e) {
        res.json([]);
    }
});
router.get('/state', async (req, res) => {
    let deviceName = req.query.deviceName || config_1.config.defaultDeviceName;
    const device = (0, sonos_1.getDeviceByName)(deviceName);
    if (!device) {
        res.json({ currentUri: null });
        return;
    }
    try {
        if (!device.AVTransportService) {
            throw new Error("AVTransportService not available");
        }
        const state = await device.AVTransportService.GetTransportInfo();
        const region = await device.AVTransportService.GetPositionInfo();
        res.json({
            transportState: state.CurrentTransportState,
            currentUri: region.TrackURI,
            trackMetaData: region.TrackMetaData
        });
    }
    catch (error) {
        console.error("Error getting state", error);
        res.json({ error: error.message });
    }
});
router.post('/play', async (req, res) => {
    let { deviceName, uri } = req.body;
    // deviceName set by middleware logic or defaults above
    if (!uri) {
        res.status(400).send('Missing uri');
        return;
    }
    const device = (0, sonos_1.getDeviceByName)(deviceName);
    if (!device) {
        res.status(404).send(`Device '${deviceName}' not found`);
        return;
    }
    try {
        if (uri.startsWith('spotify:')) {
            try {
                await device.ExecuteCommand('AVTransportService.RemoveAllTracksFromQueue');
            }
            catch (e) {
                console.warn('Could not clear queue, proceeding to add.', e);
            }
            await device.AddUriToQueue(uri);
            await device.SwitchToQueue();
            await device.Play();
        }
        else {
            await device.SetAVTransportURI(uri);
            await device.Play();
        }
        res.send(`Playing ${uri} on ${deviceName}`);
    }
    catch (error) {
        res.status(500).send(`Error playing: ${error.message}`);
    }
});
router.post('/pause', async (req, res) => {
    const { deviceName } = req.body;
    const device = (0, sonos_1.getDeviceByName)(deviceName);
    if (!device) {
        res.status(404).send(`Device '${deviceName}' not found`);
        return;
    }
    try {
        await device.Pause();
        res.send(`Paused ${deviceName}`);
    }
    catch (error) {
        res.status(500).send(`Error pausing: ${error.message}`);
    }
});
// ... Volume, Next, Previous, Stop, Resume follow same pattern
// To save space in this tool call, implementing them concisely:
const simpleAction = (action) => async (req, res) => {
    const { deviceName } = req.body;
    const device = (0, sonos_1.getDeviceByName)(deviceName);
    if (!device) {
        res.status(404).send(`Device '${deviceName}' not found`);
        return;
    }
    try {
        // Dynamic method call
        if (action === 'Next')
            await device.Next();
        if (action === 'Previous')
            await device.Previous();
        if (action === 'Stop')
            await device.Stop();
        if (action === 'Play')
            await device.Play(); // For Resume
        res.send(`${action} executed on ${deviceName}`);
    }
    catch (error) {
        res.status(500).send(`Error executing ${action}: ${error.message}`);
    }
};
router.post('/next', simpleAction('Next'));
router.post('/previous', simpleAction('Previous'));
router.post('/stop', simpleAction('Stop'));
router.post('/resume', simpleAction('Play'));
router.post('/volume', async (req, res) => {
    const { deviceName, volume } = req.body;
    if (volume === undefined) {
        res.status(400).send('Missing volume');
        return;
    }
    const device = (0, sonos_1.getDeviceByName)(deviceName);
    if (!device) {
        res.status(404).send('Device not found');
        return;
    }
    try {
        await device.SetVolume(volume);
        res.send(`Set volume to ${volume}`);
    }
    catch (e) {
        res.status(500).send(e.message);
    }
});
router.post('/volume/relative', async (req, res) => {
    const { deviceName, adjustment } = req.body;
    if (adjustment === undefined) {
        res.status(400).send('Missing adjustment');
        return;
    }
    const device = (0, sonos_1.getDeviceByName)(deviceName);
    if (!device) {
        res.status(404).send('Device not found');
        return;
    }
    try {
        await device.SetRelativeVolume(adjustment);
        res.send(`Adjusted volume by ${adjustment}`);
    }
    catch (e) {
        res.status(500).send(e.message);
    }
});
exports.default = router;
