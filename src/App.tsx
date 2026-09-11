import { useMemo, useRef, useState } from "react";
import {
  Box, FolderOpen, Hammer, ImagePlus, Layers3, Link2, PackageOpen,
  Printer, Settings, SlidersHorizontal, Wrench, Play, FileBox,
  RotateCcw, Move, ScanLine, Ruler, Grid3X3, Plus, Cpu,
  CircleCheck, CircleDot, Download, X, Save, FolderInput, Eye, EyeOff
} from "lucide-react";
import logo from "./assets/meshforge-logo.svg";
import { ModelViewport } from "./components/ModelViewport";
import { MeshForgeOrchestrator } from "./core/orchestrator";
import { readRuntimeConfig, saveRuntimeConfig, TrellisClient, NvidiaAgentClient, BlenderMcpClient, type RuntimeConfig } from "./core/api";
import type { MeshForgeProject, ModelArtifact, PipelineEvent, ProjectAsset } from "./core/types";

type Requirement = { label: string; value: string; placeholder: string };
const nav = [
  ["Workspace", Box], ["Parts", PackageOpen], ["Assets", FolderOpen], ["Workbench", Hammer],
  ["Mesh Tools", Wrench], ["Print Prep", Printer], ["Blender Link", Link2], ["Materials", Layers3], ["Settings", Settings]
] as const;
const initialRequirements: Requirement[] = [
  { label: "Intended use", value: "", placeholder: "What will this part be used for?" },
  { label: "Dimensions", value: "", placeholder: "Approximate width × depth × height" },
  { label: "Material", value: "", placeholder: "PLA, PETG, ABS, Resin..." },
  { label: "Detail priority", value: "", placeholder: "Maximum detail / Balanced / Fast" },
  { label: "Strength", value: "", placeholder: "Decorative / Functional / Load-bearing" },
  { label: "Moving parts", value: "", placeholder: "None, hinges, gears, sliding parts..." },
  { label: "Tolerance", value: "", placeholder: "Automatic or desired clearance" },
  { label: "Surface style", value: "", placeholder: "Smooth, mechanical, organic, textured..." }
];

