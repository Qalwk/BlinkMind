import { app, BrowserWindow, ipcMain, Tray, Menu, dialog } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import http from 'http'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow = null
let trackerWindow = null
let tray = null

// Создание главного UI окна
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    }
  })

  // В режиме разработки загружаем с dev сервера
  // Проверяем dev режим несколькими способами
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged
  
  if (isDev) {
    // Показываем окно сразу
    mainWindow.show()
    
    // Проверяем доступность Vite сервера
    const checkViteServer = () => {
      const req = http.get('http://localhost:5173', (res) => {
        console.log('✅ Vite сервер доступен, статус:', res.statusCode)
        mainWindow.loadURL('http://localhost:5173')
      })
      
      req.on('error', (error) => {
        console.error('❌ Vite сервер не запущен!')
        console.error('Запустите в другом терминале: npm run dev')
        showError('Vite сервер не запущен!\n\nЗапустите в другом терминале:\nnpm run dev\n\nЗатем перезапустите Electron.')
        // Показываем пользователю инструкцию
        mainWindow.webContents.executeJavaScript(`
          document.body.innerHTML = "<div style='padding: 40px; font-family: Arial; text-align: center;'>" +
            "<h1>⚠️ Vite сервер не запущен</h1>" +
            "<p style='font-size: 18px; margin: 20px 0;'>" +
              "Сначала запустите в отдельном терминале:<br/>" +
              "<code style='background: #f0f0f0; padding: 10px; display: inline-block; margin: 10px 0;'>npm run dev</code>" +
            "</p>" +
            "<p>Затем перезапустите Electron.</p>" +
          "</div>";
        `)
      })
      
      req.setTimeout(2000, () => {
        req.destroy()
        if (!mainWindow.webContents.getURL() || mainWindow.webContents.getURL().startsWith('about:blank')) {
          showError('Vite сервер не отвечает. Проверьте что запущен: npm run dev')
        }
      })
    }
    
    // Проверяем через 1 секунду
    setTimeout(checkViteServer, 1000)
    
    mainWindow.webContents.openDevTools()
    
    // Логирование ошибок
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      console.error('Ошибка загрузки:', errorCode, errorDescription)
      console.error('URL:', validatedURL)
      
      if (errorCode === -105 || errorCode === -106) {
        showError('Vite dev сервер не запущен!\n\nСначала запустите: npm run dev')
      }
    })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
  
  // Функция показа ошибки пользователю
  function showError(message) {
    dialog.showErrorBox('Ошибка запуска', message)
  }

  // Минимизация в трей вместо закрытия
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault()
      mainWindow.hide()
    }
  })
}

// Создание скрытого окна для трекинга
// КРИТИЧНО: backgroundThrottling: false обеспечивает работу в фоне
function createTrackerWindow() {
  trackerWindow = new BrowserWindow({
    width: 400,
    height: 300,
    show: false, // Скрытое окно
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false, // ВАЖНО! Отключает throttling в фоне
      preload: path.join(__dirname, 'tracker-preload.cjs')
    }
  })

  // Загрузка tracker страницы
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged
  
  if (isDev) {
    setTimeout(() => {
      trackerWindow.loadURL('http://localhost:5173/tracker.html')
        .catch((err) => {
          console.error('Ошибка загрузки tracker URL:', err)
        })
    }, 500)
    
    // Логирование ошибок tracker окна
    trackerWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('Tracker ошибка загрузки:', errorCode, errorDescription)
    })
  } else {
    trackerWindow.loadFile(path.join(__dirname, '../dist/tracker.html'))
  }

  // Для отладки - показываем окно и DevTools
  trackerWindow.webContents.openDevTools()
  trackerWindow.show() // ВРЕМЕННО для отладки камеры
}

// Создание системного трея
function createTray() {
  // В production нужна иконка
  // tray = new Tray(path.join(__dirname, '../assets/icon.png'))
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Показать',
      click: () => {
        mainWindow.show()
      }
    },
    {
      label: 'Выход',
      click: () => {
        app.isQuitting = true
        app.quit()
      }
    }
  ])

  // tray.setContextMenu(contextMenu)
  // tray.setToolTip('FocusTracker')
}

// Инициализация приложения
app.whenReady().then(() => {
  createMainWindow()
  createTrackerWindow()
  createTray()

  // IPC обработчики
  setupIpcHandlers()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
      createTrackerWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// КРИТИЧНО: Очередь команд для tracker окна до его готовности
let trackerReady = false
let pendingCommands = []

// Настройка IPC коммуникации
function setupIpcHandlers() {
  // Tracker окно сообщает о готовности
  ipcMain.on('tracker-ready', () => {
    console.log('[Main] ✅ Tracker окно готово к работе')
    trackerReady = true
    
    // Обработка накопленных команд
    while (pendingCommands.length > 0) {
      const cmd = pendingCommands.shift()
      console.log('[Main] Отправка отложенной команды:', cmd.channel)
      if (trackerWindow && !trackerWindow.isDestroyed()) {
        trackerWindow.webContents.send(cmd.channel, cmd.data)
      }
    }
  })
  
  // Трекинг данные от tracker окна -> main окну
  ipcMain.on('tracker-data', (event, data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('tracker-data', data)
    }
  })

  // Команда начать трекинг от main окна -> tracker окну
  ipcMain.on('start-tracking', (event, settings) => {
    console.log('[Main] Получена команда start-tracking, tracker ready:', trackerReady)
    
    if (!trackerWindow || trackerWindow.isDestroyed()) {
      console.error('[Main] Tracker окно не существует!')
      return
    }
    
    if (!trackerReady) {
      console.log('[Main] Tracker еще не готов, добавляем команду в очередь')
      pendingCommands.push({ channel: 'start-tracking', data: settings })
      return
    }
    
    console.log('[Main] Отправка команды start-tracking в tracker окно')
    trackerWindow.webContents.send('start-tracking', settings)
  })

  // Команда остановить трекинг
  ipcMain.on('stop-tracking', () => {
    if (trackerWindow && !trackerWindow.isDestroyed() && trackerReady) {
      trackerWindow.webContents.send('stop-tracking')
    }
  })

  // Обновление настроек
  ipcMain.on('settings-update', (event, settings) => {
    if (trackerWindow && !trackerWindow.isDestroyed() && trackerReady) {
      trackerWindow.webContents.send('settings-update', settings)
    }
  })

  // Статус камеры от tracker окна
  ipcMain.on('camera-status', (event, status) => {
    console.log('[Main] Получен статус камеры от tracker:', status)
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('camera-status', status)
    }
  })

  // Ошибки от tracker окна
  ipcMain.on('tracker-error', (event, error) => {
    console.error('[Main] Tracker error:', error)
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('tracker-error', error)
    }
  })
  
  // Кадры видео от tracker окна -> main окну
  ipcMain.on('tracker-video-frame', (event, imageData) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('tracker-video-frame', imageData)
    }
  })
}

