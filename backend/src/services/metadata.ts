export function unescapeXml(xml: string): string {
    if (!xml) return '';
    return xml
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
}

/**
 * Simple helper to parse Sonos DIDL-Lite XML metadata
 */
export function parseMetadata(xml: string): any {
    if (!xml || typeof xml !== 'string') return null;

    // Unescape if the string appears to be encoded XML
    if (xml.includes('&lt;')) {
        xml = unescapeXml(xml);
    }

    const result: any = {};

    // Basic regex for common fields
    const fields = {
        'title': /<(?:.*?:)?title>(.*?)<\/(?:.*?:)?title>/i,
        'Artist': /<(?:.*?:)?creator>(.*?)<\/(?:.*?:)?creator>/i,
        'Album': /<(?:.*?:)?album>(.*?)<\/(?:.*?:)?album>/i,
        'Duration': /<(?:.*?:)?duration>(.*?)<\/(?:.*?:)?duration>/i,
        'uri': /<(?:.*?:)?res.*?>(.*?)<\/(?:.*?:)?res>/i,
        'albumArtURI': /<(?:.*?:)?albumArtURI>(.*?)<\/(?:.*?:)?albumArtURI>/i,
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

    return Object.keys(result).length > 0 ? result : { raw: xml };
}
