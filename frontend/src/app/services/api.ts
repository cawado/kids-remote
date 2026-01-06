import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Album {
  id?: string;
  title: string;
  artist?: string;
  coverUrl: string;
  uri: string;
  type?: 'album' | 'artist' | 'playlist';
  deviceNames?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = environment.apiUrl;
  private http = inject(HttpClient);

  // constructor(private http: HttpClient) { }

  getAlbums(): Observable<Album[]> {
    return this.http.get<Album[]>(`${this.apiUrl}/albums`);
  }

  addAlbum(album: Album): Observable<Album> {
    return this.http.post<Album>(`${this.apiUrl}/albums`, album);
  }

  updateAlbum(id: string, album: Album): Observable<Album> {
    return this.http.put<Album>(`${this.apiUrl}/albums/${id}`, album);
  }

  deleteAlbum(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/albums/${id}`);
  }

  getState(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/state`);
  }

  playAlbum(uri: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/play`, { uri });
  }

  enqueueAlbum(uri: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/enqueue`, { uri });
  }

  clearQueue(): Observable<any> {
    return this.http.post(`${this.apiUrl}/clear-queue`, {});
  }

  skipToNextAlbum(): Observable<any> {
    return this.http.post(`${this.apiUrl}/next-album`, {});
  }

  searchSpotify(query: string): Observable<Album[]> {
    return this.http.get<Album[]>(`${this.apiUrl}/spotify/search?q=${encodeURIComponent(query)}`);
  }

  next(): Observable<any> {
    return this.http.post(`${this.apiUrl}/next`, {});
  }

  previous(): Observable<any> {
    return this.http.post(`${this.apiUrl}/previous`, {});
  }

  stop(): Observable<any> {
    return this.http.post(`${this.apiUrl}/stop`, {});
  }

  pause(): Observable<any> {
    return this.http.post(`${this.apiUrl}/pause`, {});
  }

  setVolume(volume: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/volume`, { volume });
  }

  adjustVolume(adjustment: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/volume/relative`, { adjustment });
  }

  resume(): Observable<any> {
    return this.http.post(`${this.apiUrl}/resume`, {});
  }

  getArtistAlbums(id: string): Observable<Album[]> {
    return this.http.get<Album[]>(`${this.apiUrl}/spotify/artist/${id}/albums`);
  }

  getPlaylistAlbums(id: string): Observable<Album[]> {
    return this.http.get<Album[]>(`${this.apiUrl}/spotify/playlist/${id}/albums`);
  }

  sendTTS(text: string, deviceNames?: string[], lang?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/tts`, { text, deviceNames, lang });
  }

  getRooms(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/devices`);
  }
}
