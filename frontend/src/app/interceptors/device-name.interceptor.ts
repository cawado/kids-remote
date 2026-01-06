import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { RoomService } from '../services/room.service';

export const deviceNameInterceptor: HttpInterceptorFn = (req, next) => {
    const roomService = inject(RoomService);
    const selectedRoom = roomService.selectedRoom();

    // Wir fügen den Header nur hinzu, wenn ein Raum ausgewählt ist
    // und wenn es sich NICHT um administrative Anfragen handelt.
    // Administrative Anfragen sind POST/PUT/DELETE auf /albums.
    // Wir prüfen auch, ob die URL Spotify-Suche oder ähnliches ist, 
    // dort wird der Header im Backend eventuell ignoriert, schadet aber nicht.

    const isAdminRequest = req.url.includes('/albums') && ['POST', 'PUT', 'DELETE'].includes(req.method);

    if (selectedRoom && !isAdminRequest) {
        const clonedReq = req.clone({
            setHeaders: {
                'X-Device-Name': selectedRoom
            }
        });
        return next(clonedReq);
    }

    return next(req);
};
