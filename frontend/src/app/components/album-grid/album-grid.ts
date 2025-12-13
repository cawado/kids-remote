
import { Component, inject, signal, OnInit, OnDestroy, ChangeDetectorRef, effect, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ApiService, Album } from '../../services/api';
import { AlbumCardComponent } from '../album-card/album-card';
import { PlaybackControlsComponent } from '../playback-controls/playback-controls';
import { interval, Subscription, switchMap, catchError, of, finalize } from 'rxjs';

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

  albums = signal<Album[]>([]);
  currentAlbumTitle = signal<string | null>(null);
  transportState = signal<string>('STOPPED');

  // Loading and error states
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

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
    if (!album.uri) return;
    this.api.playAlbum(album.uri).subscribe({
      error: err => {
        console.error('Failed to play album:', err);
        this.error.set('Failed to play album. Please try again.');
        this.cdr.markForCheck();
      }
    });
  }

  isPlaying(album: Album): boolean {
    return this.currentAlbumTitle() === album.title;
  }
}