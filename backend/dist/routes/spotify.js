"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const spotify_1 = require("../services/spotify");
const router = (0, express_1.Router)();
// Middleware to ensure auth before every spotify request
router.use(async (req, res, next) => {
    try {
        await (0, spotify_1.ensureSpotifyAuth)();
        next();
    }
    catch (e) {
        res.status(500).send('Failed to authenticate with Spotify');
    }
});
router.get('/search', async (req, res) => {
    var _a, _b, _c;
    const query = req.query.q;
    if (!query) {
        res.status(400).send('Missing query');
        return;
    }
    try {
        const searchResults = await spotify_1.spotifyApi.search(query, ['album', 'artist', 'playlist'], { limit: 5 });
        const albums = ((_a = searchResults.body.albums) === null || _a === void 0 ? void 0 : _a.items.filter(item => item && item.name).map(item => {
            var _a, _b, _c;
            return ({
                title: item.name,
                artist: (_b = (_a = item.artists) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.name,
                coverUrl: (_c = item.images[0]) === null || _c === void 0 ? void 0 : _c.url,
                uri: item.uri,
                type: 'album'
            });
        })) || [];
        const playlists = ((_b = searchResults.body.playlists) === null || _b === void 0 ? void 0 : _b.items.filter(item => item && item.name).map(item => {
            var _a;
            return ({
                title: item.name,
                coverUrl: (_a = item.images[0]) === null || _a === void 0 ? void 0 : _a.url,
                uri: item.uri,
                id: item.id,
                type: 'playlist'
            });
        })) || [];
        const artists = ((_c = searchResults.body.artists) === null || _c === void 0 ? void 0 : _c.items.filter(item => item && item.name).map(item => {
            var _a;
            return ({
                title: item.name,
                coverUrl: (_a = item.images[0]) === null || _a === void 0 ? void 0 : _a.url,
                uri: item.uri,
                id: item.id,
                type: 'artist'
            });
        })) || [];
        const combined = [...albums, ...playlists, ...artists];
        const typePriority = {
            'artist': 1,
            'playlist': 2,
            'album': 3
        };
        combined.sort((a, b) => {
            const priorityA = typePriority[a.type] || 99;
            const priorityB = typePriority[b.type] || 99;
            if (priorityA !== priorityB) {
                return priorityA - priorityB;
            }
            return compareTitles(a.title, b.title);
        });
        res.json(combined);
    }
    catch (error) {
        console.error('Spotify error:', error);
        res.status(500).send(`Error searching Spotify: ${error.message}`);
    }
});
router.get('/artist/:id/albums', async (req, res) => {
    const { id } = req.params;
    try {
        let allItems = [];
        let offset = 0;
        const limit = 50;
        let keepGoing = true;
        while (keepGoing) {
            const data = await spotify_1.spotifyApi.getArtistAlbums(id, { limit, offset, include_groups: 'album,single' });
            const items = data.body.items;
            allItems = [...allItems, ...items];
            if (items.length < limit) {
                keepGoing = false;
            }
            else {
                offset += limit;
            }
            // Safety break to prevent infinite loops / excessive usage
            if (offset > 500)
                keepGoing = false;
        }
        const albums = allItems.map(item => {
            var _a, _b, _c;
            return ({
                title: item.name,
                artist: (_b = (_a = item.artists) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.name,
                coverUrl: (_c = item.images[0]) === null || _c === void 0 ? void 0 : _c.url,
                uri: item.uri,
                type: 'album'
            });
        });
        albums.sort((a, b) => compareTitles(a.title, b.title));
        res.json(albums);
    }
    catch (error) {
        res.status(500).send(`Error fetching artist albums: ${error.message}`);
    }
});
router.get('/playlist/:id/albums', async (req, res) => {
    const { id } = req.params;
    try {
        let allItems = [];
        let offset = 0;
        const limit = 50;
        let keepGoing = true;
        while (keepGoing) {
            const data = await spotify_1.spotifyApi.getPlaylistTracks(id, { limit, offset });
            const items = data.body.items;
            allItems = [...allItems, ...items];
            if (items.length < limit) {
                keepGoing = false;
            }
            else {
                offset += limit;
            }
            // Safety break
            if (offset > 500)
                keepGoing = false;
        }
        const albumsMap = new Map();
        allItems.forEach(item => {
            var _a, _b, _c;
            if (item.track && item.track.album) {
                const alb = item.track.album;
                if (!albumsMap.has(alb.id)) {
                    albumsMap.set(alb.id, {
                        title: alb.name,
                        artist: (_b = (_a = alb.artists) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.name,
                        coverUrl: (_c = alb.images[0]) === null || _c === void 0 ? void 0 : _c.url,
                        uri: alb.uri,
                        type: 'album'
                    });
                }
            }
        });
        const albums = Array.from(albumsMap.values());
        albums.sort((a, b) => compareTitles(a.title, b.title));
        res.json(albums);
    }
    catch (error) {
        res.status(500).send(`Error fetching playlist albums: ${error.message}`);
    }
});
// Custom Sort Helper
function compareTitles(titleA, titleB) {
    const getPriority = (str) => {
        // 1. Starts with Digit
        if (/^\d/.test(str))
            return 1;
        // 2. Starts with One Word then Digit (e.g., "Folge 1", "Vol 2")
        // \S+ = one or more non-whitespace chars
        // \s+ = one or more whitespace chars
        // \d = digit
        if (/^\S+\s+\d/.test(str))
            return 2;
        // 3. Others
        return 3;
    };
    const prioA = getPriority(titleA || '');
    const prioB = getPriority(titleB || '');
    if (prioA !== prioB) {
        return prioA - prioB;
    }
    // Use numeric sort for natural ordering (e.g. "Folge 1", "Folge 2", "Folge 10")
    return (titleA || '').localeCompare(titleB || '', undefined, { numeric: true, sensitivity: 'base' });
}
exports.default = router;
