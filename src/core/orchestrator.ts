import { BlenderMcpClient, NvidiaAgentClient, readRuntimeConfig, TrellisClient } from "./api";
import type { MeshForgeProject, ModelArtifact, PipelineEvent, PipelineResult } from "./types";

export type OrchestratorCallbacks = {
  onEvent?: (event: PipelineEvent) => void;
  onSourceModel?: (model: ModelArtifact) => void;
  onRefinedModel?: (model: ModelArtifact) => void;
};

export class MeshForgeOrchestrator {
  private config = readRuntimeConfig();
  private trellis = new TrellisClient(this.config);
  private nvidia = new NvidiaAgentClient(this.config);
  private blender = new BlenderMcpClient(this.config);

  async run(project: MeshForgeProject, callbacks: OrchestratorCallbacks = {}): Promise<PipelineResult> {
    const emit = callbacks.onEvent;

    emit?.({
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      stage: "trellis_upload",
      message: "Preparing project input for TRELLIS.2",
      progress: 0.08
    });

    const sourceModel = await this.trellis.generate(project, emit);
    callbacks.onSourceModel?.(sourceModel);

    emit?.({
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      stage: "nvidia_planning",
      message: "NVIDIA agent is planning Blender refinement",
      progress: 0.54
    });

    const refinementPlan = await this.nvidia.planBlenderRefinement(project, sourceModel);
    const refinedModel = await this.blender.refine(sourceModel, refinementPlan, project, emit);
    callbacks.onRefinedModel?.(refinedModel);

    emit?.({
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      stage: "ready",
      message: "Source and refined models are ready",
      progress: 1
    });

    return { sourceModel, refinedModel };
  }

  async buildSlicerProfile(project: MeshForgeProject, sourceModel: ModelArtifact, printer: { vendor: string; model: string; nozzleMm: number; material?: string }) {
    return this.nvidia.chooseSlicerProfile(project, sourceModel, printer);
  }

  async checkConnections() {
    const [trellis, blender] = await Promise.all([this.trellis.health(), this.blender.health()]);
    return {
      trellis,
      blender,
      nvidiaConfigured: Boolean(this.config.nvidiaApiKey && this.config.nvidiaModel)
    };
  }
}
