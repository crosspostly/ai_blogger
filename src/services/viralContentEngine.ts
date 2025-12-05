// src/services/viralContentEngine.ts

import { generateViralContent, GenerationParams, ViralContent } from '../generators/viralTextGenerator';
import { generateVideoScript, scriptToGeminiPrompt, VideoScript } from '../generators/videoScriptGenerator';
import { getApiKey } from '../../config/apiConfig';
import type { EmotionalTrigger } from '../../config/viralConfig';

/**
 * СЕРВИС ВИРАЛЬНОГО КОНТЕНТА + ВИДЕО
 * Главная точка входа для генерации
 */

export interface CompleteViralPackage {
  text: ViralContent;      // Текст для поста
  video: VideoScript;      // Сценарий видео
  geminiPrompt: string;    // Готовый промпт для Gemini Video
}

export class ViralContentEngine {
  private apiKey: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || getApiKey('gemini');
    
    if (!this.apiKey) {
      throw new Error('Не найден API ключ Gemini. Установите VITE_GOOGLE_API_KEY.');
    }
  }

  /**
   * Вызов Gemini API
   */
  private async callGemini(prompt: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.9,
          topP: 0.95,
          topK: 64,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API ошибка: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const text = data.candidates[0]?.content?.parts[0]?.text;
    
    if (!text) {
      throw new Error('Пустой ответ от Gemini API');
    }

    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    return jsonMatch ? jsonMatch[1].trim() : text.trim();
  }

  /**
   * ГЕНЕРИРОВАТЬ ВИРАЛЬНЫЙ КОНТЕНТ (только текст)
   */
  async generate(params: GenerationParams): Promise<ViralContent> {
    return generateViralContent(params, this.callGemini.bind(this));
  }

  /**
   * ГЕНЕРИРОВАТЬ ПОЛНЫЙ ПАКЕТ (текст + видео)
   */
  async generateComplete(params: GenerationParams): Promise<CompleteViralPackage> {
    // 1. Генерируем виральный текст
    const textContent = await this.generate(params);
    
    // 2. Выбираем первый триггер для видео-сценария
    const primaryTrigger = textContent.usedTriggers[0] || 'fear_of_missing_out';
    
    // 3. Генерируем видео-сценарий
    const videoScript = generateVideoScript(
      primaryTrigger as EmotionalTrigger,
      params.location
    );
    
    // 4. Конвертируем в промпт для Gemini Video
    const geminiPrompt = scriptToGeminiPrompt(videoScript);
    
    return {
      text: textContent,
      video: videoScript,
      geminiPrompt
    };
  }

  /**
   * ГЕНЕРИРОВАТЬ A/B ВАРИАНТЫ
   */
  async generateABVariants(params: GenerationParams): Promise<ViralContent[]> {
    const triggerSets = [
      ['fear_of_missing_out', 'curiosity'] as const,
      ['shock', 'social_proof'] as const,
      ['inspiration', 'empathy'] as const,
    ];

    const variants = await Promise.all(
      triggerSets.map(triggers => 
        this.generate({
          ...params,
          targetTriggers: triggers,
        })
      )
    );

    return variants.sort((a, b) => b.viralityScore - a.viralityScore);
  }

  /**
   * БЫСТРАЯ ГЕНЕРАЦИЯ (только тема)
   */
  async quick(topic: string, location?: string): Promise<ViralContent> {
    return this.generate({ topic, location });
  }

  /**
   * БЫСТРЫЙ ПОЛНЫЙ ПАКЕТ (текст + видео)
   */
  async quickComplete(topic: string, location?: string): Promise<CompleteViralPackage> {
    return this.generateComplete({ topic, location });
  }
}

/**
 * ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ:
 */

// 1. ТОЛЬКО ТЕКСТ
export async function example_textOnly() {
  const engine = new ViralContentEngine();
  
  const content = await engine.quick('Скрытые пляжи', 'Бали');
  
  console.log('Title:', content.title);
  console.log('Description:', content.description);
  console.log('Virality Score:', content.viralityScore);
}

// 2. ПОЛНЫЙ ПАКЕТ (ТЕКСТ + ВИДЕО)
export async function example_complete() {
  const engine = new ViralContentEngine();
  
  const pack = await engine.quickComplete('Скрытые пляжи', 'Бали');
  
  console.log('=== ТЕКСТ ДЛЯ ПОСТА ===');
  console.log(pack.text.title);
  console.log(pack.text.description);
  
  console.log('\n=== ПРОМПТ ДЛЯ GEMINI VIDEO ===');
  console.log(pack.geminiPrompt);
  
  console.log('\n=== ТЕКСТЫ НА ВИДЕО ===');
  pack.video.textOverlays.forEach(overlay => {
    console.log(`[${overlay.startTime}-${overlay.endTime}s] ${overlay.text}`);
  });
  
  console.log('\n=== ГОЛОСОВОЙ СКРИПТ ===');
  console.log(pack.video.voiceScript);
}

// 3. ИНТЕГРАЦИЯ В РЕАЛЬНЫЙ ПАЙПЛАЙН
export async function example_pipeline() {
  const engine = new ViralContentEngine();
  
  // Генерируем полный пакет
  const pack = await engine.quickComplete('Скрытые пляжи', 'Бали');
  
  // Проверяем качество
  if (pack.text.viralityScore < 70) {
    console.log('Низкий score. Перегенерируем...');
    return example_pipeline(); // Рекурсия
  }
  
  // Используем в видео-пайплайне
  return {
    // Шаг 1: Создаём видео в Gemini
    videoPrompt: pack.geminiPrompt,
    
    // Шаг 2: Добавляем текст на видео (в редакторе)
    textOverlays: pack.video.textOverlays,
    
    // Шаг 3: Добавляем голос (TTS)
    voiceScript: pack.video.voiceScript,
    
    // Шаг 4: Публикуем с этим текстом
    caption: pack.text.description,
    hashtags: pack.text.hashtags.join(' '),
    
    // Метрики
    metrics: {
      viralityScore: pack.text.viralityScore,
      estimatedReadTime: pack.text.estimatedReadTime,
      triggers: pack.text.usedTriggers
    }
  };
}