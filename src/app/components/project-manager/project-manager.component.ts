import { Component, Input } from '@angular/core';
import { StorageService } from '../../services/storage.service';
import { ProjectData } from '../../models/project-data.model';

@Component({
  selector: 'app-project-manager',
  standalone: true,
  imports: [],
  template: `
    <button (click)="save()">💾 Save</button>
    <button (click)="load()">📂 Load</button>
  `,
})

export class ProjectManagerComponent {
  @Input() lights: { color: string; intensity: number }[] = [];
  @Input() notes: string[] = [];
  @Input() modelFile?: File;

  constructor(private storage: StorageService) {}

  async save() {
    const project: ProjectData = {
      timestamp: Date.now(),
      lights: this.lights,
      notes: this.notes,
    };

    if (this.modelFile) {
      const buffer = await this.modelFile.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      project.modelBase64 = base64;
    }

    this.storage.saveSceneAsJson(project);
    alert('✅ Project saved!');
  }

  load() {
    const data = this.storage.loadProject();
    if (data) {
      console.log('Loaded project:', data);
      // TODO: Emit loaded data to AppComponent
    } else {
      alert('⚠️ No saved project found or it has expired.');
    }
  }
}
