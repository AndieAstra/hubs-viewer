import { Component, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-notes',
  standalone: true,
  imports: [
    FormsModule
  ],
template: `
    <div>
      <textarea [(ngModel)]="noteText" placeholder="Write your note here"></textarea>
      <button (click)="addNote()">Add Note</button>
    </div>
  `,
  styleUrl: './notes.component.scss'
})
export class NotesComponent {
noteText: string = '';

  @Output() noteAdded = new EventEmitter<string>();

  addNote() {
    if (this.noteText.trim()) {
      this.noteAdded.emit(this.noteText);
      this.noteText = '';
    }
  }
}
