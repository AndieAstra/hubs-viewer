import { SceneData } from "../components/types/scene.types";

// src/app/components/types/project-data.model.ts
export interface ProjectData {
  timestamp: number;
  scene?: SceneData; // Make scene optional
  lights: { color: string; intensity: number }[];
  notes: string[];
  modelBase64?: string;
}

