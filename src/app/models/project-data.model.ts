import { SceneData } from "../components/types/scene.types";

export interface ProjectData {
  timestamp: number;
  scene?: SceneData; // Make scene optional
  lights: { color: string; intensity: number }[]; // Array of light objects
  notes: string[]; // Array of notes (strings)
  modelBase64?: string; // Optional Base64 string for a model (e.g., a 3D model)
}
