import { Routes } from '@angular/router';
import { PanoramaViewerComponent } from './components/panorama-viewer/panorama-viewer.component';
import { ViewerPageComponent } from './pages/viewer-page/viewer-page.component';

export const routes: Routes = [
  { path: '', redirectTo: '3dviewer', pathMatch: 'full' },
  { path: '3dviewer', component: ViewerPageComponent },
  { path: 'panorama', component: PanoramaViewerComponent }
];
