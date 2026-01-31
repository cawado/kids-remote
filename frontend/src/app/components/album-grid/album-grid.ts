import { Component, inject, signal, OnInit, OnDestroy, ChangeDetectorRef, effect, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ApiService, Album } from '../../services/api';
import { AlbumCardComponent } from '../album-card/album-card';
import { PlaybackControlsComponent } from '../playback-controls/playback-controls';
import { interval, Subscription, switchMap, catchError, of, finalize } from 'rxjs';
import { RoomService } from '../../services/room.service';

@Component({
  selector: 'app-album-grid',
  // standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule, MatIconModule, MatButtonModule, AlbumCardComponent, PlaybackControlsComponent],
  templateUrl: './album-grid.html',
  styleUrl: './album-grid.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AlbumGridComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private cdr = inject(ChangeDetectorRef);
  private roomService = inject(RoomService);

  albums = signal<Album[]>([]);
  currentAlbumTitle = signal<string | null>(null);
  currentTrackTitle = signal<string | null>(null);
  currentQueue = signal<any[]>([]); // Liste von {title, album}
  transportState = signal<string>('STOPPED');
  lastState = signal<any>(null);

  // Loading and error states
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  startingAlbumId = signal<string | null>(null);

  // Group by artist toggle and navigation
  groupByArtist = signal<boolean>(false);
  selectedArtist = signal<string | null>(null);

  // Computed list of unique artists - filtered by room
  artists = computed(() => {
    const albums = this.filteredAlbums();
    const artistSet = new Set<string>();
    albums.forEach(album => {
      const artist = album.artist || 'Unbekannter Künstler';
      artistSet.add(artist);
    });
    return Array.from(artistSet).sort((a, b) => a.localeCompare(b));
  });

  // Basic filtering by room
  filteredAlbums = computed(() => {
    const allAlbums = this.albums();
    const currentRoom = this.roomService.selectedRoom();

    if (!currentRoom) return allAlbums;

    return allAlbums.filter(album => {
      // Wenn keine Räume zugewiesen sind, gilt es für alle Räume
      if (!album.deviceNames || album.deviceNames.length === 0) return true;
      // Ansonsten muss der aktuelle Raum in der Liste sein
      return album.deviceNames.includes(currentRoom);
    });
  });

  // Computed albums to display based on view mode
  displayedAlbums = computed(() => {
    const albums = this.filteredAlbums();
    const artist = this.selectedArtist();

    if (artist) {
      // Show only albums from selected artist
      return albums.filter(album =>
        (album.artist || 'Unbekannter Künstler') === artist
      ).sort((a, b) => a.title.localeCompare(b.title));
    }

    // Show all albums (already filtered by room)
    return albums;
  });

  // Computed toggle for "Next Album" button
  hasNextAlbum = computed(() => {
    const queue = this.currentQueue();
    if (queue.length === 0) return false;

    // Find if there's any track with a different album than the first one
    const firstAlbum = this.normalize(queue[0].album);
    return queue.some(item => this.normalize(item.album) !== firstAlbum);
  });
  private pollSub: Subscription | null = null;

  constructor() {
    // Effects run in injection context
  }

  ngOnInit() {
    this.refreshAlbums();

    // Poll for state
    this.pollSub = interval(3000).pipe(
      switchMap(() => this.api.getState().pipe(catchError(() => of(null))))
    ).subscribe(state => {
      if (state) {
        // Log basic state for debugging
        if (state.queue && state.queue.length > 0 && Math.random() < 0.1) {
          console.log('Queue sample:', JSON.stringify(state.queue[0]).substring(0, 100));
        }
        this.lastState.set(state);
        this.transportState.set(state.transportState);
        this.currentQueue.set(state.queue || []);

        // Match currently playing info
        const metadata = state.trackMetaData;
        if (state.transportState !== 'STOPPED' && metadata) {
          this.currentAlbumTitle.set(metadata.Album || metadata.album || metadata.title || null);
          this.currentTrackTitle.set(metadata.title || null);
        } else {
          this.currentAlbumTitle.set(null);
          this.currentTrackTitle.set(null);
        }
      }
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy() {
    if (this.pollSub) this.pollSub.unsubscribe();
  }

  refreshAlbums() {
    this.loading.set(true);
    this.error.set(null);

    this.api.getAlbums().pipe(
      finalize(() => {
        this.loading.set(false);
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: data => {
        this.albums.set(data);
        this.cdr.markForCheck();
      },
      error: err => {
        console.error('Failed to load albums:', err);
        this.error.set('Failed to load albums. Please try again.');
        this.cdr.markForCheck();
      }
    });
  }

  playAlbum(album: Album) {
    if (!album.uri || this.startingAlbumId()) return;

    this.startingAlbumId.set(album.id || album.uri);

    this.api.playAlbum(album.uri).pipe(
      finalize(() => {
        this.startingAlbumId.set(null);
        this.cdr.markForCheck();
      })
    ).subscribe({
      error: err => {
        console.error('Failed to play album:', err);
        this.error.set('Failed to play album. Please try again.');
        this.cdr.markForCheck();
      }
    });
  }

  enqueueAlbum(album: Album, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    if (!album.uri || this.startingAlbumId()) return;

    this.startingAlbumId.set(album.id || album.uri);

    this.api.enqueueAlbum(album.uri).pipe(
      finalize(() => {
        this.startingAlbumId.set(null);
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: (response) => {
        if (response && response.queue) {
          this.currentQueue.set(response.queue);
          this.cdr.markForCheck();
        }
      },
      error: err => {
        console.error('Failed to enqueue album:', err);
        this.error.set('Failed to enqueue album. Please try again.');
        this.cdr.markForCheck();
      }
    });
  }

  selectArtist(artist: string) {
    this.selectedArtist.set(artist);
  }

  goBack() {
    this.selectedArtist.set(null);
  }

  private normalize(text: string | null | undefined): string {
    if (!text) return '';
    let normalized = text.toString()
      .toLowerCase()
      .trim()
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      // Remove leading numbers and separators like "001/", "01 - ", "1. ", "(01) "
      .replace(/^[(\[0-9\.\s\-\/\]]+/, '')
      // Remove common suffixes added by Sonos/Spotify
      .replace(/\s*\(remastered.*\)/g, '')
      .replace(/\s*\(deluxe.*\)/g, '')
      .replace(/\s*\(expanded.*\)/g, '')
      .replace(/\s*\[remastered.*\]/g, '')
      .trim();

    // For final comparison, remove all non-alphanumeric
    return normalized.replace(/[^a-z0-9]/g, '');
  }

  // Extract unique ID or meaningful string for matching
  private extractId(text: string | null | undefined): string {
    if (!text) return '';
    try {
      const unescaped = text.replace(/&amp;/g, '&');
      const decoded = decodeURIComponent(unescaped);

      // Look for Spotify IDs (22 chars)
      // We look for track/album/playlist/image IDs
      const match = decoded.match(/(?:track|album|playlist|image|track%3a|album%3a|playlist%3a)[:/]([a-zA-Z0-9]{22})/i);
      if (match) return match[1];

      // If it's a Sonos getaa URL, it often has the encoded URI in the 'u' parameter
      const uMatch = decoded.match(/[?&]u=([^&]+)/);
      if (uMatch) {
        const nestedUri = decodeURIComponent(uMatch[1]);
        const nestedMatch = nestedUri.match(/(?:track|album|playlist)[:/]([a-zA-Z0-9]{22})/i);
        if (nestedMatch) return nestedMatch[1];
      }

      // fallback: remove common query params and prefixes
      return decoded.split('?')[0].replace(/^x-sonos-spotify:/, '');
    } catch (e) {
      return text || '';
    }
  }

  clearQueue() {
    this.api.clearQueue().subscribe({
      next: () => {
        this.currentQueue.set([]);
        this.cdr.markForCheck();
      },
      error: err => console.error('Failed to clear queue:', err)
    });
  }

  isPlaying(album: Album): boolean {
    if (!album) return false;

    const state = this.lastState();
    const currentAlbumTitle = this.currentAlbumTitle();

    // 1. Try URI ID matching (precise for playing track)
    const albumUriId = this.extractId(album.uri);
    const currentTrackUri = state?.currentUri;
    if (albumUriId && currentTrackUri && this.extractId(currentTrackUri).includes(albumUriId)) {
      if (Math.random() < 0.05) console.log('Playing match (URI):', album.title);
      return true;
    }

    // 2. Try Album Art ID matching (very reliable for Spotify)
    const albumArtId = this.extractId(album.coverUrl);
    const currentArtUri = state?.trackMetaData?.albumArtURI;
    if (albumArtId && currentArtUri && (currentArtUri.includes(albumArtId) || this.extractId(currentArtUri).includes(albumArtId))) {
      if (Math.random() < 0.05) console.log('Playing match (ArtId):', album.title);
      return true;
    }

    // 3. Fallback to title matching
    const current = this.normalize(currentAlbumTitle);
    const target = this.normalize(album.title);

    // Also try against track title if available, as sometimes Sonos returns track title in Album field
    const currentTrackTitle = this.normalize(state?.trackMetaData?.title);

    const titleMatch = !!(target && (
      (current && current === target) ||
      (currentTrackTitle && currentTrackTitle === target)
    ));

    if (titleMatch && Math.random() < 0.05) console.log('Playing match (Title):', album.title);
    return titleMatch;
  }

  getQueuePosition(album: Album): number | null {
    if (!album) return null;

    const albumArtId = this.extractId(album.coverUrl);
    const normalizedTitle = this.normalize(album.title);
    const normalizedArtist = this.normalize(album.artist);

    const queue = this.currentQueue();
    const state = this.lastState();
    // Sonos track is 1-based. If missing, assume 1.
    const currentTrackNo = state?.currentTrackIndex || 1;
    const startIndex = Math.max(0, currentTrackNo - 1);

    const uniqueAlbums: { artId: string, title: string, artist: string }[] = [];
    const seen = new Set<string>();

    // Only look at tracks from current one onwards
    for (let i = startIndex; i < queue.length; i++) {
      const item = queue[i];
      const itemArtId = this.extractId(item.albumArtURI);
      const itemTitle = this.normalize(item.album || '');
      const itemArtist = this.normalize(item.artist || '');

      const key = itemTitle ? `${itemTitle}_${itemArtist}` : itemArtId;

      if (key && !seen.has(key)) {
        seen.add(key);
        uniqueAlbums.push({
          artId: itemArtId,
          title: itemTitle,
          artist: itemArtist
        });
      }
    }

    const albumKey = normalizedTitle ? `${normalizedTitle}_${normalizedArtist}` : '';

    for (let i = 0; i < uniqueAlbums.length; i++) {
      const item = uniqueAlbums[i];
      if (albumKey && item.title === normalizedTitle && item.artist === normalizedArtist) return i + 1;
      if (albumArtId && item.artId === albumArtId) return i + 1;
    }

    return null;
  }
}