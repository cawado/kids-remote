import { Component, input, inject, ChangeDetectionStrategy, output, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ApiService } from '../../services/api';

@Component({
  selector: 'app-playback-controls',
  // standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatSlideToggleModule],
  templateUrl: './playback-controls.html',
  styleUrl: './playback-controls.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlaybackControlsComponent {
  // Modern Signal Inputs
  transportState = input<string>('STOPPED');
  groupByArtist = input.required<WritableSignal<boolean>>();
  selectedArtist = input.required<WritableSignal<string | null>>();
  private api = inject(ApiService);

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

  onToggleChange(event: any) {
    this.groupByArtist().set(event.checked);
    this.selectedArtist().set(null);
  }
}
