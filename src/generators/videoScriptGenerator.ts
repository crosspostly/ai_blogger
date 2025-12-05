// src/generators/videoScriptGenerator.ts

import type { EmotionalTrigger } from '../../config/viralConfig';

/**
 * ГЕНЕРАТОР СЦЕНАРИЕВ ДЛЯ 8-СЕКУНДНЫХ ВИДЕО
 * Оптимизирован под Gemini Video (Veo 2) ограничения
 */

export interface VideoScript {
  duration: 8; // Фиксированная длительность
  scenes: VideoScene[];
  visualStyle: VisualStyle;
  textOverlays: TextOverlay[];
  voiceScript?: string; // Опционально - для озвучки
  musicMood: string;
}

export interface VideoScene {
  startTime: number;  // В секундах
  endTime: number;    // В секундах
  description: string; // Описание сцены
  cameraMovement: CameraMovement;
  focus: string;      // На чём фокус
}

export type CameraMovement = 
  | 'static'           // Статичная камера
  | 'zoom_out'         // Отдаление
  | 'zoom_in'          // Приближение
  | 'pan_left'         // Панорама влево
  | 'pan_right'        // Панорама вправо
  | 'tracking'         // Следящая камера
  | 'slow_motion';     // Замедленная съёмка

export interface VisualStyle {
  colorGrading: 'warm' | 'cool' | 'neutral' | 'vibrant';
  lighting: 'golden_hour' | 'midday' | 'blue_hour' | 'overcast';
  mood: 'peaceful' | 'energetic' | 'mysterious' | 'inspiring';
  quality: 'cinematic' | 'documentary' | 'vlog' | 'artistic';
}

export interface TextOverlay {
  text: string;
  startTime: number;
  endTime: number;
  position: 'top' | 'center' | 'bottom';
  style: 'bold' | 'minimal' | 'handwritten';
}

/**
 * ШАБЛОНЫ СЦЕНАРИЕВ ДЛЯ РАЗНЫХ ТРИГГЕРОВ
 */
