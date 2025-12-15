import fs from 'fs/promises';
import path from 'path';

export interface Album {
    id: string;
    title: string;
    artist?: string;
    coverUrl: string;
    uri: string;
    type?: 'album' | 'artist' | 'playlist';
}

export class AlbumStorage {
    private filePath: string;
    private writeQueue: Promise<void> = Promise.resolve();

    constructor(filePath: string) {
        this.filePath = filePath;
    }

    /**
     * Read all albums from storage
     */
    async read(): Promise<Album[]> {
        try {
            const data = await fs.readFile(this.filePath, 'utf-8');
            const albums = JSON.parse(data || '[]');
            return albums.sort((a: Album, b: Album) => a.title.localeCompare(b.title));
        } catch (error: any) {
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
    async write(albums: Album[]): Promise<void> {
        // Queue writes to prevent concurrent write issues
        this.writeQueue = this.writeQueue.then(async () => {
            await fs.writeFile(this.filePath, JSON.stringify(albums, null, 2), 'utf-8');
        });
        return this.writeQueue;
    }

    /**
     * Find album by ID
     */
    async findById(id: string): Promise<Album | undefined> {
        const albums = await this.read();
        return albums.find(a => a.id === id);
    }

    /**
     * Find album by URI
     */
    async findByUri(uri: string): Promise<Album | undefined> {
        const albums = await this.read();
        return albums.find(a => a.uri === uri);
    }

    /**
     * Add a new album
     */
    async add(album: Omit<Album, 'id'>): Promise<Album> {
        const albums = await this.read();

        // Check if album already exists
        const existing = albums.find(a => a.uri === album.uri);
        if (existing) {
            throw new Error('Album already exists');
        }

        const newAlbum: Album = {
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
    async update(id: string, updates: Partial<Album>): Promise<Album> {
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
    async delete(id: string): Promise<boolean> {
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
