import SpotifyWebApi from 'spotify-web-api-node';
import { config } from '../config';

export const spotifyApi = new SpotifyWebApi({
    clientId: config.spotify.clientId,
    clientSecret: config.spotify.clientSecret
});

export async function ensureSpotifyAuth() {
    try {
        const data = await spotifyApi.clientCredentialsGrant();
        spotifyApi.setAccessToken(data.body['access_token']);
    } catch (error) {
        console.error('Error authenticating with Spotify:', error);
        throw error;
    }
}
