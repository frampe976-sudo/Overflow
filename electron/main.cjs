// Fenêtre PC d'Overflow (Windows, Linux).
const { app, BrowserWindow, Menu, shell, screen } = require("electron");
const path = require("path");

function createWindow() {
  const wa = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea;
  const width = Math.max(960, Math.round(wa.width * 0.85)), height = Math.max(540, Math.round(width * 9 / 16));
  const win = new BrowserWindow({
    x: Math.round(wa.x + (wa.width - width) / 2), y: Math.round(wa.y + (wa.height - height) / 2),
    width, height, minWidth: 800, minHeight: 450, useContentSize: true,
    title: "Overflow", backgroundColor: "#05060b",
    icon: path.join(__dirname, "..", "www", "icon.png"),
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true, backgroundThrottling: false }
  });
  Menu.setApplicationMenu(null);
  win.maximize(); // un jeu se joue en grand ; F11 bascule le plein écran
  win.loadFile(path.join(__dirname, "..", "www", "index.html"));
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:\/\//.test(url)) shell.openExternal(url); return { action: "deny" }; });
  win.webContents.on("will-navigate", (e) => e.preventDefault());
  win.webContents.on("before-input-event", (e, input) => {
    if (input.type === "keyDown" && input.key === "F11") { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
  });
}
// la carte graphique sert même si Chromium la trouve « peu fiable » : le jeu est en WebGL2
app.commandLine.appendSwitch("ignore-gpu-blocklist");
app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());
