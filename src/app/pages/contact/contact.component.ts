import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.scss']
})
export class ContactComponent {
  email = '';
  message = '';
  submitted = false;

  submitForm(): void {
    if (this.email && this.message) {
      this.submitted = true;
      this.playSound();
      console.log('Message submitted:', { email: this.email, message: this.message });
    }
  }

  resetForm(): void {
    this.email = '';
    this.message = '';
    this.submitted = false;
  }

  playSound(): void {
    const audio = new Audio('assets/sounds/bells.wav');
    audio.play();
  }
}