const SCRIPT_TEMPLATES: Record<EmotionalTrigger, VideoScript> = {
  fear_of_missing_out: {
    duration: 8,
    scenes: [
      {
        startTime: 0,
        endTime: 2,
        description: 'Pristine empty beach, turquoise water, white sand, no people',
        cameraMovement: 'zoom_out',
        focus: 'Empty paradise beach'
      },
      {
        startTime: 2,
        endTime: 5,
        description: 'Smooth pan across untouched coastline, palm trees, crystal water',
        cameraMovement: 'pan_right',
        focus: 'Secluded natural beauty'
      },
      {
        startTime: 5,
        endTime: 8,
        description: 'Small waves on shore, golden sunset light, peaceful atmosphere',
        cameraMovement: 'slow_motion',
        focus: 'Ocean waves at sunset'
      }
    ],
    visualStyle: {
      colorGrading: 'warm',
      lighting: 'golden_hour',
      mood: 'peaceful',
      quality: 'cinematic'
    },
    textOverlays: [
      {
        text: 'Скоро здесь будут толпы',
        startTime: 0,
        endTime: 2.5,
        position: 'center',
        style: 'bold'
      },
      {
        text: 'А сейчас — никого',
        startTime: 2.5,
        endTime: 5,
        position: 'center',
        style: 'bold'
      },
      {
        text: 'Напиши БАЛИ 👇',
        startTime: 5,
        endTime: 8,
        position: 'bottom',
        style: 'bold'
      }
    ],
    musicMood: 'Tropical house, inspiring, 120 BPM',
    voiceScript: 'Пока читаешь это... там никого. Только океан. Но не надолго.'
  },

  curiosity: {
    duration: 8,
    scenes: [
      {
        startTime: 0,
        endTime: 3,
        description: 'Hidden cave entrance on beach, mysterious shadows, turquoise glow from water',
        cameraMovement: 'zoom_in',
        focus: 'Secret location entrance'
      },
      {
        startTime: 3,
        endTime: 6,
        description: 'Inside cave, natural light through opening, pristine hidden beach visible',
        cameraMovement: 'pan_left',
        focus: 'Hidden beach reveal'
      },
      {
        startTime: 6,
        endTime: 8,
        description: 'Exit to secret beach, untouched paradise, no footprints on sand',
        cameraMovement: 'static',
        focus: 'Undiscovered paradise'
      }
    ],
    visualStyle: {
      colorGrading: 'vibrant',
      lighting: 'golden_hour',
      mood: 'mysterious',
      quality: 'cinematic'
    },
    textOverlays: [
      {
        text: 'Никто не знает об этом',
        startTime: 0,
        endTime: 3,
        position: 'top',
        style: 'minimal'
      },
      {
        text: 'Пока',
        startTime: 3,
        endTime: 6,
        position: 'center',
        style: 'bold'
      },
      {
        text: 'Хочешь узнать где? 👇',
        startTime: 6,
        endTime: 8,
        position: 'bottom',
        style: 'bold'
      }
    ],
    musicMood: 'Mysterious ambient, building tension',
    voiceScript: 'Местные скрывают это место. Сейчас покажу почему.'
  },

  shock: {
    duration: 8,
    scenes: [
      {
        startTime: 0,
        endTime: 2,
        description: 'Crowded touristy beach, many people, umbrellas, noise',
        cameraMovement: 'static',
        focus: 'Overcrowded beach'
      },
      {
        startTime: 2,
        endTime: 4,
        description: 'Quick transition to empty pristine beach, dramatic contrast',
        cameraMovement: 'zoom_out',
        focus: 'Same island, different world'
      },
      {
        startTime: 4,
        endTime: 8,
        description: 'Peaceful empty beach, crystal water, no people, same island',
        cameraMovement: 'pan_right',
        focus: 'Hidden paradise nearby'
      }
    ],
    visualStyle: {
      colorGrading: 'neutral',
      lighting: 'midday',
      mood: 'energetic',
      quality: 'documentary'
    },
    textOverlays: [
      {
        text: 'Все едут сюда →',
        startTime: 0,
        endTime: 2,
        position: 'center',
        style: 'bold'
      },
      {
        text: 'В 2 км отсюда →',
        startTime: 2,
        endTime: 4,
        position: 'center',
        style: 'bold'
      },
      {
        text: '$10 vs $200',
        startTime: 4,
        endTime: 8,
        position: 'bottom',
        style: 'bold'
      }
    ],
    musicMood: 'Dramatic reveal, impactful',
    voiceScript: 'Пока толпа там. Я здесь. В двух километрах.'
  },

  inspiration: {
    duration: 8,
    scenes: [
      {
        startTime: 0,
        endTime: 3,
        description: 'Sunrise over ocean, first light, warm colors, peaceful water',
        cameraMovement: 'slow_motion',
        focus: 'Magical sunrise moment'
      },
      {
        startTime: 3,
        endTime: 6,
        description: 'Footprints in sand leading to water, new beginning symbolism',
        cameraMovement: 'tracking',
        focus: 'Journey to ocean'
      },
      {
        startTime: 6,
        endTime: 8,
        description: 'Wide shot of endless beach and ocean, freedom and possibility',
        cameraMovement: 'zoom_out',
        focus: 'Infinite possibilities'
      }
    ],
    visualStyle: {
      colorGrading: 'warm',
      lighting: 'golden_hour',
      mood: 'inspiring',
      quality: 'cinematic'
    },
    textOverlays: [
      {
        text: 'Начни сейчас',
        startTime: 0,
        endTime: 3,
        position: 'center',
        style: 'minimal'
      },
      {
        text: 'Не завтра',
        startTime: 3,
        endTime: 6,
        position: 'center',
        style: 'bold'
      },
      {
        text: 'Мир ждёт 🌍',
        startTime: 6,
        endTime: 8,
        position: 'bottom',
        style: 'handwritten'
      }
    ],
    musicMood: 'Uplifting, motivational, crescendo',
    voiceScript: 'Каждый рассвет — новый шанс. Не жди завтра.'
  },

  empathy: {
    duration: 8,
    scenes: [
      {
        startTime: 0,
        endTime: 3,
        description: 'Single footprints in sand at dawn, solitude, personal journey',
        cameraMovement: 'tracking',
        focus: 'Personal story beginning'
      },
      {
        startTime: 3,
        endTime: 6,
        description: 'Peaceful beach scene, gentle waves, meditative atmosphere',
        cameraMovement: 'static',
        focus: 'Finding peace'
      },
      {
        startTime: 6,
        endTime: 8,
        description: 'Sunset over calm ocean, sense of achievement and belonging',
        cameraMovement: 'slow_motion',
        focus: 'Transformation complete'
      }
    ],
    visualStyle: {
      colorGrading: 'warm',
      lighting: 'golden_hour',
      mood: 'peaceful',
      quality: 'artistic'
    },
    textOverlays: [
      {
        text: 'Я тоже боялся',
        startTime: 0,
        endTime: 3,
        position: 'top',
        style: 'minimal'
      },
      {
        text: 'Но всё изменилось',
        startTime: 3,
        endTime: 6,
        position: 'center',
        style: 'minimal'
      },
      {
        text: 'Ты тоже можешь',
        startTime: 6,
        endTime: 8,
        position: 'bottom',
        style: 'handwritten'
      }
    ],
    musicMood: 'Emotional, gentle, hopeful',
    voiceScript: 'Мне было страшно уехать. Теперь страшно вернуться.'
  },

  controversy: {
    duration: 8,
    scenes: [
      {
        startTime: 0,
        endTime: 3,
        description: 'Famous overcrowded tourist spot, expensive, commercialized',
        cameraMovement: 'pan_left',
        focus: 'Tourist trap reality'
      },
      {
        startTime: 3,
        endTime: 5,
        description: 'Quick cut to local authentic place, real culture, real people',
        cameraMovement: 'static',
        focus: 'Hidden authentic experience'
      },
      {
        startTime: 5,
        endTime: 8,
        description: 'Beautiful local beach or spot, untouched, real travel',
        cameraMovement: 'zoom_out',
        focus: 'Truth revealed'
      }
    ],
    visualStyle: {
      colorGrading: 'neutral',
      lighting: 'midday',
      mood: 'energetic',
      quality: 'documentary'
    },
    textOverlays: [
      {
        text: 'Турагентства скрывают',
        startTime: 0,
        endTime: 3,
        position: 'top',
        style: 'bold'
      },
      {
        text: 'Правда здесь',
        startTime: 3,
        endTime: 5,
        position: 'center',
        style: 'bold'
      },
      {
        text: 'Без комиссий',
        startTime: 5,
        endTime: 8,
        position: 'bottom',
        style: 'bold'
      }
    ],
    musicMood: 'Edgy, provocative, attention-grabbing',
    voiceScript: 'Индустрия туризма не хочет, чтобы ты знал это.'
  },

  social_proof: {
    duration: 8,
    scenes: [
      {
        startTime: 0,
        endTime: 3,
        description: 'Montage of beautiful beach locations, variety of paradises',
        cameraMovement: 'zoom_in',
        focus: 'Collection of experiences'
      },
      {
        startTime: 3,
        endTime: 6,
        description: 'Iconic recognizable landmarks from different countries',
        cameraMovement: 'pan_right',
        focus: 'Proven track record'
      },
      {
        startTime: 6,
        endTime: 8,
        description: 'Current beautiful location, continuation of journey',
        cameraMovement: 'static',
        focus: 'Latest discovery'
      }
    ],
    visualStyle: {
      colorGrading: 'vibrant',
      lighting: 'golden_hour',
      mood: 'energetic',
      quality: 'vlog'
    },
    textOverlays: [
      {
        text: '67 стран',
        startTime: 0,
        endTime: 3,
        position: 'top',
        style: 'bold'
      },
      {
        text: '1000+ советов',
        startTime: 3,
        endTime: 6,
        position: 'center',
        style: 'bold'
      },
      {
        text: 'Работает 100%',
        startTime: 6,
        endTime: 8,
        position: 'bottom',
        style: 'bold'
      }
    ],
    musicMood: 'Upbeat, confident, successful',
    voiceScript: 'После 67 стран я знаю, что работает.'
  }
};

