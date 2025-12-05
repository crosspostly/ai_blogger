// src/generators/viralTextGenerator.ts

import { getViralConfig, ViralConfig, EmotionalTrigger } from '../../config/viralConfig';
import { TRAVEL_BLOGGER_PERSONA, generatePersonaSystemPrompt } from '../personas/travelBlogger';

/**
 * Результат генерации вирального контента
 */
export interface ViralContent {
  title: string;              // Заголовок (8-12 слов)
  description: string;        // Описание (120-180 слов)
  hooks: string[];            // 3 альтернативных хука (первые 3 секунды)
  hashtags: string[];         // 10-15 целевых хэштегов
  estimatedReadTime: number;  // Оценка времени чтения (секунды)
  viralityScore: number;      // Оценка виральности (0-100)
  usedTriggers: EmotionalTrigger[]; // Использованные триггеры
}

/**
 * Параметры генерации
 */
export interface GenerationParams {
  topic: string;                    // Тема видео/поста
  location?: string;                // Локация (опционально)
  keyPoints?: string[];             // Ключевые моменты
  targetTriggers?: EmotionalTrigger[]; // Приоритетные триггеры
  niche?: 'travel';                 // Ниша (расширяемо)
}

/**
 * ПСИХОЛОГИЧЕСКИЕ ХУКИ ДЛЯ ТРЕВЕЛ-КОНТЕНТА
 */
const TRAVEL_VIRAL_HOOKS = {
  fear_of_missing_out: [
    'Это место исчезнет через 5 лет...',
    '90% туристов не знают об этом месте',
    'Пока все едут туда, я открыл это...',
    'Скоро сюда закроют доступ...',
  ],
  
  curiosity: [
    'Ты не поверишь, что я нашёл здесь...',
    'Никто не говорит об этом секрете [location]',
    'Что происходит в [location], когда все уезжают?',
    'Это место на карте не найти...',
  ],
  
  shock: [
    'Я заплатил всего 50$ за неделю в [location]',
    'В [location] можно жить на $10 в день',
    'Мне запретили снимать это место...',
    'Вот почему я больше не поеду в [location]',
  ],
  
  empathy: [
    'Мне было 25, когда я первый раз приехал сюда...',
    'Я боялся путешествовать один, пока не...',
    'Это место изменило мою жизнь',
    'Если ты мечтаешь о путешествиях, но боишься...',
  ],
  
  controversy: [
    'Почему [location] - самое переоценённое направление',
    'Истина, которую скрывают о туризме в [location]',
    'Турагентства не расскажут вам это...',
    'Все делают это в [location] неправильно',
  ],
  
  inspiration: [
    'Как я бросил всё и уехал в [location]',
    'Вот как выглядит жизнь мечты в [location]',
    'Ты можешь сделать это уже завтра',
    'Никогда не поздно начать путешествовать',
  ],
  
  social_proof: [
    '67 стран - вот мои главные открытия',
    '1000+ путешественников подтвердили это',
    'Топ-3 места, куда все поедут в 2025',
    'Местные жители рассказали мне секрет...',
  ],
};

/**
 * ОЦЕНКА ВИРАЛЬНОСТИ ТЕКСТА
 */
function calculateViralityScore(content: ViralContent, config: ViralConfig): number {
  let score = 0;
  
  // 1. Длина заголовка (20 баллов)
  const titleWords = content.title.split(' ').length;
  if (titleWords >= config.textSettings.titleLength.min && 
      titleWords <= config.textSettings.titleLength.max) {
    score += 20;
  }
  
  // 2. Длина описания (20 баллов)
  const descWords = content.description.split(' ').length;
  if (descWords >= config.textSettings.descriptionLength.min && 
      descWords <= config.textSettings.descriptionLength.max) {
    score += 20;
  }
  
  // 3. Количество абзацев (15 баллов)
  const paragraphs = content.description.split('\n\n').length;
  if (paragraphs >= config.textSettings.paragraphsCount.min) {
    score += 15;
  }
  
  // 4. Наличие цифр в заголовке (10 баллов)
  if (/\d+/.test(content.title)) {
    score += 10;
  }
  
  // 5. Использование эмодзи (10 баллов)
  const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  if (config.textSettings.useEmojis && emojiRegex.test(content.description)) {
    score += 10;
  }
  
  // 6. Количество триггеров (15 баллов)
  score += Math.min(content.usedTriggers.length * 5, 15);
  
  // 7. Открытая концовка/CTA (10 баллов)
  const hasCTA = /(подписывайся|сохрани|напиши|расскажу|следующем)/i.test(content.description);
  if (hasCTA) {
    score += 10;
  }
  
  return Math.min(score, 100);
}

/**
 * ОЦЕНКА ВРЕМЕНИ ЧТЕНИЯ (секунды)
 * Средняя скорость: 200-250 слов/минуту
 */
function estimateReadingTime(text: string): number {
  const words = text.split(/\s+/).length;
  const wordsPerSecond = 3.5; // 210 слов/минуту
  return Math.ceil(words / wordsPerSecond);
}

/**
 * ГЕНЕРАЦИЯ ПРОМПТА ДЛЯ GEMINI
 */
