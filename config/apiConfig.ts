// config/apiConfig.ts

/**
 * Fallback API keys - используются как дефолтные значения
 * Приоритет: .env/platform > localStorage > FALLBACK_KEYS
 */
const FALLBACK_KEYS = {
  gemini: '', // Пустая строка форсирует использование env/localStorage
} as const;

export type ApiService = 'gemini';

/**
 * Получает ключ из environment variables
 * Поддерживает как API_KEY (платформа), так и VITE_GOOGLE_API_KEY (локальная разработка)
 */
const getEnvKey = (service: ApiService): string | undefined => {
    if (service === 'gemini') {
        return process.env.API_KEY || import.meta.env?.VITE_GOOGLE_API_KEY;
    }
    return undefined;
};

/**
 * Получает API ключ с автоматическим fallback
 * Порядок приоритета:
 * 1. Environment variables (API_KEY или VITE_GOOGLE_API_KEY)
 * 2. localStorage (пользовательские настройки)
 * 3. Захардкоженные ключи (FALLBACK_KEYS)
 */
export const getApiKey = (service: ApiService): string => {
  // 1. Проверяем .env или ключ окружения (наивысший приоритет)
  const envKey = getEnvKey(service);
  if (envKey?.trim()) {
    return envKey.trim();
  }
    
  // 2. Проверяем localStorage (пользовательские настройки)
  try {
    const storageKey = `apiKey_${service}`;
    if (typeof window !== 'undefined') {
        const userKey = localStorage.getItem(storageKey);
        if (userKey?.trim()) {
            return userKey.trim();
        }
    }
  } catch (e) {
    console.warn(`Failed to read ${service} key from localStorage:`, e);
  }

  // 3. Используем fallback ключ
  return FALLBACK_KEYS[service];
};

/**
 * Проверяет, использует ли пользовательский ключ (из localStorage)
 */
export const hasCustomKey = (service: ApiService): boolean => {
  try {
    if (typeof window !== 'undefined') {
        const userKey = localStorage.getItem(`apiKey_${service}`);
        return !!(userKey?.trim());
    }
    return false;
  } catch {
    return false;
  }
};

/**
 * Сохраняет пользовательский ключ в localStorage
 */
export const saveApiKey = (service: ApiService, key: string): void => {
  try {
    const storageKey = `apiKey_${service}`;
    if (key.trim()) {
      localStorage.setItem(storageKey, key.trim());
    } else {
      localStorage.removeItem(storageKey);
    }
  } catch (e) {
    console.error(`Failed to save key for ${service} to localStorage`, e);
  }
};

/**
 * Информация об источнике ключа для UI
 */
export const getKeySource = (service: ApiService): 'custom' | 'env' | 'default' => {
  const envKey = getEnvKey(service);
  if (envKey?.trim()) return 'env';

  if (hasCustomKey(service)) return 'custom';
  
  return 'default';
};
