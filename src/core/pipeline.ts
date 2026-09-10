export type ModelingRequirements = {
  intendedUse: string;
  dimensions?: string;
  material?: string;
  detailPriority?: string;
  strength?: string;
  movingParts?: string;
  tolerance?: string;
  surfaceStyle?: string;
  extraInstructions?: string;
};

export type ProjectInput = {
  prompt?: string;
  assetPaths: string[];
  requirements: ModelingRequirements;
};

export type MeshArtifact = {
  id: string;
  source: "trellis" | "blender";
  format: "glb" | "stl" | "3mf" | "obj";
  path: string;
  createdAt: string;
};

export type SlicerRecommendation = {
  printerId: string;
  nozzleMm: number;
  layerHeightMm: number;
  walls: number;
  infillPercent: number;
  infillPattern: string;
  supports: boolean;
  supportStyle?: string;
  brim: boolean;
  orientationNotes: string;
  reasoningSummary: string;
};

export const PIPELINE = [
  "collect-input",
  "clarify-requirements",
  "trellis-source-model",
  "nvidia-plan-blender-refinement",
  "blender-mcp-refinement",
  "printability-analysis",
  "nvidia-slicer-recommendation",
  "slice-or-export"
] as const;

export const DEFAULT_EXPORT_SOURCE: MeshArtifact["source"] = "trellis";
