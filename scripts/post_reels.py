from instagrapi import Client
import os
from pathlib import Path

# Креденшлы
USERNAME = os.getenv('INSTAGRAM_USERNAME', 'твой_логин')
PASSWORD = os.getenv('INSTAGRAM_PASSWORD', 'твой_пароль')

# Папки
QUEUE_DIR = Path('reels_queue')
POSTED_DIR = Path('reels_posted')
FAILED_DIR = Path('reels_failed')

# Создаём клиент
cl = Client()

# Логин с сохранением сессии
try:
    cl.load_settings('instagram_session.json')
    cl.login(USERNAME, PASSWORD)
    print('✅ Вошли через сохранённую сессию')
except:
    print('🔑 Первый вход...')
    cl.login(USERNAME, PASSWORD)
    cl.dump_settings('instagram_session.json')
    print('✅ Сессия сохранена!')

# Ищем все видео в очереди
videos = list(QUEUE_DIR.glob('*.mp4'))

if not videos:
    print('📭 Нет видео в очереди. Положите файлы в папку reels_queue/')
    exit()

print(f'📹 Найдено видео: {len(videos)}\n')

# Публикуем каждое видео
for video_path in videos:
    print(f'{'='*60}')
    print(f'📤 Публикуем: {video_path.name}')
    
    # Ищем описание (txt файл с таким же названием)
    txt_path = video_path.with_suffix('.txt')
    
    if txt_path.exists():
        caption = txt_path.read_text(encoding='utf-8')
        print(f'📝 Описание загружено из {txt_path.name}')
    else:
        caption = f'Новое видео! 🎬\n\n#Reels #Instagram'
        print('📝 Используем стандартное описание')
    
    try:
        # Публикуем
        media = cl.clip_upload(str(video_path), caption)
        print(f'✅ Успешно опубликовано!')
        print(f'🔗 https://www.instagram.com/reel/{media.code}/')
        
        # Перемещаем в "опубликовано"
        new_path = POSTED_DIR / video_path.name
        video_path.rename(new_path)
        
        # Перемещаем txt если есть
        if txt_path.exists():
            txt_path.rename(POSTED_DIR / txt_path.name)
        
        print(f'📦 Перемещено в: {new_path}')
        
    except Exception as e:
        print(f'❌ Ошибка: {e}')
        
        # Перемещаем в "ошибки"
        new_path = FAILED_DIR / video_path.name
        video_path.rename(new_path)
        
        if txt_path.exists():
            txt_path.rename(FAILED_DIR / txt_path.name)
        
        print(f'📦 Перемещено в: {new_path}')

print(f'\n{'='*60}')
print('🎉 Готово!')
