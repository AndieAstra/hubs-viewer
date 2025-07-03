import { Injectable } from '@angular/core';
import { ProjectData } from '../models/project-data.model';

const STORAGE_KEY = 'lumion_project_data';
const EXPIRATION_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  private readonly key = 'lumion_project_data';
  private readonly expiration = 1000 * 60 * 60 * 24 * 7; // 7 days

  save(data: ProjectData): void {
    localStorage.setItem(this.key, JSON.stringify(data));
  }

  load(): ProjectData | null {
    const raw = localStorage.getItem(this.key);
    if (!raw) return null;

    try {
      const data = JSON.parse(raw) as ProjectData;
      if (Date.now() - data.timestamp > this.expiration) {
        this.clear();
        return null;
      }
      return data;
    } catch {
      this.clear();
      return null;
    }
  }

  clear(): void {
    localStorage.removeItem(this.key);
  }

  saveProject(data: ProjectData) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  loadProject(): ProjectData | null {
    const json = localStorage.getItem(STORAGE_KEY);
    if (!json) return null;

    const data: ProjectData = JSON.parse(json);
    const isExpired = Date.now() - data.timestamp > EXPIRATION_MS;

    if (isExpired) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return data;
  }

  clearProject() {
    localStorage.removeItem(STORAGE_KEY);
  }
}
