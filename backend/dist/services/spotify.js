"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.spotifyApi = void 0;
exports.ensureSpotifyAuth = ensureSpotifyAuth;
const spotify_web_api_node_1 = __importDefault(require("spotify-web-api-node"));
const config_1 = require("../config");
exports.spotifyApi = new spotify_web_api_node_1.default({
    clientId: config_1.config.spotify.clientId,
    clientSecret: config_1.config.spotify.clientSecret
});
let tokenExpiry = 0;
/**
 * Ensure Spotify API has a valid access token
 * Automatically refreshes token if expired or about to expire
 */
async function ensureSpotifyAuth() {
    const now = Date.now();
    // Check if token is still valid (with 5 minute buffer)
    if (now < tokenExpiry) {
        return; // Token still valid
    }
    try {
        console.log('Refreshing Spotify access token...');
        const data = await exports.spotifyApi.clientCredentialsGrant();
        exports.spotifyApi.setAccessToken(data.body['access_token']);
        // Set expiry time (subtract 5 minutes as buffer)
        const expiresIn = data.body['expires_in']; // seconds
        tokenExpiry = now + ((expiresIn - 300) * 1000);
        console.log(`Spotify token refreshed. Expires in ${expiresIn} seconds`);
    }
    catch (error) {
        console.error('Error authenticating with Spotify:', error);
        tokenExpiry = 0; // Reset expiry on error
        throw error;
    }
}