export default function App() {
  const [active, setActive] = useState("Workspace");
  const [prompt, setPrompt] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [requirementsOpen, setRequirementsOpen] = useState(false);
  const [requirements, setRequirements] = useState(initialRequirements);
  const [stage, setStage] = useState(0);
  const [tool, setTool] = useState("Select");
  const [viewMode, setViewMode] = useState("Solid");
  const [sourceModel, setSourceModel] = useState<ModelArtifact>();
  const [refinedModel, setRefinedModel] = useState<ModelArtifact>();
  const [exportSource, setExportSource] = useState<"trellis" | "blender">("trellis");
  const [events, setEvents] = useState<PipelineEvent[]>([]);
  const [notice, setNotice] = useState("Ready");
  const [running, setRunning] = useState(false);
  const [settings, setSettings] = useState<RuntimeConfig>(() => readRuntimeConfig());
  const [showKey, setShowKey] = useState(false);
  const [connectionState, setConnectionState] = useState("Not tested");
  const openProjectRef = useRef<HTMLInputElement | null>(null);

  const hasInput = prompt.trim().length > 0 || files.length > 0;
  const selectedModel = exportSource === "trellis" ? sourceModel : refinedModel;
  const workflow = ["Input", "Questions", "TRELLIS.2", "NVIDIA programs Blender", "Print Prep", "Export"];
  const statusText = useMemo(() => running ? "Pipeline running" : notice, [running, notice]);

  const project = (): MeshForgeProject => ({
    id: crypto.randomUUID(), name: "Untitled Project", prompt,
    assets: files.map((f, i): ProjectAsset => ({ id: `${i}-${f.name}`, name: f.name, mime: f.type, size: f.size, kind: fileKind(f) })),
    requirements: requirements.map((r, i) => ({ key: `r${i}`, question: r.label, answer: r.value })),
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  });

  function newProject() {
    setPrompt(""); setFiles([]); setRequirements(initialRequirements); setStage(0);
    setSourceModel(undefined); setRefinedModel(undefined); setEvents([]); setNotice("New project created"); setActive("Workspace");
  }

  function saveProject() {
    const blob = new Blob([JSON.stringify({ ...project(), exportSource }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "meshforge-project.mfproject.json"; a.click();
    URL.revokeObjectURL(url); setNotice("Project saved");
  }

  async function openProject(file?: File) {
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      setPrompt(data.prompt || "");
      setRequirements(Array.isArray(data.requirements) ? initialRequirements.map((r, i) => ({ ...r, value: data.requirements[i]?.answer || "" })) : initialRequirements);
      setExportSource(data.exportSource === "blender" ? "blender" : "trellis");
      setNotice("Project opened"); setActive("Workspace");
    } catch { setNotice("Could not open project file"); }
  }

  async function runPipeline() {
    setRequirementsOpen(false); setRunning(true); setStage(2); setEvents([]);
    const orchestrator = new MeshForgeOrchestrator();
    try {
      await orchestrator.run(project(), {
        onEvent: e => { setEvents(prev => [e, ...prev].slice(0, 30)); if (e.progress && e.progress > .5) setStage(3); },
        onSourceModel: m => { setSourceModel(m); setStage(3); },
        onRefinedModel: m => { setRefinedModel(m); setStage(4); }
      });
      setStage(5); setNotice("Source model and Blender refinement are ready");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Pipeline failed");
    } finally { setRunning(false); }
  }

  function exportModel() {
    if (!selectedModel) { setNotice(`No ${exportSource === "trellis" ? "TRELLIS.2 source" : "Blender refined"} model to export`); return; }
    if (selectedModel.remoteUrl) {
      const a = document.createElement("a"); a.href = selectedModel.remoteUrl; a.download = `MeshForge-${exportSource}.${selectedModel.format}`; a.target = "_blank"; a.click();
      setNotice("Export started");
    } else setNotice("Model exists locally; bridge export support is required for this artifact");
  }

  function saveSettings() {
    saveRuntimeConfig(settings); setNotice("Settings saved"); setConnectionState("Saved — test connections");
  }

  async function testConnections() {
    saveRuntimeConfig(settings); setConnectionState("Testing...");
    const [trellis, nvidia, blender] = await Promise.all([
      new TrellisClient(settings).health(), new NvidiaAgentClient(settings).test(), new BlenderMcpClient(settings).health()
    ]);
    setConnectionState(`TRELLIS ${trellis ? "OK" : "OFF"} · NVIDIA ${nvidia ? "OK" : "OFF"} · Blender ${blender ? "OK" : "OFF"}`);
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <button className="brand" onClick={() => setActive("Workspace")}>
        <img src={logo} className="brand-logo" alt="MeshForge"/><div><strong>MeshForge</strong><span>Desktop</span></div>
      </button>
      <nav>{nav.map(([label, Icon]) => <button key={label} className={active === label ? "nav-item active" : "nav-item"} onClick={() => setActive(label)}><Icon size={18}/><span>{label}</span></button>)}</nav>
      <div className="sidebar-bottom"><div className="small-card"><span>Primary programmer</span><strong>NVIDIA API</strong><em>Programs Blender through MCP</em></div><small>MeshForge v0.3.2</small></div>
    </aside>

    <main className="main-area">
      <header className="topbar">
        <div className="project-title"><FileBox size={18}/><strong>Untitled Project</strong><span className="status-dot">{statusText}</span></div>
        <div className="top-actions">
          <button onClick={newProject}><Plus size={15}/> New</button>
          <button onClick={saveProject}><Save size={15}/> Save</button>
          <button onClick={() => openProjectRef.current?.click()}><FolderInput size={15}/> Open</button>
          <input ref={openProjectRef} hidden type="file" accept=".json" onChange={e => openProject(e.target.files?.[0])}/>
        </div>
      </header>

      {active === "Settings" ? <SettingsView settings={settings} setSettings={setSettings} showKey={showKey} setShowKey={setShowKey} saveSettings={saveSettings} testConnections={testConnections} connectionState={connectionState}/> : <>
        <section className="toolbar">{[["Select",ScanLine],["Move",Move],["Rotate",RotateCcw],["Measure",Ruler],["Grid",Grid3X3]].map(([t,I]: any) => <button key={t} className={tool === t ? "selected" : ""} onClick={() => { setTool(t); setNotice(`${t} tool selected`); }}><I size={17}/><span>{t}</span></button>)}</section>
        <section className="workspace-grid">
          <div className="left-column">
            <section className="panel references"><div className="panel-head"><strong>Project Input</strong><label className="upload-btn"><Plus size={15}/> Add files<input type="file" multiple hidden onChange={e => setFiles(Array.from(e.target.files || []))}/></label></div>
              <div className="prompt-box"><textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Describe exactly what you want to create..."/><div className="prompt-footer"><span>{files.length} files attached</span><button className="primary" disabled={!hasInput || running} onClick={() => { setRequirementsOpen(true); setStage(1); }}><Play size={15}/> Start Project</button></div></div>
              <div className="asset-drop"><ImagePlus size={28}/><strong>Prompt, images, video, documents or models</strong><span>TRELLIS.2 uses these to create the source model inside MeshForge.</span>{files.length > 0 && <div className="file-pills">{files.slice(0,6).map(f => <span key={f.name}>{f.name}</span>)}</div>}</div>
            </section>

            <section className="panel viewport"><div className="viewport-head"><span>MeshForge Viewport · {tool}</span><div>{["Solid","Wireframe","X-Ray"].map(v => <button key={v} className={viewMode === v ? "selected" : ""} onClick={() => setViewMode(v)}>{v}</button>)}</div></div>
              {sourceModel ? <ModelViewport model={sourceModel}/> : <div className="empty-stage"><img src={logo} className="empty-logo" alt=""/><strong>No TRELLIS.2 source model yet</strong><span>TRELLIS.2 models here. NVIDIA does not generate this source model.</span></div>}
            </section>

            <section className="panel manufacturing"><div className="panel-head"><strong>Manufacturing Profile</strong><SlidersHorizontal size={16}/></div><div className="spec-grid"><Spec title="Printer" value="Bambu Lab P2S" sub="Change in Settings"/><Spec title="Material" value="Automatic" sub="Per project"/><Spec title="Layer Height" value="Optimized" sub="By NVIDIA"/><Spec title="Infill" value="Optimized" sub="By NVIDIA"/><Spec title="Supports" value="Optimized" sub="By NVIDIA"/></div></section>
            <section className="panel workflow-panel"><div className="panel-head"><strong>Workflow</strong><span>{statusText}</span></div><div className="workflow">{workflow.map((w,i) => <div key={w} className={i <= stage ? "step done" : "step"}><span>{i < stage ? <CircleCheck size={18}/> : <CircleDot size={18}/>}</span><b>{w}</b></div>)}</div></section>
            <section className="panel operations"><div className="panel-head"><strong>Operations Log</strong><span>{events.length} events</span></div><table><tbody>{events.length ? events.map(e => <tr key={e.id}><td>{new Date(e.at).toLocaleTimeString()}</td><td>{e.message}</td><td>{e.detail || e.stage}</td></tr>) : <tr><td>—</td><td>Project ready</td><td>Waiting for input</td></tr>}</tbody></table></section>
          </div>

          <aside className="inspector">
            <section className="panel"><div className="panel-head"><strong>Modeling Pipeline</strong></div><PipelineItem title="TRELLIS.2" subtitle="3D modeler inside MeshForge" active={stage >= 2}/><div className="pipeline-arrow">↓</div><PipelineItem title="NVIDIA API" subtitle="Primary programmer — writes and controls Blender work" active={stage >= 3}/><div className="pipeline-arrow">↓</div><PipelineItem title="Blender" subtitle="Execution workspace connected through MCP" active={stage >= 3}/></section>
            <section className="panel"><div className="panel-head"><strong>Export Source</strong></div><div className="source-toggle"><button className={exportSource === "trellis" ? "selected" : ""} onClick={() => setExportSource("trellis")}>TRELLIS.2 Source</button><button className={exportSource === "blender" ? "selected" : ""} onClick={() => setExportSource("blender")}>Blender Refined</button></div><p className="helper">Default export/print source stays TRELLIS.2.</p></section>
            <section className="panel export-card"><button className="secondary" onClick={exportModel}><Download size={16}/> Export Model</button><button className="primary" onClick={() => setNotice(selectedModel ? "Printer-ready export will use NVIDIA slicer settings" : "Create a model first")}><Printer size={16}/> Printer-ready Export</button></section>
          </aside>
        </section>
      </>}
    </main>

    {requirementsOpen && <div className="modal-backdrop"><div className="requirements-modal"><div className="modal-head"><div><span>MODEL REQUIREMENTS</span><h2>Tell MeshForge exactly what to build</h2><p>These answers guide TRELLIS.2 first, then NVIDIA programs Blender for refinement.</p></div><button onClick={() => setRequirementsOpen(false)}><X/></button></div><div className="requirements-grid">{requirements.map((r,i) => <label key={r.label}><span>{r.label}</span><input value={r.value} onChange={e => setRequirements(prev => prev.map((x,j) => j === i ? {...x,value:e.target.value}:x))} placeholder={r.placeholder}/></label>)}</div><div className="modal-actions"><button className="secondary" onClick={() => setRequirementsOpen(false)}>Cancel</button><button className="primary" disabled={running} onClick={runPipeline}><Cpu size={16}/> Create with TRELLIS.2</button></div></div></div>}
  </div>;
}

function SettingsView({settings,setSettings,showKey,setShowKey,saveSettings,testConnections,connectionState}:{settings:RuntimeConfig;setSettings:(v:RuntimeConfig)=>void;showKey:boolean;setShowKey:(v:boolean)=>void;saveSettings:()=>void;testConnections:()=>void;connectionState:string}) {
  const field = (key:keyof RuntimeConfig,label:string,type="text") => <label className="settings-field"><span>{label}</span><div className="field-row"><input type={key === "nvidiaApiKey" && !showKey ? "password" : type} value={settings[key]} onChange={e => setSettings({...settings,[key]:e.target.value})}/>{key === "nvidiaApiKey" && <button className="icon-btn" onClick={() => setShowKey(!showKey)}>{showKey ? <EyeOff size={16}/> : <Eye size={16}/>}</button>}</div></label>;
  return <section className="settings-page"><div className="settings-title"><div><h1>Settings</h1><p>Configure the actual services MeshForge uses.</p></div><div className="settings-actions"><button className="secondary" onClick={testConnections}>Test Connections</button><button className="primary" onClick={saveSettings}>Save Settings</button></div></div><div className="settings-grid"><section className="panel settings-card"><div className="panel-head"><strong>NVIDIA — Primary Programmer</strong></div><div className="settings-body">{field("nvidiaBaseUrl","NVIDIA API URL")}{field("nvidiaApiKey","NVIDIA API Key")}{field("nvidiaModel","NVIDIA Model")}<p>NVIDIA is the main programmer. It plans and drives the Blender refinement through MCP.</p></div></section><section className="panel settings-card"><div className="panel-head"><strong>TRELLIS.2 — Source Modeler</strong></div><div className="settings-body">{field("trellisBaseUrl","TRELLIS.2 Service URL")}<p>TRELLIS.2 creates the original 3D source model shown inside MeshForge.</p></div></section><section className="panel settings-card"><div className="panel-head"><strong>Blender Connection</strong></div><div className="settings-body">{field("blenderMcpUrl","Blender MCP URL")}<p>Blender is the execution workspace. It is controlled by NVIDIA through this MCP bridge.</p></div></section><section className="panel connection-card"><strong>Connection status</strong><span>{connectionState}</span></section></div></section>;
}

function fileKind(f:File): ProjectAsset["kind"] { if (f.type.startsWith("image/")) return "image"; if (f.type.startsWith("video/")) return "video"; if (/\.(glb|gltf|obj|stl|3mf|step)$/i.test(f.name)) return "model"; if (/\.(pdf|txt|docx?)$/i.test(f.name)) return "document"; return "other"; }
function Spec({title,value,sub}:{title:string;value:string;sub:string}) { return <div className="spec"><span>{title}</span><strong>{value}</strong><small>{sub}</small></div>; }
function PipelineItem({title,subtitle,active}:{title:string;subtitle:string;active:boolean}) { return <div className="role"><div className={active ? "role-dot active" : "role-dot"}/><div><strong>{title}</strong><span>{subtitle}</span></div></div>; }
