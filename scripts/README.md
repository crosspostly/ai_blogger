# 📱 Instagram Reels Auto-Poster

## Быстрый старт:

1. Установите зависимости:
   pip install instagrapi python-dotenv

2. Отредактируйте .env файл:
   - Укажите свой логин/пароль Instagram

3. Положите видео в папку reels_queue/:
   - Формат: video.mp4
   - Описание: video.txt (опционально)

4. Запустите:
   python post_reels.py

## Структура:
- reels_queue/   - видео для публикации
- reels_posted/  - опубликованные
- reels_failed/  - ошибки

## Формат видео:
- Разрешение: 1080x1920 (9:16)
- Формат: .mp4
- Длительность: 8-90 секунд

Готово! 🎉
