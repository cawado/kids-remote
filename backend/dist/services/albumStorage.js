"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlbumStorage = void 0;
const promises_1 = __importDefault(require("fs/promises"));
class AlbumStorage {
    constructor(filePath) {
        this.writeQueue = Promise.resolve();
        this.filePath = filePath;
    }
    /**
     * Read all albums from storage
     */
    async read() {
        try {
            const data = await promises_1.default.readFile(this.filePath, 'utf-8');
            const albums = JSON.parse(data || '[]');
            return albums.sort((a, b) => a.title.localeCompare(b.title));
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                // File doesn't exist yet, return empty array
                return [];
            }
            throw error;
        }
    }
    /**
     * Write albums to storage with queue to prevent race conditions
     */
    async write(albums) {
        // Queue writes to prevent concurrent write issues
        this.writeQueue = this.writeQueue.then(async () => {
            await promises_1.default.writeFile(this.filePath, JSON.stringify(albums, null, 2), 'utf-8');
        });
        return this.writeQueue;
    }
    /**
     * Find album by ID
     */
    async findById(id) {
        const albums = await this.read();
        return albums.find(a => a.id === id);
    }
    /**
     * Find album by URI
     */
    async findByUri(uri) {
        const albums = await this.read();
        return albums.find(a => a.uri === uri);
    }
    /**
     * Add a new album
     */
    async add(album) {
        const albums = await this.read();
        // Check if album already exists
        const existing = albums.find(a => a.uri === album.uri);
        if (existing) {
            throw new Error('Album already exists');
        }
        const newAlbum = {
            id: Date.now().toString(),
            ...album
        };
        albums.push(newAlbum);
        await this.write(albums);
        return newAlbum;
    }
    /**
     * Update an existing album
     */
    async update(id, updates) {
        const albums = await this.read();
        const index = albums.findIndex(a => a.id === id);
        if (index === -1) {
            throw new Error('Album not found');
        }
        albums[index] = { ...albums[index], ...updates, id }; // Preserve ID
        await this.write(albums);
        return albums[index];
    }
    /**
     * Delete an album by ID
     */
    async delete(id) {
        const albums = await this.read();
        const initialLength = albums.length;
        const filtered = albums.filter(a => a.id !== id);
        if (filtered.length === initialLength) {
            return false; // Album not found
        }
        await this.write(filtered);
        return true;
    }
}
exports.AlbumStorage = AlbumStorage;
