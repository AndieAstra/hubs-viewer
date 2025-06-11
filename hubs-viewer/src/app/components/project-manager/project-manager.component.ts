import { Component } from '@angular/core';

@Component({
  selector: 'app-project-manager',
  standalone: true,
  imports: [],
 template: `
    <button (click)="saveProject()">Save Project</button>
    <button (click)="loadProject()">Load Project</button>
  `,
  styleUrl: './project-manager.component.scss'
})
export class ProjectManagerComponent {
saveProject() {
    const projectData = {
      // Example structure
      timestamp: Date.now(),
      // store models, lights, notes, etc.
    };
    localStorage.setItem('myProject', JSON.stringify(projectData));
  }

  loadProject() {
    const data = localStorage.getItem('myProject');
    if (data) {
      const projectData = JSON.parse(data);
      const oneWeekMs = 1000 * 60 * 60 * 24 * 7;
      if (Date.now() - projectData.timestamp < oneWeekMs) {
        console.log('Loaded project:', projectData);
      } else {
        console.log('Project expired, clearing...');
        localStorage.removeItem('myProject');
      }
    }
  }
}
