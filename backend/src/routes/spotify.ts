import { Router, Request, Response } from 'express';
import { spotifyApi, ensureSpotifyAuth } from '../services/spotify';

const router = Router();

// Middleware to ensure auth before every spotify request
router.use(async (req, res, next) => {
    try {
        await ensureSpotifyAuth();
        next();
    } catch (e) {
        res.status(500).send('Failed to authenticate with Spotify');
    }
});

router.get('/search', async (req: Request, res: Response) => {
    const query = req.query.q as string;
    if (!query) {
        res.status(400).send('Missing query');
        return;
    }

    try {
        const searchResults = await spotifyApi.search(query, ['album', 'artist', 'playlist'], { limit: 5 });

        const albums = searchResults.body.albums?.items.filter(item => item && item.name).map(item => ({
            title: item.name,
            artist: item.artists?.[0]?.name,
            coverUrl: item.images[0]?.url,
            uri: item.uri,
            type: 'album'
        })) || [];

        const playlists = searchResults.body.playlists?.items.filter(item => item && item.name).map(item => ({
            title: item.name,
            coverUrl: item.images[0]?.url,
            uri: item.uri,
            id: item.id,
            type: 'playlist'
        })) || [];

        const artists = searchResults.body.artists?.items.filter(item => item && item.name).map(item => ({
            title: item.name,
            coverUrl: item.images[0]?.url,
            uri: item.uri,
            id: item.id,
            type: 'artist'
        })) || [];

        const combined = [...albums, ...playlists, ...artists];

        const typePriority: { [key: string]: number } = {
            'artist': 1,
            'playlist': 2,
            'album': 3
        };

        combined.sort((a, b) => {
            const priorityA = typePriority[a.type as string] || 99;
            const priorityB = typePriority[b.type as string] || 99;

            if (priorityA !== priorityB) {
                return priorityA - priorityB;
            }
            return compareTitles(a.title, b.title);
        });

        res.json(combined);
    } catch (error: any) {
        console.error('Spotify error:', error);
        res.status(500).send(`Error searching Spotify: ${error.message}`);
    }
});

router.get('/artist/:id/albums', async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        let allItems: any[] = [];
        let offset = 0;
        const limit = 50;
        let keepGoing = true;

        while (keepGoing) {
            const data = await spotifyApi.getArtistAlbums(id, { limit, offset, include_groups: 'album,single' as any });
            const items = data.body.items;
            allItems = [...allItems, ...items];

            if (items.length < limit) {
                keepGoing = false;
            } else {
                offset += limit;
            }

            // Safety break to prevent infinite loops / excessive usage
            if (offset > 500) keepGoing = false;
        }

        const albums = allItems.map(item => ({
            title: item.name,
            artist: item.artists?.[0]?.name,
            coverUrl: item.images[0]?.url,
            uri: item.uri,
            type: 'album'
        }));

        albums.sort((a, b) => compareTitles(a.title, b.title));

        res.json(albums);
    } catch (error: any) {
        res.status(500).send(`Error fetching artist albums: ${error.message}`);
    }
});

router.get('/playlist/:id/albums', async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        let allItems: any[] = [];
        let offset = 0;
        const limit = 50;
        let keepGoing = true;

        while (keepGoing) {
            const data = await spotifyApi.getPlaylistTracks(id, { limit, offset });
            const items = data.body.items;
            allItems = [...allItems, ...items];

            if (items.length < limit) {
                keepGoing = false;
            } else {
                offset += limit;
            }

            // Safety break
            if (offset > 500) keepGoing = false;
        }

        const albumsMap = new Map<string, any>();
        allItems.forEach(item => {
            if (item.track && item.track.album) {
                const alb = item.track.album;
                if (!albumsMap.has(alb.id)) {
                    albumsMap.set(alb.id, {
                        title: alb.name,
                        artist: alb.artists?.[0]?.name,
                        coverUrl: alb.images[0]?.url,
                        uri: alb.uri,
                        type: 'album'
                    });
                }
            }
        });

        const albums = Array.from(albumsMap.values());
        albums.sort((a, b) => compareTitles(a.title, b.title));

        res.json(albums);
    } catch (error: any) {
        res.status(500).send(`Error fetching playlist albums: ${error.message}`);
    }
});

// Custom Sort Helper
function compareTitles(titleA: string, titleB: string): number {
    const getPriority = (str: string) => {
        // 1. Starts with Digit
        if (/^\d/.test(str)) return 1;
        // 2. Starts with One Word then Digit (e.g., "Folge 1", "Vol 2")
        // \S+ = one or more non-whitespace chars
        // \s+ = one or more whitespace chars
        // \d = digit
        if (/^\S+\s+\d/.test(str)) return 2;
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

export default router;
