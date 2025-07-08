import {Component, ViewChild, ElementRef, HostListener, AfterViewInit} from '@angular/core';
import { ViewerComponent } from '../../components/viewer/viewer.component';
import { FormsModule } from '@angular/forms';
import Shepherd from 'shepherd.js';
import 'shepherd.js/dist/css/shepherd.css';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SceneControlsService } from '../../services/scene-controls.service'
import { StorageService } from '../../services/storage.service';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

@Component({
  selector: 'app-viewer-page',
  standalone: true,
  imports: [
    ViewerComponent,
    FormsModule,
    TranslateModule
  ],
  templateUrl: './viewer-page.component.html',
  styleUrls: ['./viewer-page.component.scss'],
})
export class ViewerPageComponent implements AfterViewInit {
  @ViewChild(ViewerComponent) viewerRef!: ViewerComponent;
  @ViewChild('viewerCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  selectedFile?: File;
  sidebarCollapsed = false;
  showConsole = true;
  consoleMessages: string[] = [];

  currentLang: 'en' | 'es' = 'en';

  constructor(
    private router: Router,
    private translate: TranslateService,
    private storageService: StorageService,
    private sceneControls: SceneControlsService,
  ) {
    const savedLang = (localStorage.getItem('preferredLang') as 'en' | 'es') || 'en';
    this.currentLang = savedLang;
    this.translate.setDefaultLang('en');
    this.translate.use(this.currentLang);
  }

  @HostListener('document:fullscreenchange')
  onFullscreenChange(): void {
    this.resizeCanvas();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.resizeCanvas();
  }


  ngAfterViewInit(): void {
    this.resizeCanvas();

    this.sceneControls.viewerRef = this.viewerRef;

    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);

    if (!this.viewerRef) {
    console.error("Viewer reference not found!");
  }

    if (!localStorage.getItem('hasSeenTutorial')) {
    }
  }

  // ----- UI Console Methods -----

  logToConsole(key: string, params?: any): void {
    const timeStamp = new Date().toLocaleTimeString();
    const message = this.translate.instant(key, params);
    this.consoleMessages.push(`[${timeStamp}] ${message}`);
    if (this.consoleMessages.length > 50) {
      this.consoleMessages.shift();
    }
  }

  toggleConsole(): void {
    this.showConsole = !this.showConsole;
  }

resizeCanvas(): void {
  if (!this.canvasRef || !this.viewerRef) {
    console.error('Canvas reference or Viewer reference is missing.');
    return;
  }

  const canvas = this.canvasRef.nativeElement;
  const container = canvas.parentElement;
  if (!container) {
    console.error('Canvas container not found.');
    return;
  }

  const width = container.clientWidth;
  const height = container.clientHeight;

  console.log(`Resizing canvas to: ${width}x${height}`);

  canvas.width = width;
  canvas.height = height;

  this.viewerRef.onResize?.(width, height);
  this.viewerRef.renderer?.setSize?.(width, height);
}

  exitFullscreen(): void {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch((err) => {
        console.warn('Failed to exit fullscreen:', err);
      });
    }
  }
}
