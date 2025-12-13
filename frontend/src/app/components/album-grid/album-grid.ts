
import { Component, inject, signal, OnInit, OnDestroy, ChangeDetectorRef, effect, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, Album } from '../../services/api';
import { AlbumCardComponent } from '../album-card/album-card';
import { PlaybackControlsComponent } from '../playback-controls/playback-controls';
import { interval, Subscription, switchMap, catchError, of } from 'rxjs';

@Component({
  selector: 'app-album-grid',
  // standalone: true,
  imports: [CommonModule, AlbumCardComponent, PlaybackControlsComponent],
  templateUrl: './album-grid.html',
  styleUrl: './album-grid.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AlbumGridComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private cdr = inject(ChangeDetectorRef);

  albums = signal<Album[]>([]);
  currentAlbumTitle = signal<string | null>(null);
  transportState = signal<string>('STOPPED');

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
        this.transportState.set(state.transportState);
        if (state.transportState === 'PLAYING' && state.trackMetaData && state.trackMetaData.Album) {
          this.currentAlbumTitle.set(state.trackMetaData.Album);
        } else {
          this.currentAlbumTitle.set(null);
        }
      }
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy() {
    if (this.pollSub) this.pollSub.unsubscribe();
  }

  refreshAlbums() {
    this.api.getAlbums().subscribe(data => {
      this.albums.set(data);
      this.cdr.markForCheck(); // Explicit check needed for OnPush if async pipe isn't used for albums trigger (signals handle it usually but subscribe needs care)
      // Actually signals propagate changes, but since we are inside subscribe() which is out of zone or just async,
      // setting signal alerts consumers. Components using OnPush + Signals usually fine.
      // But verify if we need markForCheck with Signals; conceptually Signals notify the view.
    });
  }

  playAlbum(album: Album) {
    if (!album.uri) return;
    this.api.playAlbum(album.uri).subscribe();
  }

  isPlaying(album: Album): boolean {
    return this.currentAlbumTitle() === album.title;
  }
}