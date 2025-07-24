import { Routes } from '@angular/router';
import { PanoramaViewerComponent } from './pages/panorama-viewer/panorama-viewer.component';
import { ViewerPageComponent } from './pages/viewer-page/viewer-page.component';
import { ContactComponent } from './pages/contact/contact.component';
import { BugReportComponent } from './pages/bug-report/bug-report.component';
import { StereoscopeTestComponent } from './demo/stereoscope-test/stereoscope-test.component';
import { ForestVRComponent } from './demo/forest-vr/forest-vr.component';
import { DeviceOrientationTestComponent } from './demo/device-orientation-test/device-orientation-test.component';
import { EditorFrameComponent } from './demo/test-editor/editor-frame/editor-frame.component';

export const routes: Routes = [
  { path: '', redirectTo: '3dviewer', pathMatch: 'full' },
  { path: '3dviewer', component: ViewerPageComponent },
  { path: 'panorama', component: PanoramaViewerComponent },
  { path: 'contact', component: ContactComponent },
  { path: 'bug-report', component: BugReportComponent },
  { path: 'demo/stereoscope', component: StereoscopeTestComponent },
  { path: 'demo/forest-vr', component: ForestVRComponent },
  { path: 'demo/gyroscope-test', component: DeviceOrientationTestComponent },
  { path: 'demo/editor-frame', component: EditorFrameComponent },
];
