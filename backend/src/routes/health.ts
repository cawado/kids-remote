import { Router, Request, Response } from 'express';
import { sonosManager } from '../services/sonos';
import { spotifyApi } from '../services/spotify';

const router = Router();

/**
 * Health check endpoint
 * Returns status of the application and its dependencies
 */
router.get('/health', (req: Request, res: Response) => {
    const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        services: {
            sonos: {
                available: sonosManager.Devices.length > 0,
                deviceCount: sonosManager.Devices.length,
                devices: sonosManager.Devices.map(d => ({
                    name: d.Name
                }))
            },
            spotify: {
                authenticated: !!spotifyApi.getAccessToken()
            }
        }
    };

    res.json(health);
});

export default router;
