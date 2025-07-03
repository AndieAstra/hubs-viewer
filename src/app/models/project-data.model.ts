// // src/app/models/project-data.model.ts
// export interface ProjectData {
//   timestamp: number;
//   lights: { color: string; intensity: number }[];
//   notes: string[];
//   modelBase64?: string; // Only for localStorage (optional)
// }

import { SceneData } from "../components/types/scene.types";

// src/app/components/types/project-data.model.ts

export interface ProjectData {
  timestamp: number;
  scene: SceneData;
}
