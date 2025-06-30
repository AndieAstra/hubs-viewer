import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Router } from '@angular/router';
import {TranslateModule, TranslateService} from "@ngx-translate/core";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, TranslateModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {

dropdownOpen = false;

constructor(
 private router: Router,
    private translate: TranslateService
  ) {
    this.translate.addLangs(['en', 'es']);
    this.translate.setDefaultLang('en');

    // Use preferred language from localStorage or browser lang fallback
    const savedLang = localStorage.getItem('preferredLang');
    const browserLang = this.translate.getBrowserLang();

    if (savedLang && ['en', 'es'].includes(savedLang)) {
      this.translate.use(savedLang);
    } else if (browserLang && ['en', 'es'].includes(browserLang)) {
      this.translate.use(browserLang);
    } else {
      this.translate.use('en');
    }
  }

  useLanguage(language: string): void {
    this.translate.use(language);
    localStorage.setItem('preferredLang', language);
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }

  toggleDropdown(): void {
    this.dropdownOpen = !this.dropdownOpen;
  }

}
