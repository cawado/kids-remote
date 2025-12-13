import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();
const ALBUMS_FILE = path.join(__dirname, '../../albums.json'); // Adjusted path

router.get('/', (req: Request, res: Response) => {
    try {
        if (fs.existsSync(ALBUMS_FILE)) {
            const data = fs.readFileSync(ALBUMS_FILE, 'utf-8');
            const albums = JSON.parse(data || '[]');
            albums.sort((a: any, b: any) => a.title.localeCompare(b.title));
            res.json(albums);
        } else {
            res.json([]);
        }
    } catch (error: any) {
        res.status(500).send(`Error reading albums: ${error.message}`);
    }
});

router.post('/', (req: Request, res: Response) => {
    try {
        const album = req.body;
        if (!album.title || !album.uri) {
            res.status(400).send('Missing title or uri');
            return;
        }

        let albums: any[] = [];
        if (fs.existsSync(ALBUMS_FILE)) {
            const data = fs.readFileSync(ALBUMS_FILE, 'utf-8');
            albums = JSON.parse(data || '[]');
        }

        const existing = albums.find((a: any) => a.uri === album.uri);
        if (existing) {
            res.status(409).json({ message: 'Album already exists', album: existing });
            return;
        }

        const newAlbum = {
            id: album.id || Date.now().toString(),
            title: album.title,
            coverUrl: album.coverUrl || '',
            uri: album.uri,
            type: album.type // Persist type if provided
        };

        albums.push(newAlbum);
        fs.writeFileSync(ALBUMS_FILE, JSON.stringify(albums, null, 2));
        res.json(newAlbum);
    } catch (error: any) {
        res.status(500).send(`Error saving album: ${error.message}`);
    }
});

router.put('/:id', (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        if (fs.existsSync(ALBUMS_FILE)) {
            const data = fs.readFileSync(ALBUMS_FILE, 'utf-8');
            let albums: any[] = JSON.parse(data || '[]');

            const index = albums.findIndex((a: any) => a.id === id);
            if (index > -1) {
                albums[index] = { ...albums[index], ...updates, id };
                fs.writeFileSync(ALBUMS_FILE, JSON.stringify(albums, null, 2));
                res.json(albums[index]);
            } else {
                res.status(404).send('Album not found');
            }
        } else {
            res.status(404).send('Albums file not found');
        }
    } catch (error: any) {
        res.status(500).send(`Error updating album: ${error.message}`);
    }
});

router.delete('/:id', (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        if (fs.existsSync(ALBUMS_FILE)) {
            const data = fs.readFileSync(ALBUMS_FILE, 'utf-8');
            let albums: any[] = JSON.parse(data || '[]');

            const initialLength = albums.length;
            albums = albums.filter((a: any) => a.id !== id);

            if (albums.length < initialLength) {
                fs.writeFileSync(ALBUMS_FILE, JSON.stringify(albums, null, 2));
                res.status(204).send();
            } else {
                res.status(404).json({ message: 'Album not found' });
            }
        } else {
            res.status(204).send();
        }
    } catch (error: any) {
        res.status(500).send(`Error deleting album: ${error.message}`);
    }
});

export default router;
