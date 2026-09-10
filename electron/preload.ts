import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("meshforgeDesktop", {
  pickFiles: () => ipcRenderer.invoke("meshforge:pick-files"),
  saveJson: (name: string, data: unknown) => ipcRenderer.invoke("meshforge:save-json", name, data),
  platform: process.platform
});
