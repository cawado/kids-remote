"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const path_1 = __importDefault(require("path"));
const albumStorage_1 = require("../services/albumStorage");
const errorHandler_1 = require("../middleware/errorHandler");
const validation_1 = require("../middleware/validation");
const schemas_1 = require("../validation/schemas");
const router = (0, express_1.Router)();
const ALBUMS_FILE = path_1.default.join(__dirname, '../../albums.json');
const albumStorage = new albumStorage_1.AlbumStorage(ALBUMS_FILE);
// GET all albums
router.get('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const albums = await albumStorage.read();
    res.json(albums);
}));
// POST new album
router.post('/', (0, validation_1.validateBody)(schemas_1.AlbumSchema), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { title, artist, uri, coverUrl, type } = req.body;
    try {
        const newAlbum = await albumStorage.add({
            title,
            artist,
            uri,
            coverUrl: coverUrl || '',
            type
        });
        res.json(newAlbum);
    }
    catch (error) {
        if (error.message === 'Album already exists') {
            const existing = await albumStorage.findByUri(uri);
            throw new errorHandler_1.AppError(409, 'Album already exists');
        }
        throw error;
    }
}));
// PUT update album
router.put('/:id', (0, validation_1.validateBody)(schemas_1.AlbumUpdateSchema), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    try {
        const updatedAlbum = await albumStorage.update(id, updates);
        res.json(updatedAlbum);
    }
    catch (error) {
        if (error.message === 'Album not found') {
            throw new errorHandler_1.AppError(404, 'Album not found');
        }
        throw error;
    }
}));
// DELETE album
router.delete('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const deleted = await albumStorage.delete(id);
    if (!deleted) {
        throw new errorHandler_1.AppError(404, 'Album not found');
    }
    res.status(204).send();
}));
exports.default = router;
