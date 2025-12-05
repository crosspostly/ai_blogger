# 🔥 Система вирального контента + ВИДЕО

## 🎯 Обзор

Полная система для генерации виральных рилсов:
- 📝 **Виральный текст** для поста
- 🎬 **Сценарий 8-секундного видео**
- 🎤 **Голосовой скрипт**
- 🔤 **Тексты для наложения на видео**

---

## 🚀 Быстрый старт

### 1. Полный пакет (текст + видео)

```typescript
import { ViralContentEngine } from './src/services/viralContentEngine';

const engine = new ViralContentEngine();

const pack = await engine.quickComplete('Скрытые пляжи', 'Бали');

console.log('=== ТЕКСТ ДЛЯ ПОСТА ===');
console.log(pack.text.description);

console.log('\n=== ПРОМПТ ДЛЯ GEMINI VIDEO ===');
console.log(pack.geminiPrompt);
// Скопируйте в https://aistudio.google.com/

console.log('\n=== ТЕКСТЫ НА ВИДЕО ===');
pack.video.textOverlays.forEach(t => 
  console.log(`[${t.startTime}-${t.endTime}s] ${t.text}`)
);
```

### 2. Только текст (без видео)

```typescript
const content = await engine.quick('Скрытые пляжи', 'Бали');

console.log(content.title);
console.log(content.description);
```

---

## 🎬 8-секундное видео (Оптимизировано под Gemini Video)

### Структура сценария:

```
[0-2s] - ХУК
Текст: "Скоро здесь будут толпы"
Камера: zoom_out

[2-5s] - РАСКРЫТИЕ
Текст: "А сейчас — никого"
Камера: pan_right

[5-8s] - CTA
Текст: "Напиши БАЛИ 👇"
Камера: slow_motion
```

### Пример готового промпта:

```
Create a vertical 8-second video (9:16 aspect ratio):

[0-2s] Pristine empty beach, turquoise water, white sand, no people, camera: zoom_out
[2-5s] Smooth pan across untouched coastline, palm trees, crystal water, camera: pan_right
[5-8s] Small waves on shore, golden sunset light, peaceful atmosphere, camera: slow_motion

VISUAL STYLE:
- Color grading: warm
- Lighting: golden_hour
- Mood: peaceful
- Quality: cinematic

Smooth transitions between scenes. Professional travel video aesthetic.
```

---

## 🛠️ Полный пайплайн

### Шаг 1: Генерация

```typescript
const pack = await engine.quickComplete('Скрытые пляжи', 'Бали');
```

### Шаг 2: Создать видео в Gemini

1. Откройте https://aistudio.google.com/
2. Выберите Gemini 2.0 Flash
3. Вставьте `pack.geminiPrompt`
4. Generate!

### Шаг 3: Добавить текст (в CapCut/InShot)

```typescript
pack.video.textOverlays.forEach(overlay => {
  // Добавить текст на видео
  console.log(`${overlay.startTime}s: ${overlay.text}`);
});
```

### Шаг 4: Добавить голос (ElevenLabs/TTS)

```typescript
const voiceScript = pack.video.voiceScript;
// "Пока читаешь это... там никого..."
```

### Шаг 5: Публикация

```typescript
const post = {
  video: "generated_video.mp4",
  caption: pack.text.description,
  hashtags: pack.text.hashtags.join(' ')
};
```

---

## 🧠 7 психологических триггеров

Каждый триггер имеет уникальный видео-сценарий:

| Триггер | Визуал | Эмоция |
|---------|--------|--------|
| `fear_of_missing_out` | Пустой пляж → закат | FOMO |
| `curiosity` | Скрытая пещера → рай | Интрига |
| `shock` | Толпы → пустота | Контраст |
| `inspiration` | Рассвет → бесконечность | Мотивация |
| `empathy` | Одиночество → спокойствие | Связь |
| `controversy` | Туристы → аутентика | Провокация |
| `social_proof` | Монтаж стран | Доверие |

---

## 📊 Метрики

```typescript
const pack = await engine.quickComplete('Скрытые пляжи', 'Бали');

console.log('Virality Score:', pack.text.viralityScore); // 85/100
console.log('Read Time:', pack.text.estimatedReadTime);  // 28s
console.log('Video Duration:', pack.video.duration);     // 8s
```

**🎯 Цель:** Зритель читает текст (28s) > видео крутится (8s) → Высокий retention!

---

## ⚙️ Продвинутое использование

### A/B тестирование

```typescript
const variants = await engine.generateABVariants({
  topic: 'Скрытые пляжи',
  location: 'Бали'
});

// Получаем 3 варианта, отсортированных по score
variants.forEach((v, i) => 
  console.log(`${i+1}. Score: ${v.viralityScore}`)
);
```

### Кастомные триггеры

```typescript
const pack = await engine.generateComplete({
  topic: 'Бюджетное путешествие',
  location: 'Вьетнам',
  targetTriggers: ['shock', 'social_proof'],
  keyPoints: ['Жизнь на $10/день', 'Лучшая еда']
});
```

---

## 🛠️ Инструменты

### Для создания видео:
- **Gemini Video** - https://aistudio.google.com/
- Runway Gen-3 - https://runwayml.com
- Haiper AI - https://haiper.ai (бесплатно!)

### Для редактирования:
- **CapCut** - тексты + музыка
- **InShot** - быстрое редактирование

### Для голоса:
- **ElevenLabs** - лучшее качество TTS
- Google Cloud TTS - бюджетно

---

## 💡 Пример полного вывода

```json
{
  "text": {
    "title": "Это место исчезнет через 5 лет",
    "description": "Пока читаешь это — там никого...",
    "viralityScore": 85,
    "estimatedReadTime": 28
  },
  "video": {
    "duration": 8,
    "textOverlays": [
      {"text": "Скоро здесь будут толпы", "startTime": 0, "endTime": 2.5},
      {"text": "А сейчас — никого", "startTime": 2.5, "endTime": 5},
      {"text": "Напиши БАЛИ 👇", "startTime": 5, "endTime": 8}
    ],
    "voiceScript": "Пока читаешь это... там никого. Но не надолго."
  },
  "geminiPrompt": "Create a vertical 8-second video..."
}
```

---

🎉 **Всё готово!** Теперь у вас есть полная система для создания виральных рилсов!