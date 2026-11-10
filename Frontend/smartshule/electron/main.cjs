const { app, BrowserWindow, shell, ipcMain, session } = require('electron');
const path = require('path');
const fs = require('fs');

/**
 * SmartShule Desktop Application - Main Process
 * Cross-platform desktop client for Windows 10/11, Linux, and macOS.
 *
 * Security Architecture:
 * - contextIsolation: true
 * - nodeIntegration: false
 * - sandbox: true
 * - Strict Content Security Policy (CSP) header injection
 * - Remote navigation restriction: External links open in system default browser
 * - Bundled frontend assets: Loads locally from dist/index.html
 */

// Enforce single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

let mainWindow = null;

function resolveAppIcon() {
  const iconPng = path.join(__dirname, 'assets', 'icon.png');
  const iconIco = path.join(__dirname, 'assets', 'icon.ico');

  if (process.platform === 'win32' && fs.existsSync(iconIco)) {
    return iconIco;
  }
  if (fs.existsSync(iconPng)) {
    return iconPng;
  }
  return undefined;
}

function setupSecurityHeaders() {
  const isDev = !app.isPackaged && Boolean(process.env.VITE_DEV_SERVER_URL);

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    // Only inject CSP for local file: or dev server documents
    const csp = [
      "default-src 'self' data: blob:;",
      isDev
        ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:5173;"
        : "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval';",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com http://localhost:5173;",
      "font-src 'self' data: https://fonts.gstatic.com;",
      "img-src 'self' data: blob: https: http:;",
      "connect-src 'self' https://smartshule-vg15.onrender.com https://smartshule-vwhn.onrender.com https://*.supabase.co https://generativelanguage.googleapis.com wss: https: http://localhost:5173 ws://localhost:5173 http://localhost:3000;",
      "object-src 'none';",
      "base-uri 'self';"
    ].join(' ');

    const responseHeaders = {
      ...details.responseHeaders,
      'Content-Security-Policy': [csp]
    };

    callback({ responseHeaders });
  });
}

function createWindow() {
  const appIcon = resolveAppIcon();

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 960,
    minHeight: 640,
    title: 'SmartShule - Grace Seeds School Management System',
    icon: appIcon,
    backgroundColor: '#ffffff',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      devTools: !app.isPackaged
    }
  });

  // Gracefully show window when content is rendered to avoid white flashes
  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show();
    }
  });

  // Intercept new window requests (e.g. window.open or target="_blank")
  // Deny opening inside app and redirect external HTTP/HTTPS to system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:') || url.startsWith('mailto:') || url.startsWith('tel:')) {
      shell.openExternal(url).catch((err) => {
        console.error('Failed to open external link:', err);
      });
    }
    return { action: 'deny' };
  });

  // Prevent navigation away from the bundled application
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const isDev = !app.isPackaged && Boolean(process.env.VITE_DEV_SERVER_URL);
    if (isDev && navigationUrl.startsWith(process.env.VITE_DEV_SERVER_URL)) {
      return;
    }

    if (!navigationUrl.startsWith('file://')) {
      event.preventDefault();
      if (navigationUrl.startsWith('http:') || navigationUrl.startsWith('https:')) {
        shell.openExternal(navigationUrl).catch(() => {});
      }
    }
  });

  // Load either local production bundle or dev server
  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (!app.isPackaged && devServerUrl) {
    mainWindow.loadURL(devServerUrl).catch((err) => {
      console.error('Failed to load Vite dev server:', err);
    });
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    mainWindow.loadFile(indexPath).catch((err) => {
      console.error('Failed to load local index.html:', err);
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Second instance focus handler
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// App Lifecycle
app.whenReady().then(() => {
  setupSecurityHeaders();

  // Setup IPC Handlers
  ipcMain.handle('app:get-version', () => app.getVersion());

  ipcMain.handle('app:open-external', async (_event, url) => {
    if (typeof url === 'string' && (url.startsWith('https://') || url.startsWith('http://') || url.startsWith('mailto:') || url.startsWith('tel:'))) {
      await shell.openExternal(url);
      return true;
    }
    return false;
  });

  ipcMain.on('window:minimize', () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.on('window:maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.on('window:close', () => {
    if (mainWindow) mainWindow.close();
  });

  ipcMain.handle('window:is-maximized', () => {
    return mainWindow ? mainWindow.isMaximized() : false;
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // On macOS apps normally stay active until user explicitly quits (Cmd + Q)
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
