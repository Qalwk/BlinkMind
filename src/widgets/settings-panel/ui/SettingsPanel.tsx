// Виджет панели настроек трекинга

import { useTrackingStore } from '@/entities/tracking-session'
import './SettingsPanel.css'

export function SettingsPanel() {
  const settings = useTrackingStore((state) => state.settings)
  const updateSettings = useTrackingStore((state) => state.updateSettings)

  const handleBlinkThresholdChange = (value: number) => {
    updateSettings({ blinkThreshold: value })
  }

  const handleYawThresholdChange = (value: number) => {
    updateSettings({ engagementYawThreshold: value })
  }

  const handlePitchUpThresholdChange = (value: number) => {
    updateSettings({ engagementPitchUpThreshold: value })
  }

  const handlePitchDownThresholdChange = (value: number) => {
    updateSettings({ engagementPitchDownThreshold: value })
  }

  const handleFpsChange = (type: 'active' | 'background', value: number) => {
    if (type === 'active') {
      updateSettings({ fpsActive: value })
    } else {
      updateSettings({ fpsBackground: value })
    }
  }

  const resetToDefaults = () => {
    updateSettings({
      blinkThreshold: 0.2,
      engagementYawThreshold: 30,
      engagementPitchUpThreshold: 20,
      engagementPitchDownThreshold: 25,
      fpsBackground: 15,
      fpsActive: 30,
      showBlinkFlash: true
    })
  }

  return (
    <div className="settings-panel">
      <div className="settings-panel__header">
        <h3>Настройки трекинга</h3>
        <button onClick={resetToDefaults} className="button button--secondary">
          Сбросить
        </button>
      </div>

      <div className="settings-panel__content">
        <SettingSlider
          label="Порог моргания (EAR)"
          value={settings.blinkThreshold}
          min={0.1}
          max={0.3}
          step={0.01}
          onChange={handleBlinkThresholdChange}
          description="Чем ниже значение, тем более чувствительное определение моргания"
        />

        <div className="settings-divider" />
        
        <h4>Определение направления взгляда</h4>

        <SettingSlider
          label="Поворот головы влево/вправо (°)"
          value={settings.engagementYawThreshold}
          min={10}
          max={60}
          step={5}
          onChange={handleYawThresholdChange}
          description="Если голова повернута больше этого угла - считается отвлечением"
        />

        <SettingSlider
          label="Взгляд вверх (°)"
          value={settings.engagementPitchUpThreshold}
          min={10}
          max={45}
          step={5}
          onChange={handlePitchUpThresholdChange}
          description="Если смотрит выше этого угла - считается отвлечением"
        />

        <SettingSlider
          label="Взгляд вниз (°)"
          value={settings.engagementPitchDownThreshold}
          min={15}
          max={60}
          step={5}
          onChange={handlePitchDownThresholdChange}
          description="Если смотрит ниже этого угла (не на монитор) - отвлечение"
        />

        <div className="settings-divider" />

        <h4>Производительность</h4>

        <SettingSlider
          label="FPS (активный режим)"
          value={settings.fpsActive}
          min={15}
          max={60}
          step={5}
          onChange={(value) => handleFpsChange('active', value)}
          description="Частота кадров когда окно активно"
        />

        <SettingSlider
          label="FPS (фоновый режим)"
          value={settings.fpsBackground}
          min={5}
          max={30}
          step={5}
          onChange={(value) => handleFpsChange('background', value)}
          description="Частота кадров в фоновом режиме (экономия ресурсов)"
        />
      </div>

      <div className="settings-panel__info">
        <InfoBox
          title="💡 Совет"
          message="Настройте углы взгляда под свою позу за компьютером. Если камера выше монитора - увеличьте 'Взгляд вниз', чтобы не считалось отвлечением."
        />
        <InfoBox
          title="⚠️ Отвлечение"
          message="Вовлеченность = 0% когда: лицо не в кадре, голова повернута в сторону, или взгляд не на монитор."
        />
      </div>
    </div>
  )
}

// Компонент слайдера настройки
interface SettingSliderProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  description?: string
}

function SettingSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  description
}: SettingSliderProps) {
  return (
    <div className="setting-slider">
      <div className="setting-slider__header">
        <label className="setting-slider__label">{label}</label>
        <span className="setting-slider__value">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="setting-slider__input"
      />
      {description && (
        <p className="setting-slider__description">{description}</p>
      )}
    </div>
  )
}

// Компонент информационного блока
interface InfoBoxProps {
  title: string
  message: string
}

function InfoBox({ title, message }: InfoBoxProps) {
  return (
    <div className="info-box">
      <div className="info-box__title">{title}</div>
      <div className="info-box__message">{message}</div>
    </div>
  )
}


