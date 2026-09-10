# MeshForge

MeshForge is a Windows desktop 3D creation and print-preparation workstation.

## Product rules

1. **TRELLIS.2 creates the source model inside MeshForge.** This is the canonical model for normal Export and Printer-ready Export.
2. **NVIDIA API is the primary programming/agent layer.** It plans technical operations, writes/refines Blender automation, evaluates geometry, and recommends slicer settings.
3. **Blender MCP creates a separate ultra-detail refinement.** This version should preserve the source model while improving the smallest details, topology and geometry where possible.
4. **Default export source stays TRELLIS.2.** Users can explicitly switch to the Blender-refined artifact when they want it.
5. **Generation begins with questions.** MeshForge gathers intended use, physical dimensions, strength, materials, moving parts, tolerances, detail level, surface style and other constraints before model generation.
6. **Projects start empty.** No sample models or reference images ship inside the working project.
7. **Prompt-only, files-only and mixed input are all supported.**
8. **Slicer settings are project-specific.** Recommendations use geometry, intended use, selected printer, nozzle, material and printability constraints instead of a hard-coded preset.

## Pipeline

```text
Prompt / Images / Video / Files
        |
        v
Requirements questionnaire
        |
        v
TRELLIS.2 source model -> MeshForge viewport -> canonical export artifact
        |
        +---------------------> NVIDIA API (primary programmer)
                                  |
                                  v
                              Blender MCP
                                  |
                                  v
                         Ultra-detail Blender version

Canonical source model + project constraints
        |
        v
NVIDIA slicer analysis
        |
        v
Slicer profile / orientation / supports / walls / infill
        |
        +--> Standard export (STL / 3MF / OBJ / GLB)
        +--> Printer-ready export
        +--> Direct printer connector (provider-specific)
```

## UI direction

MeshForge intentionally looks like professional CAD/engineering software rather than an AI chat product. AI services operate behind the scenes. Questions use structured engineering forms, and progress appears as workflow/status/operations rather than chat bubbles.

## Windows development

```powershell
npm install
npm run dev
```

Build a Windows installer:

```powershell
npm run dist:win
```

The installer is produced under `release/`.

## API configuration

Copy `.env.example` to a local environment configuration and provide your own credentials. Never commit real secrets.

- `NVIDIA_API_KEY`: NVIDIA API credential.
- `NVIDIA_MODEL`: configurable NVIDIA-hosted model used as the primary programmer/agent.
- `TRELLIS_API_URL`: TRELLIS.2 inference service endpoint.
- `BLENDER_MCP_URL`: local Blender MCP/bridge endpoint.

## Current status

The repository now contains the Windows Electron shell, React/Vite workstation UI, empty-project input flow, requirements dialog, TRELLIS/NVIDIA/Blender role separation, export-source selector, manufacturing profile placeholders, workflow state and packaging configuration. Real provider calls, 3D viewport rendering, Blender MCP execution and slicer/printer adapters are the next implementation layer.
