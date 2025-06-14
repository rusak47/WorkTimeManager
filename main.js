const { app, BrowserWindow } = require('electron')
const path = require('path')

// Keep a global reference of the window object to prevent it from being garbage collected
let mainWindow

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false, // Default value is false
      contextIsolation: true, // Protect against prototype pollution
      preload: path.join(__dirname, 'preload.js') // Optional: Use a preload script
    }
  })

  // Load the index.html of your web project
  mainWindow.loadFile('index.html')

  // Uncomment to open DevTools automatically (for development)
  // mainWindow.webContents.openDevTools()

  // Handle window being closed
  mainWindow.on('closed', function () {
    mainWindow = null
  })
}

// Create window when Electron has finished initializing
app.whenReady().then(createWindow)

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

// On macOS re-create window when dock icon is clicked and no windows are open
app.on('activate', function () {
  if (mainWindow === null) createWindow()
})