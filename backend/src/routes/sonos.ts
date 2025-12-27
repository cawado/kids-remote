import { Router, Request, Response } from 'express';
import { getDeviceByName } from '../services/sonos';
import { config } from '../config';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { parseMetadata } from '../services/metadata';
import { EdgeTTS, listVoices } from '@travisvn/edge-tts';
import fs from 'fs';
import path from 'path';
import { getLocalIp } from '../utils/network';

const router = Router();

// Middleware to normalize deviceName
router.use((req: any, res: Response, next: any) => {
    if (req.method === 'POST') {
        if (!req.body) req.body = {};
        if (!req.body.deviceName) req.body.deviceName = config.defaultDeviceName;
    }
    next();
});

router.get('/devices', asyncHandler(async (req: Request, res: Response) => {
    const { sonosManager } = require('../services/sonos');
    const devices = sonosManager.Devices.map((d: any) => ({
        name: d.Name,
        host: d.Host,
        group: d.GroupName
    }));
    res.json(devices);
}));

router.get('/state', asyncHandler(async (req: Request, res: Response) => {
    let deviceName = req.query.deviceName as string || config.defaultDeviceName;
    const device = getDeviceByName(deviceName) as any;

    if (!device) {
        return res.json({ transportState: 'STOPPED', currentUri: null });
    }

    if (!device.AVTransportService) {
        throw new AppError(503, "AVTransportService not available on device");
    }

    const state = await device.AVTransportService.GetTransportInfo();
    const region = await device.AVTransportService.GetPositionInfo();

    res.json({
        transportState: state.CurrentTransportState,
        currentUri: region.TrackURI,
        trackMetaData: parseMetadata(region.TrackMetaData)
    });
}));

router.post('/play', asyncHandler(async (req: Request, res: Response) => {
    let { deviceName, uri } = req.body;

    if (!uri) {
        throw new AppError(400, 'Missing uri');
    }

    const device = getDeviceByName(deviceName);
    if (!device) {
        throw new AppError(404, `Device '${deviceName}' not found`);
    }

    if (uri.startsWith('spotify:')) {
        try {
            await device.ExecuteCommand('AVTransportService.RemoveAllTracksFromQueue');
        } catch (e) {
            console.warn('Could not clear queue, proceeding to add.', e);
        }
        await device.AddUriToQueue(uri);
        await device.SwitchToQueue();
        await device.Play();
    } else {
        await device.SetAVTransportURI(uri);
        await device.Play();
    }

    res.json({ success: true, message: `Playing ${uri} on ${deviceName}` });
}));

router.post('/pause', asyncHandler(async (req: Request, res: Response) => {
    const { deviceName } = req.body;
    const device = getDeviceByName(deviceName);
    if (!device) throw new AppError(404, `Device '${deviceName}' not found`);

    await device.Pause();
    res.json({ success: true, message: `Paused ${deviceName}` });
}));

const simpleAction = (action: string) => asyncHandler(async (req: Request, res: Response) => {
    const { deviceName } = req.body;
    const device = getDeviceByName(deviceName);
    if (!device) throw new AppError(404, `Device '${deviceName}' not found`);

    if (action === 'Next') await device.Next();
    else if (action === 'Previous') await device.Previous();
    else if (action === 'Stop') await device.Stop();
    else if (action === 'Play') await device.Play();

    res.json({ success: true, message: `${action} executed on ${deviceName}` });
});

router.post('/next', simpleAction('Next'));
router.post('/previous', simpleAction('Previous'));
router.post('/stop', simpleAction('Stop'));
router.post('/resume', simpleAction('Play'));

router.post('/volume', asyncHandler(async (req: Request, res: Response) => {
    const { deviceName, volume } = req.body;
    if (volume === undefined) throw new AppError(400, 'Missing volume');

    const device = getDeviceByName(deviceName);
    if (!device) throw new AppError(404, 'Device not found');

    if (device.RenderingControlService) {
        await device.RenderingControlService.SetVolume({ InstanceID: 0, Channel: 'Master', DesiredVolume: volume });
    } else {
        await device.SetVolume(volume);
    }
    res.json({ success: true, volume });
}));

router.post('/volume/relative', asyncHandler(async (req: Request, res: Response) => {
    const { deviceName, adjustment } = req.body;
    if (adjustment === undefined) throw new AppError(400, 'Missing adjustment');

    const device = getDeviceByName(deviceName);
    if (!device) throw new AppError(404, 'Device not found');

    if (device.RenderingControlService) {
        await device.RenderingControlService.SetRelativeVolume({ InstanceID: 0, Channel: 'Master', Adjustment: adjustment });
    } else {
        await device.SetRelativeVolume(adjustment);
    }
    res.json({ success: true, adjustment });
}));

router.post('/tts', asyncHandler(async (req: any, res: Response) => {
    let { deviceNames, deviceName, text, lang } = req.body;
    if (!text) throw new AppError(400, 'Missing text');
    if (!lang) lang = 'de-DE';

    // Normalize to an array of device names
    const targets: string[] = Array.isArray(deviceNames) ? deviceNames : [deviceName || config.defaultDeviceName];

    console.log(`Generating TTS for targets [${targets.join(', ')}]: "${text}" [${lang}]`);

    try {
        const voices = await listVoices();
        const deVoice = voices.find(v => v.Locale === lang) || voices.find(v => v.Locale.startsWith('de')) || voices[0];

        const edgeTts = new EdgeTTS(text, deVoice.ShortName);
        const result = await edgeTts.synthesize();

        const arrayBuffer = await result.audio.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const filename = `tts-${Date.now()}.mp3`;
        const publicDir = path.join(__dirname, '../../public/tts');
        if (!fs.existsSync(publicDir)) {
            fs.mkdirSync(publicDir, { recursive: true });
        }

        const filePath = path.join(publicDir, filename);
        fs.writeFileSync(filePath, buffer);

        const host = getLocalIp();
        const port = config.port;
        const url = `http://${host}:${port}/tts-static/${filename}`;

        console.log(`TTS URL: ${url}`);

        // Broadcast to all targets
        const sendPromises = targets.map(async (name) => {
            const device = getDeviceByName(name) as any;
            if (device) {
                return device.PlayNotification({
                    trackUri: url,
                    onlyWhenPlaying: false,
                    timeout: 20,
                    volume: 40,
                    delayMs: 500
                }).catch((err: any) => console.error(`Failed to send TTS to ${name}:`, err.message));
            } else {
                console.warn(`Device '${name}' not found for TTS broadcast.`);
            }
        });

        await Promise.all(sendPromises);

        res.json({ success: true, message: `TTS sent to targets`, targets, voice: deVoice.ShortName });

        // Optional: Clean up old files
        setTimeout(() => {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }, 60000 * 5);

    } catch (error: any) {
        console.error('TTS Error:', error);
        throw new AppError(500, `TTS failed: ${error.message}`);
    }
}));

export default router;

