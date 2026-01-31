import { Component, input, inject, ChangeDetectionStrategy, output, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ApiService } from '../../services/api';

@Component({
  selector: 'app-playback-controls',
  // standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './playback-controls.html',
  styleUrl: './playback-controls.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlaybackControlsComponent {
  // Modern Signal Inputs
  transportState = input<string>('STOPPED');
  hasNextAlbum = input<boolean>(false);
  hasQueue = input<boolean>(false);
  refresh = output<void>();

  currentTrackTitle = input<string | null>(null);
  currentTrackArtist = input<string | null>(null);
  currentAlbumTitle = input<string | null>(null);
  groupByArtist = input.required<WritableSignal<boolean>>();
  selectedArtist = input.required<WritableSignal<string | null>>();
  private api = inject(ApiService);

  skipToNextAlbum() {
    this.api.skipToNextAlbum().subscribe();
  }

  clearQueue() {
    this.api.clearQueue().subscribe();
  }

  toggleGrouping() {
    this.groupByArtist().update(val => !val);
    this.selectedArtist().set(null);
  }

  doRefresh() {
    this.refresh.emit();
  }



  previous() {
    this.api.previous().subscribe();
  }

  next() {
    this.api.next().subscribe();
  }

  resume() {
    this.api.resume().subscribe();
  }

  pause() {
    this.api.pause().subscribe();
  }

  togglePlay() {
    if (this.isPlayingOrBuffering()) {
      this.pause();
    } else {
      this.resume();
    }
  }

  isPlayingOrBuffering(): boolean {
    const state = this.transportState();
    return state === 'PLAYING' || state === 'TRANSITIONING' || state === 'BUFFERING';
  }

  volumeUp() {
    this.api.adjustVolume(5).subscribe();
  }

  volumeDown() {
    this.api.adjustVolume(-5).subscribe();
  }


}
