import { Injectable } from '@angular/core';

const STORAGE_KEY = 'lumion_project_data';
const EXPIRATION_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  private readonly expiration = EXPIRATION_MS;


}
