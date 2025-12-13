import { Router, Request, Response } from 'express';
import path from 'path';
import { AlbumStorage } from '../services/albumStorage';
import { AppError, asyncHandler } from '../middleware/errorHandler';

const router = Router();
const ALBUMS_FILE = path.join(__dirname, '../../albums.json');
const albumStorage = new AlbumStorage(ALBUMS_FILE);

// GET all albums
router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const albums = await albumStorage.read();
    res.json(albums);
}));

// POST new album
router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const { title, uri, coverUrl, type } = req.body;

    if (!title || !uri) {
        throw new AppError(400, 'Missing title or uri');
    }

    try {
        const newAlbum = await albumStorage.add({
            title,
            uri,
            coverUrl: coverUrl || '',
            type
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
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
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
