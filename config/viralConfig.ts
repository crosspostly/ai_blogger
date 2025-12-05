// config/viralConfig.ts

/**
 * Конфигурация системы виральности для AI-блогера
 * Модульная система, не влияет на существующий код
 */

export interface ViralConfig {
  // Целевая аудитория
  targetAudience: string;
  
  // Эмоциональные триггеры (приоритет)
  emotionalTriggers: EmotionalTrigger[];
  
  // Настройки текста
  textSettings: TextSettings;
  
  // Метрики виральности
  viralityMetrics: ViralityMetrics;
}

export type EmotionalTrigger = 
  | 'fear_of_missing_out'  // FOMO
  | 'curiosity'            // Любопытство
  | 'shock'                // Шок
  | 'empathy'              // Эмпатия
  | 'controversy'          // Провокация
  | 'inspiration'          // Вдохновение
  | 'social_proof';        // Социальное доказательство

export interface TextSettings {
  titleLength: { min: number; max: number };        // Длина заголовка (слова)
  descriptionLength: { min: number; max: number };  // Длина описания (слова)
  paragraphsCount: { min: number; max: number };    // Количество абзацев
  useEmojis: boolean;                               // Использовать эмодзи
  personalPronoun: 'ты' | 'вы';                     // Обращение
}

export interface ViralityMetrics {
  minReadingTime: number;  // Минимальное время чтения (секунды)
  maxReadingTime: number;  // Максимальное время чтения (секунды)
  targetEngagementRate: number; // Целевой ER (%)
}

/**
 * Конфигурация для тревел-блогера
 */
export const TRAVEL_BLOGGER_CONFIG: ViralConfig = {
  targetAudience: 'Молодые путешественники 18-35 лет, мечтающие о приключениях',
  
  emotionalTriggers: [
    'fear_of_missing_out',  // FOMO - основной триггер для тревела
    'inspiration',          // Вдохновение путешествовать
    'curiosity',            // Любопытство к новым местам
    'shock',                // Неожиданные факты о странах
  ],
  
  textSettings: {
    titleLength: { min: 8, max: 12 },
    descriptionLength: { min: 120, max: 180 },
    paragraphsCount: { min: 4, max: 6 },
    useEmojis: true,
    personalPronoun: 'ты',
  },
  
  viralityMetrics: {
    minReadingTime: 15,  // Минимум 15 секунд чтения
    maxReadingTime: 45,  // Максимум 45 секунд
    targetEngagementRate: 8.5, // Целевой ER 8.5%
  },
};

/**
 * Шаблоны для разных ниш (расширяемо)
 */
export const NICHE_CONFIGS: Record<string, ViralConfig> = {
  travel: TRAVEL_BLOGGER_CONFIG,
  
  // Легко добавить другие ниши в будущем:
  // business: BUSINESS_CONFIG,
  // lifestyle: LIFESTYLE_CONFIG,
  // tech: TECH_CONFIG,
};

/**
 * Получить конфигурацию для конкретной ниши
 */
export const getViralConfig = (niche: keyof typeof NICHE_CONFIGS = 'travel'): ViralConfig => {
  return NICHE_CONFIGS[niche] || TRAVEL_BLOGGER_CONFIG;
};