import { app, BrowserWindow, desktopCapturer, session, ipcMain } from 'electron'
import path from 'node:path'
import started from 'electron-squirrel-startup'
import yargs from 'yargs/yargs'
import { hideBin } from 'yargs/helpers'

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit()
}

const hasOfferArg = process.argv.some((arg) => arg === '--offer' || arg === '-o')

const argv = yargs(hideBin(process.argv))
  .scriptName('screen-share-cli')
  .usage('Usage: $0 [options]')
  .option('win-width', {
    number: true,
    default: 480,
    description: 'Set the width of the window',
  })
  .option('win-height', {
    number: true,
    default: 320,
    description: 'Set the height of the window',
  })
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
    default: !hasOfferArg,
    description: 'Show close button',
  })
  .option('offer', {
    alias: 'o',
    string: true,
    description: 'Set offer SDP for WebRTC',
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
    width: argv.hide ? 0 : argv.winWidth,
    height: argv.hide ? 0 : argv.winHeight,
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

  // can not read from stdin in packaged electron app
  // TODO use custom node starter and ipc to read from stdin
  ipcMain.on('offer', (e, offer) => {
    const b64 = Buffer.from(offer).toString('base64')
    process.stdout.write('\u001b9\u0007::SSC:OFFER:' + b64 + '.\r\n')
  })

  ipcMain.on('answer', (e, answer) => {
    const b64 = Buffer.from(answer).toString('base64')
    process.stdout.write('\u001b9\u0007::SSC:ANSWER:' + b64 + '.\r\n')
  })

  ipcMain.on('close', (e, reason) => {
    process.stdout.write('\u001b9\u0007::SSC:CLOSE:' + reason + '.\r\n')
    mainWindow.close()
    app.quit()
  })

  ipcMain.on('log', (e, ...args) => {
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      console.log(...args)
    }
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
  if (argv.hide) {
    mainWindow.hide()
  }

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
  app.quit()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
