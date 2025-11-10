// Типы для системы помодоро

// Тип интервала помодоро
export type PomodoroIntervalType = 'work' | 'short-break' | 'long-break'

// Настройки помодоро
export interface PomodoroSettings {
  workDuration: number // продолжительность рабочего интервала в минутах
  shortBreakDuration: number // продолжительность короткого перерыва в минутах
  longBreakDuration: number // продолжительность длинного перерыва в минутах
  longBreakInterval: number // после скольких помодоро делать длинный перерыв
  autoStartBreaks: boolean // автоматически начинать перерывы
  autoStartPomodoros: boolean // автоматически начинать новые помодоро после перерыва
  soundEnabled: boolean // включить звуковые уведомления
  notificationsEnabled: boolean // включить уведомления
}

// Статус помодоро таймера
export type PomodoroStatus = 'idle' | 'running' | 'paused' | 'completed'

// Текущее состояние таймера
export interface PomodoroTimerState {
  status: PomodoroStatus
  currentInterval: PomodoroIntervalType
  remainingTime: number // оставшееся время в секундах
  totalTime: number // общее время интервала в секундах
  completedPomodoros: number // количество завершенных помодоро в текущей серии
}

// Завершенная сессия помодоро
export interface CompletedPomodoro {
  id: string
  startTime: number
  endTime: number
  duration: number // в секундах
  intervalType: PomodoroIntervalType
  completed: boolean // true если завершен, false если прерван
  date: string // дата в формате YYYY-MM-DD для группировки
}

// Статистика за день
export interface DailyPomodoroStats {
  date: string // формат YYYY-MM-DD
  completedPomodoros: number // количество завершенных рабочих помодоро
  totalWorkTime: number // общее рабочее время в секундах
  totalBreakTime: number // общее время перерывов в секундах
  pomodoros: CompletedPomodoro[] // все помодоро за день
}

// Статистика стрика
export interface StreakStats {
  currentStreak: number // текущий стрик в днях
  longestStreak: number // самый длинный стрик в днях
  lastActivityDate: string // последняя дата активности YYYY-MM-DD
}

// Настройки по умолчанию
export const DEFAULT_POMODORO_SETTINGS: PomodoroSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  longBreakInterval: 4,
  autoStartBreaks: false,
  autoStartPomodoros: false,
  soundEnabled: true,
  notificationsEnabled: true
}

