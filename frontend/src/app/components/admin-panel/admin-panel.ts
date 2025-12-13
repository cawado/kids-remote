import { Component, OnInit, OnDestroy, signal, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ApiService, Album } from '../../services/api';
import { MatTableModule } from '@angular/material/table';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MultiSelectSearchDialogComponent } from '../multi-select-search-dialog/multi-select-search-dialog';
import { interval, Subscription, switchMap, catchError, of, firstValueFrom } from 'rxjs';
import { MatInputModule } from '@angular/material/input'; // For input in edit if needed
import { MatCheckboxModule } from '@angular/material/checkbox';
import { SelectionModel } from '@angular/cdk/collections';

@Component({
  selector: 'app-admin-panel',
  // standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatTableModule,
    MatCheckboxModule,
    MatInputModule
  ],
  templateUrl: './admin-panel.html',
  styleUrl: './admin-panel.scss'
})
export class AdminPanelComponent implements OnDestroy {
  private api = inject(ApiService);
  private dialog = inject(MatDialog);

  albums = signal<Album[]>([]);
  currentAlbumTitle = signal<string | null>(null);
  displayedColumns: string[] = ['select', 'cover', 'title'];
  private destroy$ = new Subscription();

  // Selection logic for delete
  selection = new SelectionModel<Album>(true, []);

  constructor() {
    this.refreshAlbums();

    // Poll state every 3 seconds for highlight
    this.destroy$.add(
      interval(3000).pipe(
        switchMap(() => this.api.getState().pipe(catchError(() => of(null))))
      ).subscribe(state => {
        if (state && state.transportState === 'PLAYING') {
          if (state.trackMetaData && state.trackMetaData.Album) {
            // Match by Album Title since URI is track-specific
            this.currentAlbumTitle.set(state.trackMetaData.Album);
          } else {
            this.currentAlbumTitle.set(null);
          }
        } else {
          this.currentAlbumTitle.set(null);
        }
      })
    );
  }

  ngOnDestroy() {
    this.destroy$.unsubscribe();
  }

  refreshAlbums() {
    this.api.getAlbums().subscribe(data => {
      // Sort alphabetically by title default
      data.sort((a, b) => a.title.localeCompare(b.title));
      this.albums.set(data);
      this.selection.clear(); // Clear selection on refresh
    });
  }

  openSearchDialog() {
    const existingUris = new Set(this.albums().map(a => a.uri));
    const dialogRef = this.dialog.open(MultiSelectSearchDialogComponent, {
      width: '90%',
      maxWidth: '800px',
      maxHeight: '90vh',
      data: { existingUris }
    });

    dialogRef.afterClosed().subscribe((result: Album[]) => {
      if (result && result.length > 0) {
        this.addAlbums(result);
      }
    });
  }

  async addAlbums(albumsToAdd: Album[]) {
    // Simple sequential add for now
    for (const album of albumsToAdd) {
      try {
        await firstValueFrom(this.api.addAlbum(album));
      } catch (e) {
        console.error('Failed to add album', album.title, e);
      }
    }
    this.refreshAlbums();
  }

  /** Whether the number of selected elements matches the total number of rows. */
  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.albums().length;
    return numSelected === numRows;
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  toggleAllRows() {
    if (this.isAllSelected()) {
      this.selection.clear();
      return;
    }

    this.selection.select(...this.albums());
  }

  async deleteSelected() {
    const selectedAlbums = this.selection.selected;
    if (selectedAlbums.length === 0) return;

    if (confirm(`Sind Sie sicher, dass Sie ${selectedAlbums.length} Alben löschen möchten?`)) {
      // Optimistic update
      const selectedIds = new Set(selectedAlbums.map(a => a.id));
      this.albums.update(current => current.filter(a => !selectedIds.has(a.id)));
      this.selection.clear();

      // Perform deletions
      for (const album of selectedAlbums) {
        if (album.id) {
          try {
            await firstValueFrom(this.api.deleteAlbum(album.id));
          } catch (err) {
            console.error(`Failed to delete album ${album.title}`, err);
            // Could implement a revert strategy here if needed, but for now just logging
          }
        }
      }
      // Final refresh to ensure consistency
      this.refreshAlbums();
    }
  }



  trackByAlbumId(index: number, album: Album): string {
    return album.id || album.uri;
  }

  isPlaying(album: Album): boolean {
    return this.currentAlbumTitle() === album.title;
  }
}
