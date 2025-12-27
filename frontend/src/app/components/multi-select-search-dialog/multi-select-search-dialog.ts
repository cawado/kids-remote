import { Component, ChangeDetectionStrategy, signal, inject, computed } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ApiService, Album } from '../../services/api';
import { debounceTime, distinctUntilChanged, switchMap, catchError, of, firstValueFrom } from 'rxjs';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { getRoomColor, getRoomSymbol } from '../../utils/room-utils';

@Component({
  selector: 'app-multi-select-search-dialog',
  // standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatInputModule,
    ReactiveFormsModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatChipsModule,
    MatSelectModule,
    MatTooltipModule
  ],
  templateUrl: './multi-select-search-dialog.html',
  styleUrl: './multi-select-search-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('detailExpand', [
      state('collapsed,void', style({ height: '0px', minHeight: '0' })),
      state('expanded', style({ height: '*' })),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ],
})
export class MultiSelectSearchDialogComponent {
  private api = inject(ApiService);
  private dialogRef = inject(MatDialogRef<MultiSelectSearchDialogComponent>);
  private data = inject(MAT_DIALOG_DATA);

  searchControl = new FormControl('');
  // Use a simple signal for table data
  searchResults = signal<Album[]>([]);

  // Selection
  selectedAlbums = signal<Set<string>>(new Set());
  selectedAlbumObjects = signal<Album[]>([]);
  existingUris = new Set<string>(this.data?.existingUris || []);

  // Table Logic
  columnsToDisplay = ['image', 'title', 'artist', 'type', 'rooms', 'action'];
  expandedElement = signal<Album | null>(null);

  // Cache for child albums of artists/playlists: Map<ParentID, Album[]>
  childrenCache = new Map<string, Album[]>();
  // Signal to trigger updates when cache changes (since Map isn't reactive)
  childrenSignal = signal<number>(0);

  isLoading = signal<boolean>(false);
  loadingChildren = signal<Set<string>>(new Set());

  // Room management
  rooms = signal<any[]>([]);
  defaultRooms = signal<string[]>([]);
  selectedRoomsForAlbums = new Map<string, string[]>();

  // Grouped results for display - This computed property is no longer needed with MatTable
  // and the new expansion logic. It can be removed or refactored if grouping is still desired
  // in a different way for the table. For now, I'll keep it as it wasn't explicitly removed
  // in the instruction, but it's likely redundant.
  groupedResults = computed(() => {
    const results = this.searchResults();
    if (results.length === 0) return [];

    // If drill down, just one group (the items themselves) effectively, 
    // or arguably no headers needed? User says "Separate them visually".
    // Usually drill down is just albums.
    // If mixed (search results), we want headers.

    // We can assume if sorted by type, we just group them.
    const groups: { type: string; items: Album[] }[] = [];

    // Ordered types preference for display order (matches backend sort)
    // Artist, Playlist, Album
    const order = ['artist', 'playlist', 'album'];

    const map = new Map<string, Album[]>();
    results.forEach(item => {
      const type = item.type || 'unknown';
      if (!map.has(type)) map.set(type, []);
      map.get(type)!.push(item);
    });

    order.forEach(type => {
      if (map.has(type)) {
        groups.push({ type, items: map.get(type)! });
      }
    });

    // Add any remaining types not in explicit order
    map.forEach((items, type) => {
      if (!order.includes(type)) {
        groups.push({ type, items });
      }
    });

    return groups;
  });

