import { Component, HostListener, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { filter } from 'rxjs/operators';

@Component({
  selector   : 'app-root',
  standalone : true,
  imports    : [RouterModule, TranslateModule],
  templateUrl: './app.component.html',
  styleUrl   : './app.component.scss'
})
export class AppComponent implements OnInit {

  isMobile         = window.innerWidth <= 768;
  @HostListener('window:resize')
  onResize() { this.isMobile = window.innerWidth <= 768; }

  dropdownOpen     = false;
  secondaryOpen    = false;
  langDropdownOpen = false;


  constructor(
    private router   : Router,
    private translate: TranslateService
  ) {
    /* ─────── i18n set‑up ─────── */
    translate.addLangs(['en', 'es', 'yq']);
    translate.setDefaultLang('en');

    const saved   = localStorage.getItem('preferredLang');
    const browser = translate.getBrowserLang();

    if (saved && ['en', 'es', 'yq'].includes(saved))       translate.use(saved);
    else if (browser && ['en', 'es', 'yq'].includes(browser)) translate.use(browser);
    else                                             translate.use('en');

    /* Collapse the menu after every successful navigation */
    router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => (this.dropdownOpen = false));
  }


  ngOnInit(){
     this.isMobile = window.innerWidth <= 768;
  }

  /* ─────── menu helpers ─────── */
  toggleLangDropdown() { this.langDropdownOpen = !this.langDropdownOpen; }
  toggleDropdown()      { this.dropdownOpen   = !this.dropdownOpen; }
  toggleSecondary()     { this.secondaryOpen  = !this.secondaryOpen; }

  goto(path: string) {
    this.router.navigate([path]);
    this.dropdownOpen   = false;
    this.secondaryOpen  = false;
    this.langDropdownOpen = false;
  }

  /* ─────── language switcher (optional) ─────── */
  useLanguage(lang: 'en' | 'es' | 'yq'): void {
      this.translate.use(lang);
      localStorage.setItem('preferredLang', lang);
      this.langDropdownOpen = false;
    }

}
