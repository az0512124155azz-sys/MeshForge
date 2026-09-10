import { useMemo, useState } from "react";
import {
  Box, FolderOpen, Hammer, ImagePlus, Layers3, Link2, PackageOpen,
  Printer, Settings, SlidersHorizontal, Wrench, Upload, Play, FileBox,
  RotateCcw, Move, ScanLine, Ruler, Grid3X3, ChevronDown, Plus, Cpu,
  CircleCheck, CircleDot, Download, Sparkles, X
} from "lucide-react";

type Requirement = {
  label: string;
  value: string;
  placeholder: string;
};

const nav = [
  ["Workspace", Box], ["Parts", PackageOpen], ["Assets", FolderOpen],
  ["Workbench", Hammer], ["Mesh Tools", Wrench], ["Print Prep", Printer],
  ["Blender Link", Link2], ["Materials", Layers3], ["Settings", Settings]
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
  const [exportSource, setExportSource] = useState<"trellis" | "blender">("trellis");

  const hasInput = prompt.trim().length > 0 || files.length > 0;
  const workflow = ["Input", "Questions", "TRELLIS.2", "NVIDIA → Blender", "Print Prep", "Export"];

  const statusText = useMemo(() => {
    if (!hasInput) return "Waiting for a prompt or reference files";
    if (stage === 0) return "Ready to collect requirements";
    if (stage === 1) return "Requirements in progress";
    if (stage === 2) return "TRELLIS.2 source model queued";
    if (stage === 3) return "NVIDIA refinement in Blender queued";
    return "Project pipeline ready";
  }, [hasInput, stage]);

  function updateRequirement(index: number, value: string) {
    setRequirements(prev => prev.map((r, i) => i === index ? { ...r, value } : r));
  }

  function beginProject() {
    if (!hasInput) return;
    setRequirementsOpen(true);
    setStage(1);
  }

  function submitRequirements() {
    setRequirementsOpen(false);
    setStage(2);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Box size={24} strokeWidth={1.7}/></div>
          <div><strong>MeshForge</strong><span>Desktop</span></div>
        </div>
        <nav>
          {nav.map(([label, Icon]) => (
            <button key={label} className={active === label ? "nav-item active" : "nav-item"} onClick={() => setActive(label)}>
              <Icon size={18}/><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="small-card"><span>Primary programmer</span><strong>NVIDIA API</strong><em>Ready to configure</em></div>
          <div className="tagline">Built for<br/><b>Real Makers.</b></div>
          <small>MeshForge v0.3.0</small>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="project-title"><FileBox size={18}/><strong>Untitled Project</strong><ChevronDown size={16}/><span className="status-dot">Draft</span></div>
          <div className="top-actions"><button>Save</button><button>Open</button><div className="avatar">A</div></div>
        </header>

        <section className="toolbar">
          {[ ["Select", ScanLine], ["Move", Move], ["Rotate", RotateCcw], ["Measure", Ruler], ["Grid", Grid3X3] ].map(([t, I]: any) => <button key={t}><I size={17}/><span>{t}</span></button>)}
        </section>

        <section className="workspace-grid">
          <div className="left-column">
            <section className="panel references">
              <div className="panel-head"><strong>Project Input</strong><label className="upload-btn"><Plus size={15}/> Add files<input type="file" multiple hidden onChange={e => setFiles(Array.from(e.target.files || []))}/></label></div>
              <div className="prompt-box">
                <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Describe exactly what you want to create. You can start with only a prompt, only reference files, or both." />
                <div className="prompt-footer"><span>{files.length} files attached</span><button className="primary" disabled={!hasInput} onClick={beginProject}><Play size={15}/> Start Project</button></div>
              </div>
              <div className="asset-drop">
                <ImagePlus size={28}/>
                <strong>Reference images, video and files</strong>
                <span>Images, video, STL, OBJ, GLB, 3MF, STEP, PDF and more</span>
                {files.length > 0 && <div className="file-pills">{files.slice(0,5).map(f => <span key={f.name}>{f.name}</span>)}</div>}
              </div>
            </section>

            <section className="panel viewport">
              <div className="viewport-head"><span>Perspective</span><div><button className="selected">Solid</button><button>Wireframe</button><button>X-Ray</button></div></div>
              <div className="empty-stage">
                <div className="mesh-placeholder"><Box size={72}/></div>
                <strong>No source model yet</strong>
                <span>TRELLIS.2 will create the source model here inside MeshForge.</span>
                <small>The Blender refinement is a separate enhanced version.</small>
              </div>
            </section>

            <section className="panel manufacturing">
              <div className="panel-head"><strong>Manufacturing Profile</strong><SlidersHorizontal size={16}/></div>
              <div className="spec-grid">
                <Spec title="Printer" value="Bambu Lab P2S" sub="Default — change in Settings"/>
                <Spec title="Material" value="Automatic" sub="Selected by project needs"/>
                <Spec title="Layer Height" value="AI optimized" sub="Based on geometry & nozzle"/>
                <Spec title="Infill" value="AI optimized" sub="Pattern + density"/>
                <Spec title="Supports" value="AI optimized" sub="Orientation-aware"/>
              </div>
            </section>

            <section className="panel workflow-panel">
              <div className="panel-head"><strong>Workflow</strong><span>{statusText}</span></div>
              <div className="workflow">
                {workflow.map((w, i) => <div key={w} className={i <= stage ? "step done" : "step"}><span>{i < stage ? <CircleCheck size={18}/> : <CircleDot size={18}/>}</span><b>{w}</b></div>)}
              </div>
            </section>

            <section className="panel operations">
              <div className="panel-head"><strong>Operations Log</strong><span>Technical activity only</span></div>
              <table><tbody>
                <tr><td>—</td><td>Project created</td><td>Waiting for input</td></tr>
                {stage >= 1 && <tr><td>Now</td><td>Requirements opened</td><td>Collecting modeling constraints</td></tr>}
                {stage >= 2 && <tr><td>Queued</td><td>TRELLIS.2 source model</td><td>Will become the default export source</td></tr>}
              </tbody></table>
            </section>
          </div>

          <aside className="inspector">
            <section className="panel">
              <div className="panel-head"><strong>Part Properties</strong><button>Edit</button></div>
              <Property label="Name" value="Untitled Project"/><Property label="Type" value="Not defined"/><Property label="Status" value={hasInput ? "Input ready" : "Waiting"}/><Property label="Units" value="Millimeters (mm)"/>
            </section>
            <section className="panel">
              <div className="panel-head"><strong>Generation Roles</strong></div>
              <Role title="TRELLIS.2" subtitle="Creates source 3D model inside MeshForge" active={stage >= 2}/>
              <Role title="NVIDIA API" subtitle="Primary programmer and Blender agent" active={stage >= 3}/>
              <Role title="Blender MCP" subtitle="Builds the ultra-detail refinement" active={stage >= 3}/>
            </section>
            <section className="panel">
              <div className="panel-head"><strong>Export Source</strong></div>
              <div className="source-toggle">
                <button className={exportSource === "trellis" ? "selected" : ""} onClick={() => setExportSource("trellis")}>TRELLIS.2</button>
                <button className={exportSource === "blender" ? "selected" : ""} onClick={() => setExportSource("blender")}>Blender Refined</button>
              </div>
              <p className="helper">Default export and print source is TRELLIS.2, exactly as requested.</p>
            </section>
            <section className="panel export-card">
              <button className="secondary"><Download size={16}/> Export Model</button>
              <button className="primary"><Printer size={16}/> Slice / Printer-ready Export</button>
              <p>MeshForge will choose slicer settings from the model geometry, printer, nozzle, material and intended use.</p>
            </section>
          </aside>
        </section>
      </main>

      {requirementsOpen && <div className="modal-backdrop">
        <div className="requirements-modal">
          <div className="modal-head"><div><span>MODEL REQUIREMENTS</span><h2>Define the part before generation</h2><p>The system asks only what it needs to make the source model correctly.</p></div><button onClick={() => setRequirementsOpen(false)}><X/></button></div>
          <div className="requirements-grid">
            {requirements.map((r, i) => <label key={r.label}><span>{r.label}</span><input value={r.value} onChange={e => updateRequirement(i, e.target.value)} placeholder={r.placeholder}/></label>)}
          </div>
          <label className="wide-field"><span>Extra instructions</span><textarea placeholder="Anything else that must be preserved, avoided, measured or printable..."/></label>
          <div className="modal-actions"><button className="secondary" onClick={() => setRequirementsOpen(false)}>Cancel</button><button className="primary" onClick={submitRequirements}><Cpu size={16}/> Continue to TRELLIS.2</button></div>
        </div>
      </div>}
    </div>
  );
}

function Spec({title, value, sub}:{title:string;value:string;sub:string}) {
  return <div className="spec"><span>{title}</span><strong>{value}</strong><small>{sub}</small></div>;
}
function Property({label,value}:{label:string;value:string}) {
  return <div className="property"><span>{label}</span><b>{value}</b></div>;
}
function Role({title,subtitle,active}:{title:string;subtitle:string;active:boolean}) {
  return <div className="role"><div className={active ? "role-dot active" : "role-dot"}/><div><strong>{title}</strong><span>{subtitle}</span></div></div>;
}
