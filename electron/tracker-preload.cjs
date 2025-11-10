const { contextBridge, ipcRenderer } = require('electron')

// Безопасный API для tracker окна
contextBridge.exposeInMainWorld('trackerAPI', {
  // НОВОЕ: Отправка сигнала о готовности tracker окна
  sendReady: () => {
    ipcRenderer.send('tracker-ready')
  },
  
  // Отправка данных трекинга в main процесс
  sendTrackerData: (data) => {
    ipcRenderer.send('tracker-data', data)
  },
  
  sendCameraStatus: (status) => {
    ipcRenderer.send('camera-status', status)
  },
  
  sendError: (error) => {
    ipcRenderer.send('tracker-error', error)
  },
  
  // НОВОЕ: Отправка кадра видео
  sendVideoFrame: (imageData) => {
    ipcRenderer.send('tracker-video-frame', imageData)
  },
  
  // Получение команд от main окна
  onStartTracking: (callback) => {
    ipcRenderer.on('start-tracking', (event, settings) => callback(settings))
  },
  
  onStopTracking: (callback) => {
    ipcRenderer.on('stop-tracking', () => callback())
  },
  
  onSettingsUpdate: (callback) => {
    ipcRenderer.on('settings-update', (event, settings) => callback(settings))
  }
})

