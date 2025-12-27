/**
 * Generate a consistent color for a room name using hash-based color generation
 */
export function getRoomColor(roomName: string): string {
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < roomName.length; i++) {
        hash = roomName.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Convert to HSL for better color distribution
    const hue = Math.abs(hash % 360);
    const saturation = 65 + (Math.abs(hash) % 20); // 65-85%
    const lightness = 45 + (Math.abs(hash >> 8) % 15); // 45-60%

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/**
 * Generate initials for a room name (GitHub-style avatar)
 */
export function getRoomSymbol(roomName: string): string {
    const words = roomName.trim().split(/\s+/);

    if (words.length === 1) {
        // Single word: take first 2 characters
        return roomName.substring(0, 2).toUpperCase();
    }

    // Multiple words: take first letter of first 2 words
    return words.slice(0, 2).map(w => w[0]).join('').toUpperCase();
}
