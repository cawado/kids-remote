"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchQuerySchema = exports.PlaySchema = exports.VolumeAdjustmentSchema = exports.VolumeSchema = exports.AlbumUpdateSchema = exports.AlbumSchema = void 0;
const zod_1 = require("zod");
/**
 * Validation schema for album creation/update
 */
exports.AlbumSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, 'Title is required').max(200, 'Title too long'),
    uri: zod_1.z.string().startsWith('spotify:', 'URI must be a valid Spotify URI'),
    coverUrl: zod_1.z.string().url('Invalid cover URL').optional().or(zod_1.z.literal('')),
    type: zod_1.z.enum(['album', 'artist', 'playlist']).optional()
});
/**
 * Validation schema for album update (all fields optional)
 */
exports.AlbumUpdateSchema = exports.AlbumSchema.partial();
/**
 * Validation schema for volume control
 */
exports.VolumeSchema = zod_1.z.object({
    volume: zod_1.z.number().int().min(0).max(100)
});
/**
 * Validation schema for volume adjustment
 */
exports.VolumeAdjustmentSchema = zod_1.z.object({
    adjustment: zod_1.z.number().int().min(-100).max(100)
});
/**
 * Validation schema for play request
 */
exports.PlaySchema = zod_1.z.object({
    uri: zod_1.z.string().startsWith('spotify:', 'URI must be a valid Spotify URI')
});
/**
 * Validation schema for Spotify search
 */
exports.SearchQuerySchema = zod_1.z.object({
    q: zod_1.z.string().min(1, 'Search query is required').max(100)
});
