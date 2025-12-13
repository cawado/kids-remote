"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const router = (0, express_1.Router)();
const ALBUMS_FILE = path_1.default.join(__dirname, '../../albums.json'); // Adjusted path
router.get('/', (req, res) => {
    try {
        if (fs_1.default.existsSync(ALBUMS_FILE)) {
            const data = fs_1.default.readFileSync(ALBUMS_FILE, 'utf-8');
            const albums = JSON.parse(data || '[]');
            albums.sort((a, b) => a.title.localeCompare(b.title));
            res.json(albums);
        }
        else {
            res.json([]);
        }
    }
    catch (error) {
        res.status(500).send(`Error reading albums: ${error.message}`);
    }
});
router.post('/', (req, res) => {
    try {
        const album = req.body;
        if (!album.title || !album.uri) {
            res.status(400).send('Missing title or uri');
            return;
        }
        let albums = [];
        if (fs_1.default.existsSync(ALBUMS_FILE)) {
            const data = fs_1.default.readFileSync(ALBUMS_FILE, 'utf-8');
            albums = JSON.parse(data || '[]');
        }
        const existing = albums.find((a) => a.uri === album.uri);
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
        fs_1.default.writeFileSync(ALBUMS_FILE, JSON.stringify(albums, null, 2));
        res.json(newAlbum);
    }
    catch (error) {
        res.status(500).send(`Error saving album: ${error.message}`);
    }
});
router.put('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        if (fs_1.default.existsSync(ALBUMS_FILE)) {
            const data = fs_1.default.readFileSync(ALBUMS_FILE, 'utf-8');
            let albums = JSON.parse(data || '[]');
            const index = albums.findIndex((a) => a.id === id);
            if (index > -1) {
                albums[index] = { ...albums[index], ...updates, id };
                fs_1.default.writeFileSync(ALBUMS_FILE, JSON.stringify(albums, null, 2));
                res.json(albums[index]);
            }
            else {
                res.status(404).send('Album not found');
            }
        }
        else {
            res.status(404).send('Albums file not found');
        }
    }
    catch (error) {
        res.status(500).send(`Error updating album: ${error.message}`);
    }
});
router.delete('/:id', (req, res) => {
    try {
        const { id } = req.params;
        if (fs_1.default.existsSync(ALBUMS_FILE)) {
            const data = fs_1.default.readFileSync(ALBUMS_FILE, 'utf-8');
            let albums = JSON.parse(data || '[]');
            const initialLength = albums.length;
            albums = albums.filter((a) => a.id !== id);
            if (albums.length < initialLength) {
                fs_1.default.writeFileSync(ALBUMS_FILE, JSON.stringify(albums, null, 2));
                res.status(204).send();
            }
            else {
                res.status(404).json({ message: 'Album not found' });
            }
        }
        else {
            res.status(204).send();
        }
    }
    catch (error) {
        res.status(500).send(`Error deleting album: ${error.message}`);
    }
});
exports.default = router;
