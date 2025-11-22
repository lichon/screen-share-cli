import { app, BrowserWindow, desktopCapturer, session, ipcMain } from 'electron'
import path from 'node:path'
import started from 'electron-squirrel-startup'
import yargs from 'yargs/yargs'
import { hideBin } from 'yargs/helpers'

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit()
}

const argv = yargs(hideBin(process.argv))
  .scriptName('screen-share-cli')
  .usage('Usage: $0 [options]')
  .option('audio', {
    boolean: true,
    default: false,
    description: 'Enable audio capture',
  })
  .option('video', {
    boolean: true,
    default: true,
    description: 'Enable video capture',
  })
  .option('camera', {
    boolean: true,
    default: false,
    description: 'Use camera instead of screen capture',
  })
  .option('fps', {
    number: true,
    default: 30,
    description: 'Set frame rate',
  })
  .option('width', {
    number: true,
    description: 'Set requested video width',
  })
  .option('height', {
    number: true,
    description: 'Set requested video height',
  })
  .option('hide', {
    boolean: true,
    default: false,
    description: 'Hide main window',
  })
  .option('show-close', {
    boolean: true,
    default: false,
    description: 'Show close button',
  })
  .help()
  .alias('help', 'h')
  .parseSync()

// yargs will exit the process when --help is used.
// In Electron, it's better to quit the app gracefully.
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  app.quit()
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: argv.hide ? 0 : 480,
    height: argv.hide ? 0 : 320,
    frame: false,
    transparent: true,
    skipTaskbar: true,
    alwaysOnTop: !argv.hide,
    hiddenInMissionControl: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
    desktopCapturer.getSources({ types: ['screen'] }).then((sources) => {
      // Grant access to the first screen found.
      callback({ video: sources[0], audio: 'loopback' })
    })
  })

  mainWindow.on('system-context-menu', (e, params) => {
    e.preventDefault()
  })

  ipcMain.on('close', () => {
    mainWindow.close()
  })

  ipcMain.on('log', (e, ...args) => {
    console.error(...args)
  })

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    )
  }

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('start', argv)
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
