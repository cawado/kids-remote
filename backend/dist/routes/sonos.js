"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sonos_1 = require("../services/sonos");
const config_1 = require("../config");
const errorHandler_1 = require("../middleware/errorHandler");
const metadata_1 = require("../services/metadata");
const edge_tts_1 = require("@travisvn/edge-tts");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const network_1 = require("../utils/network");
const router = (0, express_1.Router)();
// Middleware to normalize deviceName
router.use((req, res, next) => {
    const headerDevice = req.headers['x-device-name'];
    if (headerDevice) {
        if (req.method === 'POST') {
            if (!req.body)
                req.body = {};
            if (!req.body.deviceName)
                req.body.deviceName = headerDevice;
        }
        // Also normalize for GET requests by putting it into query if not present
        if (req.method === 'GET') {
            if (!req.query.deviceName)
                req.query.deviceName = headerDevice;
        }
    }
    else if (req.method === 'POST') {
        if (!req.body)
            req.body = {};
        if (!req.body.deviceName)
            req.body.deviceName = config_1.config.defaultDeviceName;
    }
    next();
});
router.get('/devices', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { sonosManager } = require('../services/sonos');
    const devices = sonosManager.Devices.map((d) => ({
        name: d.Name,
        host: d.Host,
        group: d.GroupName
    }));
    res.json(devices);
}));
router.get('/state', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    let deviceName = req.query.deviceName || config_1.config.defaultDeviceName;
    const device = (0, sonos_1.getDeviceByName)(deviceName);
    if (!device) {
        return res.json({ transportState: 'STOPPED', currentUri: null });
    }
    if (!device.AVTransportService) {
        throw new errorHandler_1.AppError(503, "AVTransportService not available on device");
    }
    const state = await device.AVTransportService.GetTransportInfo();
    const region = await device.AVTransportService.GetPositionInfo();
    res.json({
        transportState: state.CurrentTransportState,
        currentUri: region.TrackURI,
        trackMetaData: (0, metadata_1.parseMetadata)(region.TrackMetaData)
    });
}));
router.post('/play', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    let { deviceName, uri } = req.body;
    if (!uri) {
        throw new errorHandler_1.AppError(400, 'Missing uri');
    }
    const device = (0, sonos_1.getDeviceByName)(deviceName);
    if (!device) {
        throw new errorHandler_1.AppError(404, `Device '${deviceName}' not found`);
    }
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
    res.json({ success: true, message: `Playing ${uri} on ${deviceName}` });
}));
router.post('/pause', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { deviceName } = req.body;
    const device = (0, sonos_1.getDeviceByName)(deviceName);
    if (!device)
        throw new errorHandler_1.AppError(404, `Device '${deviceName}' not found`);
    await device.Pause();
    res.json({ success: true, message: `Paused ${deviceName}` });
}));
const simpleAction = (action) => (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { deviceName } = req.body;
    const device = (0, sonos_1.getDeviceByName)(deviceName);
    if (!device)
        throw new errorHandler_1.AppError(404, `Device '${deviceName}' not found`);
    if (action === 'Next')
        await device.Next();
    else if (action === 'Previous')
        await device.Previous();
    else if (action === 'Stop')
        await device.Stop();
    else if (action === 'Play')
        await device.Play();
    res.json({ success: true, message: `${action} executed on ${deviceName}` });
});
router.post('/next', simpleAction('Next'));
router.post('/previous', simpleAction('Previous'));
router.post('/stop', simpleAction('Stop'));
router.post('/resume', simpleAction('Play'));
router.post('/volume', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { deviceName, volume } = req.body;
    if (volume === undefined)
        throw new errorHandler_1.AppError(400, 'Missing volume');
    const device = (0, sonos_1.getDeviceByName)(deviceName);
    if (!device)
        throw new errorHandler_1.AppError(404, 'Device not found');
    if (device.RenderingControlService) {
        await device.RenderingControlService.SetVolume({ InstanceID: 0, Channel: 'Master', DesiredVolume: volume });
    }
    else {
        await device.SetVolume(volume);
    }
    res.json({ success: true, volume });
}));
router.post('/volume/relative', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { deviceName, adjustment } = req.body;
    if (adjustment === undefined)
        throw new errorHandler_1.AppError(400, 'Missing adjustment');
    const device = (0, sonos_1.getDeviceByName)(deviceName);
    if (!device)
        throw new errorHandler_1.AppError(404, 'Device not found');
    if (device.RenderingControlService) {
        await device.RenderingControlService.SetRelativeVolume({ InstanceID: 0, Channel: 'Master', Adjustment: adjustment });
    }
    else {
        await device.SetRelativeVolume(adjustment);
    }
    res.json({ success: true, adjustment });
}));
router.post('/tts', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    let { deviceNames, deviceName, text, lang } = req.body;
    if (!text)
        throw new errorHandler_1.AppError(400, 'Missing text');
    if (!lang)
        lang = 'de-DE';
    // Normalize to an array of device names
    const targets = Array.isArray(deviceNames) ? deviceNames : [deviceName || config_1.config.defaultDeviceName];
    console.log(`Generating TTS for targets [${targets.join(', ')}]: "${text}" [${lang}]`);
    try {
        const voices = await (0, edge_tts_1.listVoices)();
        const deVoice = voices.find(v => v.Locale === lang) || voices.find(v => v.Locale.startsWith('de')) || voices[0];
        const edgeTts = new edge_tts_1.EdgeTTS(text, deVoice.ShortName);
        const result = await edgeTts.synthesize();
        const arrayBuffer = await result.audio.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const filename = `tts-${Date.now()}.mp3`;
        const publicDir = path_1.default.join(__dirname, '../../public/tts');
        if (!fs_1.default.existsSync(publicDir)) {
            fs_1.default.mkdirSync(publicDir, { recursive: true });
        }
        const filePath = path_1.default.join(publicDir, filename);
        fs_1.default.writeFileSync(filePath, buffer);
        const host = (0, network_1.getLocalIp)();
        const port = config_1.config.port;
        const url = `http://${host}:${port}/tts-static/${filename}`;
        console.log(`TTS URL: ${url}`);
        // Broadcast to all targets
        const sendPromises = targets.map(async (name) => {
            const device = (0, sonos_1.getDeviceByName)(name);
            if (device) {
                return device.PlayNotification({
                    trackUri: url,
                    onlyWhenPlaying: false,
                    timeout: 20,
                    volume: 40,
                    delayMs: 500
                }).catch((err) => console.error(`Failed to send TTS to ${name}:`, err.message));
            }
            else {
                console.warn(`Device '${name}' not found for TTS broadcast.`);
            }
        });
        await Promise.all(sendPromises);
        res.json({ success: true, message: `TTS sent to targets`, targets, voice: deVoice.ShortName });
        // Optional: Clean up old files
        setTimeout(() => {
            if (fs_1.default.existsSync(filePath))
                fs_1.default.unlinkSync(filePath);
        }, 60000 * 5);
    }
    catch (error) {
        console.error('TTS Error:', error);
        throw new errorHandler_1.AppError(500, `TTS failed: ${error.message}`);
    }
}));
exports.default = router;
