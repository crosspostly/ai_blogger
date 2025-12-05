// examples/viral-content-demo.ts

import { ViralContentEngine } from '../src/services/viralContentEngine';
import type { ViralContent } from '../src/generators/viralTextGenerator';

/**
 * ПРИМЕР 1: ПРОСТОЙ ГЕНЕРАТОР
 */
async function example1_SimpleGeneration() {
  console.log('\n=== ПРИМЕР 1: Простая генерация ===\n');
  
  const engine = new ViralContentEngine();
  
  const content = await engine.quick(
    'Скрытые пляжи Бали',
    'Бали, Индонезия'
  );
  
  console.log('📝 Заголовок:', content.title);
  console.log('\n📖 Описание:');
  console.log(content.description);
  console.log('\n🎯 Виральность:', content.viralityScore, '/100');
  console.log('⌛ Время чтения:', content.estimatedReadTime, 'сек');
  console.log('\n🎬 Хуки:');
  content.hooks.forEach((hook, i) => console.log(`  ${i + 1}. ${hook}`));
  console.log('\n#️⃣ Хэштеги:', content.hashtags.join(' '));
}

/**
 * ПРИМЕР 2: РАСШИРЕННАЯ ГЕНЕРАЦИЯ
 */
async function example2_AdvancedGeneration() {
  console.log('\n=== ПРИМЕР 2: Расширенная генерация ===\n');
  
  const engine = new ViralContentEngine();
  
  const content = await engine.generate({
    topic: 'Бюджетное путешествие по Вьетнаму',
    location: 'Вьетнам',
    keyPoints: [
      'Жизнь на $10 в день',
      'Лучшая еда в Азии',
      'Нетуристические маршруты',
      'Дружелюбные местные'
    ],
    targetTriggers: ['fear_of_missing_out', 'shock', 'inspiration']
  });
  
  console.log('📝 Заголовок:', content.title);
  console.log('\n🎯 Метрики:');
  console.log('  Virality Score:', content.viralityScore);
  console.log('  Read Time:', content.estimatedReadTime, 's');
  console.log('  Triggers:', content.usedTriggers.join(', '));
}

/**
 * ПРИМЕР 3: A/B ТЕСТИРОВАНИЕ
 */
async function example3_ABTesting() {
  console.log('\n=== ПРИМЕР 3: A/B тестирование ===\n');
  
  const engine = new ViralContentEngine();
  
  const variants = await engine.generateABVariants({
    topic: 'Секретные места Грузии',
    location: 'Тбилиси, Грузия',
  });
  
  console.log('Генерируем 3 варианта с разными триггерами:\n');
  
  variants.forEach((variant, i) => {
    const letter = ['A', 'B', 'C'][i];
    console.log(`━━━ ВАРИАНТ ${letter} ━━━`);
    console.log('Score:', variant.viralityScore);
    console.log('Title:', variant.title);
    console.log('Triggers:', variant.usedTriggers.join(', '));
    console.log('');
  });
  
  console.log(`✅ ЛУЧШИЙ ВАРИАНТ: A (score: ${variants[0].viralityScore})`);
}

/**
 * ПРИМЕР 4: ИНТЕГРАЦИЯ В ВИДЕО-ПАЙПЛАЙН
 */
async function example4_VideoIntegration() {
  console.log('\n=== ПРИМЕР 4: Интеграция с видео ===\n');
  
  const engine = new ViralContentEngine();
  
  let content = await engine.quick('Лучшие хостелы в Бангкоке', 'Бангкок');
  
  // Проверяем качество
  let attempts = 1;
  while (content.viralityScore < 70 && attempts < 3) {
    console.log(`⚠️  Попытка ${attempts}: Score ${content.viralityScore} низкий. Перегенерируем...`);
    content = await engine.quick('Лучшие хостелы в Бангкоке', 'Бангкок');
    attempts++;
  }
  
  console.log(`\n✅ Качество прошло проверку! Score: ${content.viralityScore}\n`);
  
  // Формируем данные для видео
  const videoData = {
    // Первые 3 секунды видео
    hook: content.hooks[0],
    
    // Основной текст на экране
    title: content.title,
    
    // Описание под видео (Instagram caption)
    caption: content.description,
    
    // Хэштеги
    hashtags: content.hashtags.join(' '),
    
    // Метаданные для аналитики
    metadata: {
      viralityScore: content.viralityScore,
      estimatedEngagement: content.estimatedReadTime,
      triggers: content.usedTriggers
    }
  };
  
  console.log('🎬 Данные для видео:');
  console.log(JSON.stringify(videoData, null, 2));
  
  return videoData;
}

/**
 * ПРИМЕР 5: АНАЛИЗ МЕТРИК
 */
async function example5_Analytics() {
  console.log('\n=== ПРИМЕР 5: Анализ метрик ===\n');
  
  const engine = new ViralContentEngine();
  
  const topics = [
    'Скрытые пляжи',
    'Бюджетное путешествие',
    'Экстремальный туризм'
  ];
  
  const results: ViralContent[] = [];
  
  for (const topic of topics) {
    const content = await engine.quick(topic, 'Бали');
    results.push(content);
  }
  
  console.log('📊 Статистика по темам:\n');
  
  results.forEach((content, i) => {
    console.log(`${i + 1}. ${topics[i]}`);
    console.log(`   Score: ${content.viralityScore}`);
    console.log(`   Read: ${content.estimatedReadTime}s`);
    console.log(`   Triggers: ${content.usedTriggers.length}\n`);
  });
  
  const avgScore = results.reduce((sum, c) => sum + c.viralityScore, 0) / results.length;
  console.log(`🎯 Средний score: ${avgScore.toFixed(1)}`);
}

/**
 * ЗАПУСК ВСЕХ ПРИМЕРОВ
 */
async function runAllExamples() {
  try {
    console.log('\n🔥🔥🔥 VIRAL CONTENT ENGINE DEMO 🔥🔥🔥');
    
    await example1_SimpleGeneration();
    await example2_AdvancedGeneration();
    await example3_ABTesting();
    await example4_VideoIntegration();
    await example5_Analytics();
    
    console.log('\n✅ Все примеры выполнены!\n');
    
  } catch (error) {
    console.error('\n❌ Ошибка:', error);
    throw error;
  }
}

// Запускаем демо
if (require.main === module) {
  runAllExamples();
}

export {
  example1_SimpleGeneration,
  example2_AdvancedGeneration,
  example3_ABTesting,
  example4_VideoIntegration,
  example5_Analytics,
  runAllExamples
};