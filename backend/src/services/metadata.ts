/**
 * Simple helper to parse Sonos DIDL-Lite XML metadata
 */
export function parseMetadata(xml: string): any {
    if (!xml || typeof xml !== 'string') return null;

    const result: any = {};

    // Basic regex for common fields
    const fields = {
        'title': /<dc:title>(.*?)<\/dc:title>/,
        'Artist': /<dc:creator>(.*?)<\/dc:creator>/,
        'Album': /<upnp:album>(.*?)<\/upnp:album>/,
        'Duration': /<duration>(.*?)<\/duration>/,
    };

    for (const [key, regex] of Object.entries(fields)) {
        const match = xml.match(regex);
        if (match && match[1]) {
            // Unescape common XML entities
            result[key] = match[1]
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&apos;/g, "'");
        }
    }

    return Object.keys(result).length > 0 ? result : xml;
}
