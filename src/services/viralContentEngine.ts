// src/services/viralContentEngine.ts

import { generateViralContent, GenerationParams, ViralContent } from '../generators/viralTextGenerator';
import { getApiKey } from '../../config/apiConfig';

/**
 * СЕРВИС ВИРАЛЬНОГО КОНТЕНТА
 * Главная точка входа для генерации вирального контента
 */

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
          temperature: 0.9,  // Высокая креативность
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

    // Извлекаем JSON из ответа (если есть markdown code block)
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    return jsonMatch ? jsonMatch[1].trim() : text.trim();
  }

  /**
   * ГЕНЕРИРОВАТЬ ВИРАЛЬНЫЙ КОНТЕНТ
   */
  async generate(params: GenerationParams): Promise<ViralContent> {
    return generateViralContent(params, this.callGemini.bind(this));
  }

  /**
   * ГЕНЕРИРОВАТЬ A/B ВАРИАНТЫ
   * Создаёт 3 варианта с разными триггерами
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

    // Сортируем по виральности
    return variants.sort((a, b) => b.viralityScore - a.viralityScore);
  }

  /**
   * БЫСТРАЯ ГЕНЕРАЦИЯ (только тема)
   */
  async quick(topic: string, location?: string): Promise<ViralContent> {
    return this.generate({ topic, location });
  }
}

/**
 * ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ:
 */

// 1. ПРОСТОЙ ВАРИАНТ
export async function example_simple() {
  const engine = new ViralContentEngine();
  
  const content = await engine.quick(
    'Скрытые пляжи Бали',
    'Бали, Индонезия'
  );
  
  console.log('Title:', content.title);
  console.log('Description:', content.description);
  console.log('Virality Score:', content.viralityScore);
  console.log('Estimated Read Time:', content.estimatedReadTime, 's');
}

// 2. РАСШИРЕННЫЙ ВАРИАНТ
export async function example_advanced() {
  const engine = new ViralContentEngine();
  
  const content = await engine.generate({
    topic: 'Бюджетное путешествие по Вьетнаму',
    location: 'Вьетнам',
    keyPoints: [
      'Жизнь на $10/день',
      'Лучшая еда в Азии',
      'Нетуристические маршруты'
    ],
    targetTriggers: ['fear_of_missing_out', 'shock']
  });
  
  console.log('Generated Content:', content);
}

// 3. A/B ТЕСТИРОВАНИЕ
export async function example_ab_testing() {
  const engine = new ViralContentEngine();
  
  const variants = await engine.generateABVariants({
    topic: 'Секретные места Грузии',
    location: 'Тбилиси, Грузия',
  });
  
  console.log('Variant A (Best):', variants[0]);
  console.log('Variant B:', variants[1]);
  console.log('Variant C:', variants[2]);
}

// 4. ИНТЕГРАЦИЯ В РЕАЛЬНОЕ ПРИЛОЖЕНИЕ
export async function example_integration() {
  try {
    const engine = new ViralContentEngine();
    
    // Генерируем контент
    const content = await engine.quick('Лучшие хостелы в Бангкоке', 'Бангкок');
    
    // Проверяем качество
    if (content.viralityScore < 70) {
      console.warn('Низкая виральность. Перегенерируем...');
      // Повторная генерация
    }
    
    // Используем в видео
    const videoData = {
      title: content.title,
      description: content.description,
      hashtags: content.hashtags.join(' '),
      hook: content.hooks[0], // Первый хук для видео
    };
    
    return videoData;
    
  } catch (error) {
    console.error('Ошибка генерации:', error);
    throw error;
  }
}