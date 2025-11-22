import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  close: () => ipcRenderer.send('close'),
  log: (...args: any[]) => ipcRenderer.send('log', ...args),
  onStart: (callback: (args: unknown) => void) => {
    ipcRenderer.on('start', (_event, value) => callback(value))
  },
  offer: (sdp: string) => ipcRenderer.send('offer', sdp),
  answer: (sdp: string) => ipcRenderer.send('answer', sdp),
})
