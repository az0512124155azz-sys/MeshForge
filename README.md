# MeshForge

MeshForge is a professional desktop workstation for creating, refining, preparing and exporting 3D models for printing.

> **Current stage:** development preview. The desktop application and cross-platform packaging work, while the full TRELLIS.2 → NVIDIA → Blender MCP → slicer/printer pipeline is still being integrated.

## Download and install

The easiest way to install MeshForge is from **GitHub Releases**. You do not need Node.js, npm, or the source code when using a release installer.

Only installable packages are published. Portable ZIP archives are intentionally not included.

### Windows

1. Open the repository **Releases** section.
2. Download the file ending in `.exe`.
3. Run the installer.
4. Choose the installation directory and finish setup.
5. Launch **MeshForge** from the Start menu or desktop shortcut.

The current preview is not code-signed, so Windows SmartScreen may display a warning. Only continue when the installer was downloaded from the official MeshForge repository.

### macOS — Apple Silicon

Use this build for Apple M1, M2, M3, M4 and later Apple Silicon Macs.

1. Open **Releases**.
2. Download the macOS `arm64` `.dmg` installer.
3. Open the DMG.
4. Drag **MeshForge** into **Applications**.
5. Open MeshForge from Applications.

### macOS — Intel

1. Open **Releases**.
2. Download the macOS `x64` `.dmg` installer.
3. Open the DMG.
4. Drag **MeshForge** into **Applications**.
5. Open MeshForge from Applications.

The current macOS preview is not Apple-notarized. macOS may therefore block the first launch. If that happens, verify that the file came from this repository and use the macOS Privacy & Security controls to allow the app.

### Linux — AppImage

The AppImage is the simplest Linux option and does not require a traditional installation.

```bash
chmod +x MeshForge-*.AppImage
./MeshForge-*.AppImage
```

### Linux — Debian / Ubuntu

Download the `.deb` installer and run:

```bash
sudo apt install ./meshforge_*.deb
```

Then launch **MeshForge** from the application menu.

## Which download should I choose?

| System | Recommended file |
| --- | --- |
| Windows 10/11 x64 | `.exe` installer |
| macOS Apple Silicon | `arm64.dmg` |
| macOS Intel | `x64.dmg` |
| Ubuntu / Debian | `.deb` |
| Other supported x64 Linux distributions | `.AppImage` |

## First-run setup

MeshForge projects start empty. No sample images or models are bundled into a new project.

1. Start MeshForge.
2. Create or open a project.
3. Add a text prompt, reference images, video, documents, or an existing 3D model.
4. Complete the engineering requirements questions before generation. These questions establish dimensions, intended use, strength, material, moving parts, tolerances, detail level and other constraints.
5. TRELLIS.2 creates the **source model** that is displayed inside MeshForge.
6. NVIDIA acts as the primary programming/engineering agent and prepares the detailed Blender refinement plan.
7. Blender MCP builds a separate **Blender Refined** version while preserving the identity and proportions of the TRELLIS source.
8. For normal export or printer-ready export, **TRELLIS Source is the default export source**. You can explicitly switch to the Blender-refined version when desired.
9. MeshForge analyzes the selected printer, nozzle, material, geometry and intended use before recommending slicer settings.

## Required external services for AI/modeling features

Installing the desktop application alone does not yet provide the external inference and Blender services. The complete production pipeline requires:

- **NVIDIA API** — the primary programmer/agent layer.
- **TRELLIS.2 service** — generates the canonical 3D source model.
- **Blender** — required for the ultra-detail refinement stage.
- **Blender MCP / local bridge** — allows MeshForge to send controlled modeling operations to Blender.
- **A supported slicer** — later used for printer-ready output.

Real API keys are never committed to this repository.

### Development environment variables

The current development build uses Vite environment variables. Create a local `.env` file from `.env.example` before starting the development build:

```env
VITE_NVIDIA_API_URL=https://integrate.api.nvidia.com/v1
VITE_NVIDIA_API_KEY=YOUR_NVIDIA_KEY
VITE_NVIDIA_MODEL=YOUR_SELECTED_NVIDIA_MODEL
VITE_TRELLIS_API_URL=http://127.0.0.1:8090
VITE_BLENDER_MCP_URL=http://127.0.0.1:9876
```

Do **not** commit `.env` or real credentials. End-user credential management through MeshForge Settings is still part of the integration work; the preview installers do not contain a shared NVIDIA key.

## Core product rules

1. **TRELLIS.2 creates the source model inside MeshForge.** This is the canonical model for normal Export and Printer-ready Export.
2. **NVIDIA API is the primary programming/agent layer.** It plans technical operations, prepares Blender automation, evaluates geometry and recommends slicer settings.
3. **Blender MCP creates a separate ultra-detail refinement.** It should preserve the source while improving fine detail, topology, geometry and printability.
4. **Default export source stays TRELLIS.2.** Users can explicitly switch to the Blender-refined artifact.
5. **Generation begins with questions.** MeshForge collects the requirements needed to create the correct object before generation begins.
6. **Projects start empty.** No unrelated sample models or reference images ship in a working project.
7. **Prompt-only, files-only and mixed input are supported.**
8. **Slicer settings are project-specific**, based on the selected printer, nozzle, material, geometry and function.

## Pipeline

```text
Prompt / Images / Video / Files
        |
        v
Engineering requirements
        |
        v
TRELLIS.2 source model
        |
        +--> MeshForge 3D viewport
        |
        +--> Default Export / Print Source
        |
        +--> NVIDIA API — primary programmer
                  |
                  v
             Blender MCP
                  |
                  v
        Blender Refined / Ultra Detail

Selected export model + project constraints
        |
        v
NVIDIA manufacturing analysis
        |
        v
Slicer profile / orientation / supports / walls / infill
        |
        +--> STL / 3MF / OBJ / GLB
        +--> Printer-ready output
        +--> Printer connector after explicit user confirmation
```

## Build from source

### Requirements

- Node.js 22
- npm
- Git
- Windows, macOS or Linux

Clone the repository and install dependencies:

```bash
git clone https://github.com/az0512124155azz-sys/MeshForge.git
cd MeshForge
npm install
```

Run the development application:

```bash
npm run dev
```

### Build Windows

```powershell
npm run dist:win
```

Produces a Windows NSIS `.exe` installer in `release/`.

### Build macOS

```bash
npm run dist:mac
```

Produces `.dmg` installers for Apple Silicon and Intel in `release/`.

### Build Linux

```bash
npm run dist:linux
```

Produces `.deb` and `.AppImage` installer packages in `release/`.

## Automated builds

GitHub Actions builds and verifies MeshForge on Windows, macOS and Linux. Release builds collect only installable platform packages and publish them together in GitHub Releases so users do not need to search through individual Actions artifacts or unpack ZIP archives.

## UI direction

MeshForge is intentionally designed like professional CAD/engineering software rather than an AI chat application. AI services work behind the scenes. Requirements appear as engineering forms, generation progress appears as workflow/status information, and technical work appears in the operations log.

## Security

- Never commit NVIDIA, TRELLIS, Blender or printer credentials.
- Blender automation should run through the local controlled bridge rather than exposing arbitrary Blender execution to the public internet.
- Starting a physical print must require explicit confirmation.
- Production credential storage should use secure OS-backed storage rather than build-time environment variables.
