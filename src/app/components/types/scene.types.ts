export interface SceneData {
  models: Array<{
    name: string;
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    scale: { x: number; y: number; z: number };
    fileName: string;
    glbBase64?: string;
  }>;
  camera: {
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
  };
  lighting: {
    ambient?: {
      color: number;
      intensity: number;
    };
    directional: {
      color: number;
      intensity: number;
      position: [number, number, number]; // This fixes the spread issue
    };
  };
}
