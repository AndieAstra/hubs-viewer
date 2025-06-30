import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [
    FormsModule,
    CommonModule,
    TranslateModule
  ],
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.scss']
})
export class ContactComponent {
  email = '';
  message = '';
  submitted = false;

  submitForm(): void {
    if (this.email.trim() && this.message.trim()) {
      this.submitted = true;
      this.playSound();
      console.log('Message submitted:', { email: this.email, message: this.message });
      // TODO: Add actual backend submission or API call here if needed
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
