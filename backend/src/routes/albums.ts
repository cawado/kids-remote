import { Router, Request, Response } from 'express';
import path from 'path';
import { AlbumStorage } from '../services/albumStorage';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { validateBody } from '../middleware/validation';
import { AlbumSchema, AlbumUpdateSchema } from '../validation/schemas';
import { config } from '../config';

const router = Router();
const ALBUMS_FILE = path.join(__dirname, '../../albums.json');
const albumStorage = new AlbumStorage(ALBUMS_FILE);

// GET all albums
router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const albums = await albumStorage.read();
    // Ensure all albums have deviceNames, default to config.defaultDeviceName
    const albumsWithDevices = albums.map(album => ({
        ...album,
        deviceNames: album.deviceNames && album.deviceNames.length > 0
            ? album.deviceNames
            : [config.defaultDeviceName]
    }));
    res.json(albumsWithDevices);
}));

// POST new album
router.post('/', validateBody(AlbumSchema), asyncHandler(async (req: Request, res: Response) => {
    const { title, artist, uri, coverUrl, type, deviceNames } = req.body;

    try {
        const newAlbum = await albumStorage.add({
            title,
            artist,
            uri,
            coverUrl: coverUrl || '',
            type,
            deviceNames
        });
        res.json(newAlbum);
    } catch (error: any) {
        if (error.message === 'Album already exists') {
            const existing = await albumStorage.findByUri(uri);
            throw new AppError(409, 'Album already exists');
        }
        throw error;
    }
}));

// PUT update album
router.put('/:id', validateBody(AlbumUpdateSchema), asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body;

    try {
        const updatedAlbum = await albumStorage.update(id, updates);
        res.json(updatedAlbum);
    } catch (error: any) {
        if (error.message === 'Album not found') {
            throw new AppError(404, 'Album not found');
        }
        throw error;
    }
}));

// DELETE album
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const deleted = await albumStorage.delete(id);

    if (!deleted) {
        throw new AppError(404, 'Album not found');
    }

    res.status(204).send();
}));

export default router;