export function buildViralPrompt(params: GenerationParams): string {
  const config = getViralConfig(params.niche || 'travel');
  const personaPrompt = generatePersonaSystemPrompt(TRAVEL_BLOGGER_PERSONA);
  
  const triggers = params.targetTriggers || config.emotionalTriggers;
  const triggersText = triggers.map(t => {
    const hookExamples = TRAVEL_VIRAL_HOOKS[t];
    return `\n• ${t}: "${hookExamples[0]}"`;
  }).join('');
  
  return `
${personaPrompt}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ЗАДАЧА: Создать МАКСИМАЛЬНО ВИРАЛЬНЫЙ текст для Instagram Reels
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ТЕМА: ${params.topic}
${params.location ? `ЛОКАЦИЯ: ${params.location}` : ''}
${params.keyPoints ? `\nКЛЮЧЕВЫЕ МОМЕНТЫ:\n${params.keyPoints.map(p => `• ${p}`).join('\n')}` : ''}

ЦЕЛЬ: Зритель должен ЧИТАТЬ описание ${config.viralityMetrics.minReadingTime}-${config.viralityMetrics.maxReadingTime} секунд, пока крутится видео.

ФОРМУЛА ВИРАЛЬНОСТИ:

1. ЗАГОЛОВОК (${config.textSettings.titleLength.min}-${config.textSettings.titleLength.max} слов):
   • ОБЯЗАТЕЛЬНО используй ЦИФРЫ, ШОК-ФАКТЫ, ПРОВОКАЦИЮ
   • Примеры: "Я потерял 2 млн рублей, пока не узнал..."
   • "Эту ошибку делают 90% путешественников"

2. ОПИСАНИЕ (${config.textSettings.descriptionLength.min}-${config.textSettings.descriptionLength.max} слов):
   
   [АБЗАЦ 1] — ШОК-ОТКРЫТИЕ (2-3 предложения)
   Начни с невероятного факта / личной истории / провокационного заявления.
   
   [АБЗАЦ 2] — РАЗВИТИЕ ИНТРИГИ (3-4 предложения)
   Добавь конкретику, примеры, цифры. Углубляй эмоцию.
   
   [АБЗАЦ 3] — РЕЛЕЙТАБЕЛЬНОСТЬ (2-3 предложения)
   Покажи, как это касается ЛИЧНО зрителя. "Возможно, ${config.textSettings.personalPronoun} тоже..."
   
   [АБЗАЦ 4] — ОТКРЫТАЯ КОНЦОВКА
   НЕ давай полного ответа. Оставь вопрос / призыв к действию / интригу.

3. ХУКИ (первые 3 секунды видео):
   Сгенерируй 3 альтернативных варианта с разными триггерами.

ЭМОЦИОНАЛЬНЫЕ ТРИГГЕРЫ (используй 2-3):${triggersText}

СТИЛЬ:
• Короткие предложения (5-10 слов)
• Прямое обращение ("${config.textSettings.personalPronoun}")
• Эмоциональные слова ("шок", "секрет", "ошибка", "истина")
• Много абзацев (каждые 2-3 предложения)
${config.textSettings.useEmojis ? '• Эмодзи как акценты (не переборщи)' : ''}

ТАБУ:
❌ Длинные предложения
❌ Сложные слова
❌ Академический тон
❌ Полные ответы в описании

ФОРМАТ ОТВЕТА (СТРОГО JSON):
{
  "title": "...",
  "description": "...",
  "hooks": ["...", "...", "..."],
  "hashtags": ["#...", "#...", ...],
  "usedTriggers": ["fear_of_missing_out", "curiosity", ...]
}
`.trim();
}

/**
 * ГЛАВНАЯ ФУНКЦИЯ ГЕНЕРАЦИИ
 * Интегрируется с Gemini API
 */
export async function generateViralContent(
  params: GenerationParams,
  geminiApiCall: (prompt: string) => Promise<string>
): Promise<ViralContent> {
  
  const prompt = buildViralPrompt(params);
  const config = getViralConfig(params.niche || 'travel');
  
  // Вызов Gemini API
  const response = await geminiApiCall(prompt);
  
  // Парсинг JSON-ответа
  const parsed = JSON.parse(response);
  
  const content: ViralContent = {
    title: parsed.title,
    description: parsed.description,
    hooks: parsed.hooks,
    hashtags: parsed.hashtags,
    usedTriggers: parsed.usedTriggers || [],
    estimatedReadTime: estimateReadingTime(parsed.description),
    viralityScore: 0, // Будет рассчитан
  };
  
  // Рассчитываем виральность
  content.viralityScore = calculateViralityScore(content, config);
  
  return content;
}

/**
 * ПРИМЕР ИСПОЛЬЗОВАНИЯ:
 * 
 * const content = await generateViralContent(
 *   {
 *     topic: 'Скрытые пляжи Бали',
 *     location: 'Бали, Индонезия',
 *     keyPoints: [
 *       'Нет туристов',
 *       'Белый песок',
 *       'Кристальная вода'
 *     ],
 *     targetTriggers: ['fear_of_missing_out', 'curiosity']
 *   },
 *   callGeminiAPI
 * );
 * 
 * console.log(content.viralityScore); // 85
 * console.log(content.estimatedReadTime); // 28 секунд
 */