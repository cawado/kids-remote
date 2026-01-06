import { Component, signal, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { RoomService } from './services/room.service';
import { RoomSelectionDialogComponent } from './components/room-selection-dialog/room-selection-dialog';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('client');
  private roomService = inject(RoomService);
  private dialog = inject(MatDialog);

  ngOnInit() {
    // Check if we are on the admin page
    const isAdmin = window.location.pathname.includes('/admin');

    if (!isAdmin && !this.roomService.hasSelectedRoom()) {
      this.openRoomSelection();
    }
  }

  private openRoomSelection() {
    const dialogRef = this.dialog.open(RoomSelectionDialogComponent, {
      disableClose: true,
      width: '80%',
      maxWidth: '600px'
    });

    dialogRef.afterClosed().subscribe(roomName => {
      if (roomName) {
        this.roomService.setSelectedRoom(roomName);
        // Page reload to ensure all initial requests use the new room
        window.location.reload();
      }
    });
  }
}
