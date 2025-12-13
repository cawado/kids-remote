import SpotifyWebApi from 'spotify-web-api-node';
import { config } from '../config';

export const spotifyApi = new SpotifyWebApi({
    clientId: config.spotify.clientId,
    clientSecret: config.spotify.clientSecret
});

let tokenExpiry = 0;

/**
 * Ensure Spotify API has a valid access token
 * Automatically refreshes token if expired or about to expire
 */
export async function ensureSpotifyAuth() {
    const now = Date.now();

    // Check if token is still valid (with 5 minute buffer)
    if (now < tokenExpiry) {
        return; // Token still valid
    }

    try {
        console.log('Refreshing Spotify access token...');
        const data = await spotifyApi.clientCredentialsGrant();
        spotifyApi.setAccessToken(data.body['access_token']);

        // Set expiry time (subtract 5 minutes as buffer)
        const expiresIn = data.body['expires_in']; // seconds
        tokenExpiry = now + ((expiresIn - 300) * 1000);

        console.log(`Spotify token refreshed. Expires in ${expiresIn} seconds`);
    } catch (error) {
        console.error('Error authenticating with Spotify:', error);
        tokenExpiry = 0; // Reset expiry on error
        throw error;
    }
}
