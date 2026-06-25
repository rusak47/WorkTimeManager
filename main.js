const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

const DATA_FILE = path.join(app.getPath('userData'), 'work-time-data.json');
const RESOURCES_DIR = path.join(__dirname, 'resources');

function tryRead(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
    return null;
  } catch (err) {
    console.error('Failed to read:', filePath, err);
    return null;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  const devServer = process.env.VITE_DEV_SERVER_URL;
  if (devServer) {
    mainWindow.loadURL(devServer);
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

ipcMain.handle('data:load', async () => {
  return tryRead(DATA_FILE);
});

ipcMain.handle('data:save', async (_, data) => {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  return true;
});

ipcMain.handle('calendar:load', async (_, year) => {
  const calendarPath = path.join(RESOURCES_DIR, `${year}-holidays.json`);
  const raw = tryRead(calendarPath);
  if (!raw) return {};
  const countryKey = Object.keys(raw)[0];
  return countryKey ? raw[countryKey] : {};
});

ipcMain.handle('app:version', async () => {
  return app.getVersion();
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});
