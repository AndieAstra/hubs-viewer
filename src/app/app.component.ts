import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { UploaderComponent } from './components/uploader/uploader.component';
import { ViewerComponent } from './components/viewer/viewer.component';
import { LightingComponent } from './components/lighting/lighting.component';
import { NotesComponent } from './components/notes/notes.component';
import { ProjectManagerComponent } from './components/project-manager/project-manager.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    UploaderComponent,
    ViewerComponent,
    LightingComponent,
    NotesComponent,
    ProjectManagerComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})



export class AppComponent {
  selectedFile?: File;
  lights: { color: string; intensity: number }[] = [];
  notes: string[] = [];

  onFileLoaded(file: File) {
    this.selectedFile = file;
  }

  onLightAdded(light: { color: string; intensity: number }) {
    this.lights.push(light);
    console.log('Light added:', light);
  }

  onNoteAdded(note: string) {
    this.notes.push(note);
    console.log('Note added:', note);
  }
}
