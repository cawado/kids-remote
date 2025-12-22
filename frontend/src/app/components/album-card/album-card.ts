import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Album } from '../../services/api';

@Component({
  selector: 'app-album-card',
  // standalone: true, // Default in v20+
  imports: [CommonModule, MatCardModule, NgOptimizedImage, MatProgressSpinnerModule],
  templateUrl: './album-card.html',
  styleUrl: './album-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AlbumCardComponent {
  album = input.required<Album>();
  loading = input<boolean>(false);
}
