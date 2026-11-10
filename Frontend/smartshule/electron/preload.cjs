const { contextBridge, ipcRenderer } = require('electron');

/**
 * SmartShule Electron Preload Script
 * Secure Preload Bridge conforming to Electron Security Guidelines:
 * - contextIsolation: true
 * - nodeIntegration: false
 * - sandbox: true
 *
 * Only explicitly approved, non-privileged capabilities are exposed to the renderer.
 */
contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  getAppVersion: () => ipcRenderer.invoke('app:get-version'),
  openExternal: (url) => ipcRenderer.invoke('app:open-external', url),
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized')
});
