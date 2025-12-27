import { z } from 'zod';

/**
 * Validation schema for album creation/update
 */
export const AlbumSchema = z.object({
    title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
    artist: z.string().max(200, 'Artist name too long').optional(),
    uri: z.string().startsWith('spotify:', 'URI must be a valid Spotify URI'),
    coverUrl: z.string().url('Invalid cover URL').optional().or(z.literal('')),
    type: z.enum(['album', 'artist', 'playlist']).optional(),
    deviceNames: z.array(z.string()).optional()
});

/**
 * Validation schema for album update (all fields optional)
 */
export const AlbumUpdateSchema = AlbumSchema.partial();

/**
 * Validation schema for volume control
 */
export const VolumeSchema = z.object({
    volume: z.number().int().min(0).max(100)
});

/**
 * Validation schema for volume adjustment
 */
export const VolumeAdjustmentSchema = z.object({
    adjustment: z.number().int().min(-100).max(100)
});

/**
 * Validation schema for play request
 */
export const PlaySchema = z.object({
    uri: z.string().startsWith('spotify:', 'URI must be a valid Spotify URI')
});

/**
 * Validation schema for Spotify search
 */
export const SearchQuerySchema = z.object({
    q: z.string().min(1, 'Search query is required').max(100)
});

export type AlbumInput = z.infer<typeof AlbumSchema>;
export type AlbumUpdateInput = z.infer<typeof AlbumUpdateSchema>;
export type VolumeInput = z.infer<typeof VolumeSchema>;
export type VolumeAdjustmentInput = z.infer<typeof VolumeAdjustmentSchema>;
export type PlayInput = z.infer<typeof PlaySchema>;
export type SearchQueryInput = z.infer<typeof SearchQuerySchema>;
