// Preload скрипт должен быть CommonJS для Electron
const { contextBridge, ipcRenderer } = require('electron')

// Безопасный API для главного окна
contextBridge.exposeInMainWorld('electronAPI', {
  // Отправка команд в tracker окно
  startTracking: (settings) => {
    ipcRenderer.send('start-tracking', settings)
  },
  
  stopTracking: () => {
    ipcRenderer.send('stop-tracking')
  },
  
  updateSettings: (settings) => {
    ipcRenderer.send('settings-update', settings)
  },
  
  // Получение данных от tracker окна
  onTrackerData: (callback) => {
    ipcRenderer.on('tracker-data', (event, data) => callback(data))
  },
  
  onCameraStatus: (callback) => {
    ipcRenderer.on('camera-status', (event, status) => callback(status))
  },
  
  onTrackerError: (callback) => {
    ipcRenderer.on('tracker-error', (event, error) => callback(error))
  },
  
  // НОВОЕ: Получение кадров видео
  onVideoFrame: (callback) => {
    ipcRenderer.on('tracker-video-frame', (event, imageData) => callback(imageData))
  },
  
  // Очистка слушателей
  removeTrackerDataListener: () => {
    ipcRenderer.removeAllListeners('tracker-data')
  },
  
  removeCameraStatusListener: () => {
    ipcRenderer.removeAllListeners('camera-status')
  },
  
  removeTrackerErrorListener: () => {
    ipcRenderer.removeAllListeners('tracker-error')
  },
  
  removeVideoFrameListener: () => {
    ipcRenderer.removeAllListeners('tracker-video-frame')
  }
})

