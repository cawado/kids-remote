import { Injectable, signal, computed } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class RoomService {
  private readonly STORAGE_KEY = 'selected_sonos_room';
  
  private selectedRoomSignal = signal<string | null>(this.loadFromStorage());

  readonly selectedRoom = computed(() => this.selectedRoomSignal());
  
  constructor() { }

  setSelectedRoom(roomName: string): void {
    this.selectedRoomSignal.set(roomName);
    this.saveToStorage(roomName);
  }

  hasSelectedRoom(): boolean {
    return !!this.selectedRoomSignal();
  }

  private loadFromStorage(): string | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem(this.STORAGE_KEY);
    }
    return null;
  }

  private saveToStorage(roomName: string): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(this.STORAGE_KEY, roomName);
    }
  }
}
