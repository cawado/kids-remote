"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sonos_1 = require("../services/sonos");
const spotify_1 = require("../services/spotify");
const router = (0, express_1.Router)();
/**
 * Health check endpoint
 * Returns status of the application and its dependencies
 */
router.get('/health', (req, res) => {
    const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        services: {
            sonos: {
                available: sonos_1.sonosManager.Devices.length > 0,
                deviceCount: sonos_1.sonosManager.Devices.length,
                devices: sonos_1.sonosManager.Devices.map(d => ({
                    name: d.Name
                }))
            },
            spotify: {
                authenticated: !!spotify_1.spotifyApi.getAccessToken()
            }
        }
    };
    res.json(health);
});
exports.default = router;
