import { Routes } from '@angular/router';
import { AlbumGridComponent } from './components/album-grid/album-grid';
import { AdminPanelComponent } from './components/admin-panel/admin-panel';

export const routes: Routes = [
    { path: '', component: AlbumGridComponent },
    { path: 'admin', component: AdminPanelComponent }
];
