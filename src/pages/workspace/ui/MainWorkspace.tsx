// Главная рабочая страница приложения

import { CameraStream } from '@/widgets/camera-stream'
import { TabPanel } from '@/widgets/tab-panel'
import { SessionControls } from '@/widgets/session-controls'
import { useElectronIntegration } from '@/app/providers/useElectronIntegration'
import { useTrackingStore } from '@/entities/tracking-session'
import './MainWorkspace.css'

export function MainWorkspace() {
  const { isElectronMode } = useElectronIntegration()
  const lastError = useTrackingStore((state) => state.lastError)
  const clearError = useTrackingStore((state) => state.clearError)

  return (
    <div className="main-workspace">
      {/* <header className="workspace-header">
        <div className="workspace-header__title">
          <h1>🎯 BlinkMind</h1>
          <p className="workspace-header__subtitle">
            Отслеживание продуктивности и фокуса
          </p>
        </div>
        
        {!isElectronMode && (
          <div className="workspace-header__warning">
            ⚠️ Режим разработки (без Electron)
          </div>
        )}
      </header> */}

      {lastError && (
        <div className="error-banner">
          <div className="error-banner__content">
            <span className="error-banner__icon">❌</span>
            <span className="error-banner__message">{lastError}</span>
          </div>
          <button onClick={clearError} className="error-banner__close">
            ✕
          </button>
        </div>
      )}

      <div className="workspace-content">
        <div className="workspace-content__main">
          {/* Камера и визуализация */}
          <CameraStream />

          {/* Управление сессией */}
          <SessionControls />
        </div>
        
        <div className="workspace-content__sidebar">
          <TabPanel />
        </div>
      </div>

      <footer className="workspace-footer">
        <p>💡 Начните сессию чтобы увидеть детальную статистику работы</p>
      </footer>
    </div>
  )
}


