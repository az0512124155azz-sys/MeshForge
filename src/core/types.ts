export type AssetKind = "image" | "video" | "model" | "document" | "other";

export type ProjectAsset = {
  id: string;
  name: string;
  path?: string;
  mime?: string;
  kind: AssetKind;
  size?: number;
};

export type RequirementAnswer = {
  key: string;
  question: string;
  answer: string;
  required?: boolean;
};

export type MeshForgeProject = {
  id: string;
  name: string;
  prompt: string;
  assets: ProjectAsset[];
  requirements: RequirementAnswer[];
  createdAt: string;
  updatedAt: string;
};

export type ModelArtifact = {
  id: string;
  source: "trellis" | "blender";
  format: "glb" | "gltf" | "obj" | "stl" | "3mf";
  localPath?: string;
  remoteUrl?: string;
  createdAt: string;
  stats?: {
    vertices?: number;
    triangles?: number;
    manifold?: boolean;
    dimensionsMm?: [number, number, number];
  };
};

export type GenerationStage =
  | "idle"
  | "requirements"
  | "trellis_upload"
  | "trellis_generation"
  | "trellis_ready"
  | "nvidia_planning"
  | "blender_refinement"
  | "blender_ready"
  | "slicer_planning"
  | "ready"
  | "failed";

export type PipelineEvent = {
  id: string;
  at: string;
  stage: GenerationStage;
  message: string;
  detail?: string;
  progress?: number;
};

export type SlicerProfile = {
  printerVendor: string;
  printerModel: string;
  nozzleMm: number;
  material: string;
  layerHeightMm: number;
  wallLoops: number;
  topLayers: number;
  bottomLayers: number;
  infillPercent: number;
  infillPattern: string;
  supports: "off" | "auto" | "tree" | "normal";
  brimMm: number;
  orientationHint?: string;
  notes: string[];
};

export type PipelineResult = {
  sourceModel: ModelArtifact;
  refinedModel?: ModelArtifact;
  slicerProfile?: SlicerProfile;
};
