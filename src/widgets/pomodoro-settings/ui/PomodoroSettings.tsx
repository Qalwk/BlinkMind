// Виджет настроек помодоро

import { usePomodoroStore } from '@/entities/pomodoro-session'
import { DEFAULT_POMODORO_SETTINGS } from '@/shared/types/pomodoro.types'
import './PomodoroSettings.css'

export function PomodoroSettings() {
  const settings = usePomodoroStore((state) => state.settings)
  const updateSettings = usePomodoroStore((state) => state.updateSettings)

  const handleWorkDurationChange = (value: number) => {
    updateSettings({ workDuration: value })
  }

  const handleShortBreakChange = (value: number) => {
    updateSettings({ shortBreakDuration: value })
  }

  const handleLongBreakChange = (value: number) => {
    updateSettings({ longBreakDuration: value })
  }

  const handleLongBreakIntervalChange = (value: number) => {
    updateSettings({ longBreakInterval: value })
  }

  const handleAutoStartBreaksToggle = () => {
    updateSettings({ autoStartBreaks: !settings.autoStartBreaks })
  }

  const handleAutoStartPomodorosToggle = () => {
    updateSettings({ autoStartPomodoros: !settings.autoStartPomodoros })
  }

  const handleSoundToggle = () => {
    updateSettings({ soundEnabled: !settings.soundEnabled })
  }

  const handleNotificationsToggle = () => {
    updateSettings({ notificationsEnabled: !settings.notificationsEnabled })
  }

  const handleReset = () => {
    updateSettings(DEFAULT_POMODORO_SETTINGS)
  }

  return (
    <div className="pomodoro-settings">
      <div className="pomodoro-settings__header">
        <h3>⚙️ Настройки помодоро</h3>
      </div>

      <div className="pomodoro-settings__content">
        {/* Секция времени */}
        <div className="pomodoro-settings__section">
          <h4 className="pomodoro-settings__section-title">
            ⏱️ Длительность интервалов
          </h4>
          <div className="pomodoro-settings__divider" />

          <div className="pomodoro-setting">
            <div className="pomodoro-setting__header">
              <span className="pomodoro-setting__label">Рабочее время</span>
              <span className="pomodoro-setting__value">{settings.workDuration} мин</span>
            </div>
            <input
              type="range"
              min="1"
              max="60"
              step="1"
              value={settings.workDuration}
              onChange={(e) => handleWorkDurationChange(Number(e.target.value))}
              className="pomodoro-setting__input"
            />
            <p className="pomodoro-setting__description">
              Продолжительность рабочей сессии (обычно 25 минут)
            </p>
          </div>

          <div className="pomodoro-setting">
            <div className="pomodoro-setting__header">
              <span className="pomodoro-setting__label">Короткий перерыв</span>
              <span className="pomodoro-setting__value">{settings.shortBreakDuration} мин</span>
            </div>
            <input
              type="range"
              min="1"
              max="30"
              step="1"
              value={settings.shortBreakDuration}
              onChange={(e) => handleShortBreakChange(Number(e.target.value))}
              className="pomodoro-setting__input"
            />
            <p className="pomodoro-setting__description">
              Короткий перерыв между рабочими сессиями (обычно 5 минут)
            </p>
          </div>

          <div className="pomodoro-setting">
            <div className="pomodoro-setting__header">
              <span className="pomodoro-setting__label">Длинный перерыв</span>
              <span className="pomodoro-setting__value">{settings.longBreakDuration} мин</span>
            </div>
            <input
              type="range"
              min="5"
              max="60"
              step="1"
              value={settings.longBreakDuration}
              onChange={(e) => handleLongBreakChange(Number(e.target.value))}
              className="pomodoro-setting__input"
            />
            <p className="pomodoro-setting__description">
              Длинный перерыв после нескольких помодоро (обычно 15-30 минут)
            </p>
          </div>

          <div className="pomodoro-setting">
            <div className="pomodoro-setting__header">
              <span className="pomodoro-setting__label">Помодоро до длинного перерыва</span>
              <span className="pomodoro-setting__value">{settings.longBreakInterval}</span>
            </div>
            <input
              type="range"
              min="2"
              max="8"
              step="1"
              value={settings.longBreakInterval}
              onChange={(e) => handleLongBreakIntervalChange(Number(e.target.value))}
              className="pomodoro-setting__input"
            />
            <p className="pomodoro-setting__description">
              Сколько помодоро нужно завершить перед длинным перерывом (обычно 4)
            </p>
          </div>
        </div>

        {/* Секция автозапуска */}
        <div className="pomodoro-settings__section">
          <h4 className="pomodoro-settings__section-title">
            ▶️ Автоматический запуск
          </h4>
          <div className="pomodoro-settings__divider" />

          <div className="pomodoro-toggle">
            <div>
              <div className="pomodoro-toggle__label">Автозапуск перерывов</div>
              <div className="pomodoro-toggle__description">
                Автоматически начинать перерыв после работы
              </div>
            </div>
            <div
              className={`pomodoro-toggle__switch ${settings.autoStartBreaks ? 'pomodoro-toggle__switch--active' : ''}`}
              onClick={handleAutoStartBreaksToggle}
            >
              <div className="pomodoro-toggle__slider" />
            </div>
          </div>

          <div className="pomodoro-toggle">
            <div>
              <div className="pomodoro-toggle__label">Автозапуск работы</div>
              <div className="pomodoro-toggle__description">
                Автоматически начинать работу после перерыва
              </div>
            </div>
            <div
              className={`pomodoro-toggle__switch ${settings.autoStartPomodoros ? 'pomodoro-toggle__switch--active' : ''}`}
              onClick={handleAutoStartPomodorosToggle}
            >
              <div className="pomodoro-toggle__slider" />
            </div>
          </div>
        </div>

        {/* Секция уведомлений */}
        <div className="pomodoro-settings__section">
          <h4 className="pomodoro-settings__section-title">
            🔔 Уведомления
          </h4>
          <div className="pomodoro-settings__divider" />

          <div className="pomodoro-toggle">
            <div>
              <div className="pomodoro-toggle__label">Звуковые уведомления</div>
              <div className="pomodoro-toggle__description">
                Воспроизводить звук при завершении интервала
              </div>
            </div>
            <div
              className={`pomodoro-toggle__switch ${settings.soundEnabled ? 'pomodoro-toggle__switch--active' : ''}`}
              onClick={handleSoundToggle}
            >
              <div className="pomodoro-toggle__slider" />
            </div>
          </div>

          <div className="pomodoro-toggle">
            <div>
              <div className="pomodoro-toggle__label">Системные уведомления</div>
              <div className="pomodoro-toggle__description">
                Показывать уведомления в системе
              </div>
            </div>
            <div
              className={`pomodoro-toggle__switch ${settings.notificationsEnabled ? 'pomodoro-toggle__switch--active' : ''}`}
              onClick={handleNotificationsToggle}
            >
              <div className="pomodoro-toggle__slider" />
            </div>
          </div>
        </div>

        {/* Действия */}
        <div className="pomodoro-settings__actions">
          <button
            className="pomodoro-settings__button pomodoro-settings__button--reset"
            onClick={handleReset}
          >
            🔄 Сбросить на значения по умолчанию
          </button>
        </div>

        {/* Информация */}
        <div className="pomodoro-settings__info">
          <div className="pomodoro-settings__info-title">💡 Совет</div>
          <p className="pomodoro-settings__info-text">
            Классическая техника помодоро: 25 минут работы, 5 минут перерыва, 
            и 15-30 минут длинного перерыва после каждых 4 помодоро.
          </p>
        </div>
      </div>
    </div>
  )
}