/**
 * ГЕНЕРАЦИЯ СЦЕНАРИЯ ПОД TRIGGER
 */
export function generateVideoScript(
  trigger: EmotionalTrigger,
  location?: string
): VideoScript {
  const baseScript = { ...SCRIPT_TEMPLATES[trigger] };
  
  // Персонализируем под локацию, если указана
  if (location) {
    baseScript.scenes = baseScript.scenes.map(scene => ({
      ...scene,
      description: scene.description.replace(/beach|paradise|location/gi, `${location} beach`)
    }));
  }
  
  return baseScript;
}

/**
 * КОНВЕРТАЦИЯ В ПРОМПТ ДЛЯ GEMINI VIDEO
 */
export function scriptToGeminiPrompt(script: VideoScript): string {
  const sceneDescriptions = script.scenes
    .map((scene, i) => `[${scene.startTime}-${scene.endTime}s] ${scene.description}, camera: ${scene.cameraMovement}`)
    .join('\n');
  
  return `
Create a vertical 8-second video (9:16 aspect ratio):

${sceneDescriptions}

VISUAL STYLE:
- Color grading: ${script.visualStyle.colorGrading}
- Lighting: ${script.visualStyle.lighting}
- Mood: ${script.visualStyle.mood}
- Quality: ${script.visualStyle.quality}

Smooth transitions between scenes. Professional travel video aesthetic.
`.trim();
}

/**
 * ПРИМЕР ИСПОЛЬЗОВАНИЯ:
 * 
 * const script = generateVideoScript('fear_of_missing_out', 'Бали');
 * const geminiPrompt = scriptToGeminiPrompt(script);
 * 
 * console.log(geminiPrompt);
 * // Используем в Gemini Video API
 */