  constructor() {
    this.loadRooms();

    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => {
        if (!query || query.length < 2) return of([]);
        this.isLoading.set(true);
        this.expandedElement.set(null); // Reset expansion on new search
        return this.api.searchSpotify(query).pipe(
          catchError(() => of([])),
          // finalized is hard in pipe chain cleanly without finalize op, but we can do it in subscribe slightly loosely or use tap
        );
      })
    ).subscribe(results => {
      // Sort: Artist > Playlist > Album, then Title (Logic moved to backend but good to know)
      this.searchResults.set(results);
      this.isLoading.set(false);
    });
  }

  loadRooms() {
    this.api.getRooms().subscribe(rooms => {
      this.rooms.set(rooms);
      // Auto-select all rooms by default
      if (rooms.length > 0) {
        this.defaultRooms.set(rooms.map(r => r.name));
      }
    });
  }

  // Toggle expansion for expandable rows
  async toggleRow(element: Album) {
    if (element.type === 'album') return; // Albums don't expand

    // Toggle
    if (this.expandedElement() === element) {
      this.expandedElement.set(null);
    } else {
      this.expandedElement.set(element);
      // Fetch children if not present
      if (element.id && !this.childrenCache.has(element.id)) {
        await this.fetchChildren(element);
      }
    }
  }

  async fetchChildren(element: Album) {
    if (!element.id) return;

    const currentLoading = new Set(this.loadingChildren());
    currentLoading.add(element.id);
    this.loadingChildren.set(currentLoading);

    try {
      let children: Album[] = [];
      if (element.type === 'artist') {
        children = await firstValueFrom(this.api.getArtistAlbums(element.id));
      } else if (element.type === 'playlist') {
        children = await firstValueFrom(this.api.getPlaylistAlbums(element.id));
      }

      this.childrenCache.set(element.id, children);
      // Trigger signal update
      this.childrenSignal.update(n => n + 1);

    } catch (e) {
      console.error('Error fetching children', e);
    } finally {
      const finishedLoading = new Set(this.loadingChildren());
      finishedLoading.delete(element.id);
      this.loadingChildren.set(finishedLoading);
    }
  }

  getChildren(element: Album): Album[] {
    this.childrenSignal(); // Dependency for reactivity
    return element.id ? (this.childrenCache.get(element.id) || []) : [];
  }

  isChildrenLoading(element: Album): boolean {
    return element.id ? this.loadingChildren().has(element.id) : false;
  }

  // Selection Logic
  toggleSelection(album: Album, event?: Event) {
    if (event) event.stopPropagation();
    if (this.isAlreadyAdded(album)) return;

    const currentSet = new Set(this.selectedAlbums());
    const currentObjects = [...this.selectedAlbumObjects()];

    if (currentSet.has(album.uri)) {
      currentSet.delete(album.uri);
      const index = currentObjects.findIndex(a => a.uri === album.uri);
      if (index > -1) currentObjects.splice(index, 1);
    } else {
      currentSet.add(album.uri);
      currentObjects.push(album);
    }

    this.selectedAlbums.set(currentSet);
    this.selectedAlbumObjects.set(currentObjects);
  }

  isSelected(album: Album): boolean {
    return this.selectedAlbums().has(album.uri);
  }

  isAlreadyAdded(album: Album): boolean {
    return this.existingUris.has(album.uri);
  }

  // Select All only selects from loaded SEARCH results (top level albums)
  // Recursively selecting children would be complex UX. Let's stick to visible/top level for now?
  // Or maybe "Select All" isn't as relevant in a tree view with mixed types.
  // Let's keep it simplest: Select all TOP LEVEL 'album' types.
  selectAll() {
    const currentSet = new Set(this.selectedAlbums());
    const currentObjects = [...this.selectedAlbumObjects()];
    let changed = false;

    // Only select ALBUMS in the current view
    this.searchResults().forEach(album => {
      if (album.type === 'album' && !this.isAlreadyAdded(album) && !currentSet.has(album.uri)) {
        currentSet.add(album.uri);
        currentObjects.push(album);
        changed = true;
      }
    });

    if (changed) {
      this.selectedAlbums.set(currentSet);
      this.selectedAlbumObjects.set(currentObjects);
    }
  }

  selectAllChildren(parent: Album, event?: Event) {
    if (event) event.stopPropagation();

    const children = this.getChildren(parent);
    if (!children || children.length === 0) return;

    const currentSet = new Set(this.selectedAlbums());
    const currentObjects = [...this.selectedAlbumObjects()];
    let changed = false;

    children.forEach(child => {
      if (!this.isAlreadyAdded(child) && !currentSet.has(child.uri)) {
        currentSet.add(child.uri);
        currentObjects.push(child);
        changed = true;
      }
    });

    if (changed) {
      this.selectedAlbums.set(currentSet);
      this.selectedAlbumObjects.set(currentObjects);
    }
  }

  addSelected() {
    // Apply room assignments to selected albums
    const albumsWithRooms = this.selectedAlbumObjects().map(album => {
      const rooms = this.selectedRoomsForAlbums.get(album.uri) || this.defaultRooms();
      return { ...album, deviceNames: rooms };
    });
    this.dialogRef.close(albumsWithRooms);
  }

  updateAlbumRooms(album: Album, rooms: string[]) {
    this.selectedRoomsForAlbums.set(album.uri, rooms);
  }

  getAlbumRooms(album: Album): string[] {
    return this.selectedRoomsForAlbums.get(album.uri) || this.defaultRooms();
  }

  getRoomColor(roomName: string): string {
    return getRoomColor(roomName);
  }

  getRoomSymbol(roomName: string): string {
    return getRoomSymbol(roomName);
  }

  close() {
    this.dialogRef.close();
  }
}
