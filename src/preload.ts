import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  close: (reason: string) => ipcRenderer.send('close', reason),
  log: (...args: any[]) => ipcRenderer.send('log', ...args),
  onStart: (callback: (args: unknown) => void) => {
    ipcRenderer.on('start', (_event, value) => callback(value))
  },
  onAnswer: (callback: (sdp: string) => void) => {
    ipcRenderer.on('answer', (_event, sdp) => callback(sdp))
  },
  offer: (sdp: string) => ipcRenderer.send('offer', sdp),
  answer: (sdp: string) => ipcRenderer.send('answer', sdp),
})
