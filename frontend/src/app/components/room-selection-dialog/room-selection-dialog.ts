import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../services/api';
import { getRoomColor, getRoomSymbol } from '../../utils/room-utils';

@Component({
  selector: 'app-room-selection-dialog',
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="room-selection-container">
      <h2 mat-dialog-title>In welchem Zimmer bist du?</h2>
      <mat-dialog-content>
        <div *ngIf="loading()" class="loading-spinner">
          <mat-spinner diameter="50"></mat-spinner>
        </div>
        
        <div *ngIf="!loading() && rooms().length === 0" class="no-rooms">
          Keine Sonos-Geräte gefunden.
        </div>

        <div *ngIf="!loading()" class="room-grid">
          <button *ngFor="let room of rooms()" 
                  mat-button 
                  class="room-button"
                  (click)="selectRoom(room.name)">
            <div class="room-icon" [style.background-color]="getRoomColor(room.name)">
              {{ getRoomSymbol(room.name) }}
            </div>
            <div class="room-name">{{ room.name }}</div>
          </button>
        </div>
      </mat-dialog-content>
    </div>
  `,
  styles: [`
    .room-selection-container {
      padding: 40px;
      text-align: center;
      background: var(--aperture-white);
      color: var(--aperture-dark);
      font-family: 'Inter', sans-serif;
    }
    h2 {
      font-size: 32px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: -1px;
      margin-bottom: 32px;
      color: var(--aperture-dark);
    }
    .room-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 24px;
      margin-top: 20px;
    }
    .room-button {
      height: auto !important;
      padding: 32px 16px !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      border-radius: 24px !important;
      background: var(--aperture-white) !important;
      border: 4px solid var(--aperture-grey) !important;
      transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    .room-button:active {
      transform: scale(0.95);
      border-color: var(--portal-blue) !important;
      box-shadow: var(--glow-blue) !important;
      background: var(--aperture-light-grey) !important;
    }
    .room-icon {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      font-weight: 900;
      color: white;
      margin-bottom: 16px;
      border: 4px solid rgba(255,255,255,0.3);
    }
    .room-name {
      font-size: 20px;
      font-weight: 700;
      text-transform: uppercase;
      font-family: 'Roboto Mono', monospace;
    }
    .loading-spinner {
      display: flex;
      justify-content: center;
      padding: 60px;
    }
  `]
})
export class RoomSelectionDialogComponent implements OnInit {
  private api = inject(ApiService);
  private dialogRef = inject(MatDialogRef<RoomSelectionDialogComponent>);

  rooms = signal<any[]>([]);
  loading = signal<boolean>(true);

  ngOnInit() {
    this.api.getRooms().subscribe({
      next: (rooms) => {
        this.rooms.set(rooms);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load rooms', err);
        this.loading.set(false);
      }
    });
  }

  selectRoom(roomName: string) {
    this.dialogRef.close(roomName);
  }

  getRoomColor(name: string) {
    return getRoomColor(name);
  }

  getRoomSymbol(name: string) {
    return getRoomSymbol(name);
  }
}
