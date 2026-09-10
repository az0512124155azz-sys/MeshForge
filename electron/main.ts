import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "node:path";
import fs from "node:fs/promises";

let mainWindow: BrowserWindow | null = null;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1540,
    height: 980,
    minWidth: 1180,
    minHeight: 760,
    backgroundColor: "#0b1118",
    title: "MeshForge",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) await mainWindow.loadURL(devUrl);
  else await mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

ipcMain.handle("meshforge:pick-files", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile", "multiSelections"],
    filters: [{ name: "MeshForge Inputs", extensions: ["png","jpg","jpeg","webp","mp4","mov","stl","obj","glb","gltf","3mf","step","stp","pdf"] }]
  });
  return result.canceled ? [] : result.filePaths;
});

ipcMain.handle("meshforge:save-json", async (_event, name: string, data: unknown) => {
  const result = await dialog.showSaveDialog({ defaultPath: name, filters: [{ name: "JSON", extensions: ["json"] }] });
  if (result.canceled || !result.filePath) return null;
  await fs.writeFile(result.filePath, JSON.stringify(data, null, 2), "utf8");
  return result.filePath;
});
