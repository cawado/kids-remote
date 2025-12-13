import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { ApiService, Album } from '../../services/api';

@Component({
  selector: 'app-spotify-search-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatListModule,
    MatButtonModule,
    FormsModule
  ],
  templateUrl: './spotify-search-dialog.html',
  styleUrl: './spotify-search-dialog.scss'
})
export class SpotifySearchDialogComponent {
  query = '';
  results = signal<Album[]>([]);
  loading = false;

  constructor(
    private api: ApiService,
    private dialogRef: MatDialogRef<SpotifySearchDialogComponent>
  ) { }

  search() {
    if (!this.query) return;
    this.loading = true;
    this.api.searchSpotify(this.query).subscribe({
      next: (data) => {
        this.results.set(data);
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  select(album: Album) {
    this.dialogRef.close(album);
  }
}
