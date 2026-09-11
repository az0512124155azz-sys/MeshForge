import type { MeshForgeProject, ModelArtifact, PipelineEvent, SlicerProfile } from "./types";

const now = () => new Date().toISOString();

export type RuntimeConfig = {
  trellisBaseUrl: string;
  nvidiaBaseUrl: string;
  nvidiaApiKey: string;
  nvidiaModel: string;
  blenderMcpUrl: string;
};

const STORAGE_KEY = "meshforge.runtimeConfig";

export function readRuntimeConfig(): RuntimeConfig {
  let saved: Partial<RuntimeConfig> = {};
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    saved = {};
  }

  return {
    trellisBaseUrl: saved.trellisBaseUrl || import.meta.env.VITE_TRELLIS_API_URL || "http://127.0.0.1:7860",
    nvidiaBaseUrl: saved.nvidiaBaseUrl || import.meta.env.VITE_NVIDIA_API_URL || "https://integrate.api.nvidia.com/v1",
    nvidiaApiKey: saved.nvidiaApiKey || import.meta.env.VITE_NVIDIA_API_KEY || "",
    nvidiaModel: saved.nvidiaModel || import.meta.env.VITE_NVIDIA_MODEL || "",
    blenderMcpUrl: saved.blenderMcpUrl || import.meta.env.VITE_BLENDER_MCP_URL || "http://127.0.0.1:9876"
  };
}

export function saveRuntimeConfig(config: RuntimeConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const text = await response.text();
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${text.slice(0, 500)}`);
  return text ? JSON.parse(text) as T : ({} as T);
}

export class TrellisClient {
  constructor(private config: RuntimeConfig) {}

  async health(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.trellisBaseUrl}/health`, { method: "GET" });
      return response.ok;
    } catch { return false; }
  }

  async generate(project: MeshForgeProject, onEvent?: (event: PipelineEvent) => void): Promise<ModelArtifact> {
    onEvent?.({ id: crypto.randomUUID(), at: now(), stage: "trellis_generation", message: "TRELLIS.2 generation started", progress: 0.2 });
    const payload = {
      prompt: project.prompt,
      requirements: project.requirements,
      assets: project.assets.map(a => ({ name: a.name, path: a.path, mime: a.mime, kind: a.kind })),
      output_format: "glb"
    };
    const result = await jsonFetch<{ id?: string; model_url?: string; local_path?: string; stats?: ModelArtifact["stats"] }>(
      `${this.config.trellisBaseUrl}/v1/generate`,
      { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }
    );
    if (!result.model_url && !result.local_path) throw new Error("TRELLIS.2 returned no model artifact");
    onEvent?.({ id: crypto.randomUUID(), at: now(), stage: "trellis_ready", message: "TRELLIS.2 source model ready", progress: 0.48 });
    return {
      id: result.id || crypto.randomUUID(), source: "trellis", format: "glb",
      localPath: result.local_path, remoteUrl: result.model_url, stats: result.stats, createdAt: now()
    };
  }
}

export class NvidiaAgentClient {
  constructor(private config: RuntimeConfig) {}

  private async chat(system: string, user: string) {
    if (!this.config.nvidiaApiKey) throw new Error("NVIDIA API key is not configured");
    if (!this.config.nvidiaModel) throw new Error("NVIDIA model is not configured");
    return jsonFetch<any>(`${this.config.nvidiaBaseUrl}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${this.config.nvidiaApiKey}` },
      body: JSON.stringify({
        model: this.config.nvidiaModel,
        temperature: 0.15,
        top_p: 0.9,
        max_tokens: 6000,
        messages: [{ role: "system", content: system }, { role: "user", content: user }]
      })
    });
  }

  async test(): Promise<boolean> {
    try {
      if (!this.config.nvidiaApiKey || !this.config.nvidiaModel) return false;
      await this.chat("Reply with OK only.", "Connection test");
      return true;
    } catch { return false; }
  }

  async planBlenderRefinement(project: MeshForgeProject, source: ModelArtifact) {
    const system = `You are MeshForge's principal 3D engineering programmer. TRELLIS.2 creates the source model inside MeshForge. You do not replace TRELLIS.2. Your job is to program Blender through the Blender MCP execution bridge and produce a separate ultra-detailed refinement that preserves identity, proportions and intended dimensions. Improve tiny visible details, topology, symmetry, hard-surface quality, printability, tolerances and surface fidelity. Output valid JSON only with keys: objective, checks, blender_steps, validation, export_format.`;
    const raw = await this.chat(system, JSON.stringify({ project, source }, null, 2));
    const text = raw?.choices?.[0]?.message?.content ?? "{}";
    return JSON.parse(String(text).replace(/^```json\s*/i, "").replace(/```$/i, "").trim());
  }

  async chooseSlicerProfile(project: MeshForgeProject, source: ModelArtifact, printer: { vendor: string; model: string; nozzleMm: number; material?: string }): Promise<SlicerProfile> {
    const system = `You are MeshForge's manufacturing profile engine. Choose conservative practical FDM slicer settings from geometry metadata, intended use, material, printer and nozzle. Output JSON only with: printerVendor, printerModel, nozzleMm, material, layerHeightMm, wallLoops, topLayers, bottomLayers, infillPercent, infillPattern, supports, brimMm, orientationHint, notes. supports must be one of off, auto, tree, normal.`;
    const raw = await this.chat(system, JSON.stringify({ project, source, printer }, null, 2));
    const text = raw?.choices?.[0]?.message?.content ?? "{}";
    return JSON.parse(String(text).replace(/^```json\s*/i, "").replace(/```$/i, "").trim()) as SlicerProfile;
  }
}

export class BlenderMcpClient {
  constructor(private config: RuntimeConfig) {}

  async health(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.blenderMcpUrl}/health`, { method: "GET" });
      return response.ok;
    } catch { return false; }
  }

  async refine(source: ModelArtifact, plan: unknown, project: MeshForgeProject, onEvent?: (event: PipelineEvent) => void): Promise<ModelArtifact> {
    onEvent?.({ id: crypto.randomUUID(), at: now(), stage: "blender_refinement", message: "NVIDIA is programming Blender through MCP", progress: 0.62 });
    const result = await jsonFetch<{ id?: string; model_url?: string; local_path?: string; stats?: ModelArtifact["stats"] }>(
      `${this.config.blenderMcpUrl}/v1/refine`,
      { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ source, plan, project, output_format: "glb" }) }
    );
    if (!result.model_url && !result.local_path) throw new Error("Blender MCP returned no refined artifact");
    onEvent?.({ id: crypto.randomUUID(), at: now(), stage: "blender_ready", message: "Blender refinement ready", progress: 0.82 });
    return {
      id: result.id || crypto.randomUUID(), source: "blender", format: "glb",
      localPath: result.local_path, remoteUrl: result.model_url, stats: result.stats, createdAt: now()
    };
  }
}
