import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-bug-report',
  templateUrl: './bug-report.component.html',
  standalone: true,
  imports:[
    FormsModule,
    TranslateModule
  ],
  styleUrls: ['./bug-report.component.scss']
})
export class BugReportComponent {
  bug = {
    title: '',
    description: '',
    stepsToReproduce: '',
    browserInfo: '',
    screenshot: null as File | null
  };

  successMessage = '';

  onFileChange(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      this.bug.screenshot = file;
    }
  }

  submitBug(): void {
    const formData = new FormData();
    formData.append('title', this.bug.title);
    formData.append('description', this.bug.description);
    formData.append('steps', this.bug.stepsToReproduce);
    formData.append('browserInfo', this.bug.browserInfo);
    if (this.bug.screenshot) {
      formData.append('screenshot', this.bug.screenshot);
    }

    // TODO: Replace with real HTTP request to backend or bug tracking system
    console.log('Bug Submitted:', this.bug);

    this.successMessage = 'Thank you! Your bug has been submitted.';
    this.bug = {
      title: '',
      description: '',
      stepsToReproduce: '',
      browserInfo: '',
      screenshot: null
    };
  }
}
