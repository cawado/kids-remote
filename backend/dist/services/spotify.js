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
async function ensureSpotifyAuth() {
    try {
        const data = await exports.spotifyApi.clientCredentialsGrant();
        exports.spotifyApi.setAccessToken(data.body['access_token']);
    }
    catch (error) {
        console.error('Error authenticating with Spotify:', error);
        throw error;
    }
}
