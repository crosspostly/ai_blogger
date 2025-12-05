# 🔥 Гайд по системе вирального контента

## 🎯 Обзор

Модульная система для генерации виральных текстов для Instagram Reels.

**Ключевая идея:** Зритель должен читать описание дольше, чем длится видео.

## 🚀 Быстрый старт

```typescript
import { ViralContentEngine } from './src/services/viralContentEngine';

const engine = new ViralContentEngine();

const content = await engine.quick(
  'Скрытые пляжи Бали',
  'Бали'
);

console.log('Virality Score:', content.viralityScore);
console.log('Read Time:', content.estimatedReadTime, 's');
```

## 🧠 Психологические триггеры

- `fear_of_missing_out` - FOMO
- `curiosity` - Любопытство
- `shock` - Шок-факты
- `empathy` - Эмпатия
- `controversy` - Провокация
- `inspiration` - Вдохновение
- `social_proof` - Социальное доказательство

## 📊 Оценка виральности

- 85-100: Отлично
- 70-84: Хорошо
- 50-69: Средне (перегенерировать)
- <50: Низкое качество

## 🔧 Интеграция

```typescript
async function createVideo(topic: string) {
  const engine = new ViralContentEngine();
  const content = await engine.quick(topic);
  
  if (content.viralityScore < 70) {
    // Перегенерировать
  }
  
  return {
    hook: content.hooks[0],
    title: content.title,
    description: content.description,
    hashtags: content.hashtags.join(' ')
  };
}
```

Подробнее см. файлы в `src/`