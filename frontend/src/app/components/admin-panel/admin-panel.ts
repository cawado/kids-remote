import { Component, OnInit, OnDestroy, signal, inject, effect, ViewChild, AfterViewInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ApiService, Album } from '../../services/api';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MultiSelectSearchDialogComponent } from '../multi-select-search-dialog/multi-select-search-dialog';
import { interval, Subscription, switchMap, catchError, of, firstValueFrom } from 'rxjs';
import { MatInputModule } from '@angular/material/input'; // For input in edit if needed
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { SelectionModel } from '@angular/cdk/collections';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-admin-panel',
  // standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatTableModule,
    MatSortModule,
    MatCheckboxModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatCardModule,
    FormsModule
  ],
  templateUrl: './admin-panel.html',
  styleUrl: './admin-panel.scss'
})
export class AdminPanelComponent implements OnDestroy, AfterViewInit {
  private api = inject(ApiService);
  private dialog = inject(MatDialog);

  dataSource = new MatTableDataSource<Album>([]);
  currentAlbumTitle = signal<string | null>(null);
  displayedColumns: string[] = ['select', 'cover', 'artist', 'title'];
  private destroy$ = new Subscription();

  @ViewChild(MatSort) sort!: MatSort;

  // Selection logic for delete
  selection = new SelectionModel<Album>(true, []);

  ttsText = signal<string>('');
  isSendingTts = signal<boolean>(false);
  rooms = signal<any[]>([]);
  selectedRooms = signal<string[]>([]);
  selectedVoice = signal<string>('de-DE');

  availableVoices = [
    { label: 'Deutsch', value: 'de-DE' },
    { label: 'English', value: 'en-US' },
    { label: 'Français', value: 'fr-FR' },
    { label: 'Español', value: 'es-ES' }
  ];

  constructor() {
    this.refreshAlbums();
    this.loadRooms();

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

  ngAfterViewInit() {
    this.dataSource.sort = this.sort;

    // Custom filter to search across title and artist
    this.dataSource.filterPredicate = (data: Album, filter: string) => {
      const searchStr = filter.toLowerCase();
      return (
        data.title.toLowerCase().includes(searchStr) ||
        (data.artist?.toLowerCase().includes(searchStr) || false)
      );
    };
  }

  refreshAlbums() {
    this.api.getAlbums().subscribe(data => {
      // Sort alphabetically by title default
      data.sort((a, b) => a.title.localeCompare(b.title));
      this.dataSource.data = data;
      this.selection.clear(); // Clear selection on refresh
    });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  loadRooms() {
    this.api.getRooms().subscribe(rooms => {
      this.rooms.set(rooms);
      // Auto-select all rooms by default if nothing is selected yet
      if (rooms.length > 0 && this.selectedRooms().length === 0) {
        this.selectedRooms.set(rooms.map(r => r.name));
      }
    });
  }

  openSearchDialog() {
    const existingUris = new Set(this.dataSource.data.map(a => a.uri));
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
    const numRows = this.dataSource.data.length;
    return numSelected === numRows;
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  toggleAllRows() {
    if (this.isAllSelected()) {
      this.selection.clear();
      return;
    }

    this.selection.select(...this.dataSource.data);
  }

  async deleteSelected() {
    const selectedAlbums = this.selection.selected;
    if (selectedAlbums.length === 0) return;

    if (confirm(`Sind Sie sicher, dass Sie ${selectedAlbums.length} Alben löschen möchten?`)) {
      // Optimistic update
      const selectedIds = new Set(selectedAlbums.map(a => a.id));
      this.dataSource.data = this.dataSource.data.filter(a => !selectedIds.has(a.id));
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

  sendTTS() {
    const text = this.ttsText();
    if (!text || this.isSendingTts()) return;

    this.isSendingTts.set(true);
    this.api.sendTTS(text, this.selectedRooms(), this.selectedVoice()).subscribe({
      next: () => {
        this.ttsText.set('');
        this.isSendingTts.set(false);
      },
      error: (err) => {
        console.error('Failed to send TTS', err);
        this.isSendingTts.set(false);
      }
    });
  }
}
