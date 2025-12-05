#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Инстаграм Reels Автопостинг

Скрипт для автоматической публикации Reels в Instagram.
Кладёте видео + описание в папку → запускаете скрипт → всё публикуется!

Требования:
    pip install instagrapi pillow python-dotenv

Использование:
    python instagram-reels-auto-post.py
"""

import os
import json
from pathlib import Path
from typing import Optional
from datetime import datetime

try:
    from instagrapi import Client
    from instagrapi.types import Usertag, Location
except ImportError:
    print("❌ Установите зависимости: pip install instagrapi")
    exit(1)

try:
    from dotenv import load_dotenv
except ImportError:
    print("⚠️  Рекомендуется: pip install python-dotenv")
    load_dotenv = None


# ═══════════════════════════════════════════════════════════════
# КОНФИГУРАЦИЯ
# ═══════════════════════════════════════════════════════════════

class Config:
    """Настройки скрипта"""
    
    # Папки
    INPUT_DIR = Path("./reels_queue")          # Папка с видео для публикации
    POSTED_DIR = Path("./reels_posted")        # Папка с опубликованными видео
    FAILED_DIR = Path("./reels_failed")        # Папка с неудачными попытками
    
    # Форматы файлов
    VIDEO_EXTENSIONS = [".mp4", ".mov", ".avi"]
    METADATA_FILE = "metadata.json"            # Файл с описанием
    
    # Instagram API
    SESSION_FILE = "instagram_session.json"    # Файл с сессией (чтобы не логиниться каждый раз)
    
    # Лимиты
    MAX_CAPTION_LENGTH = 2200                  # Максимальная длина описания
    MAX_HASHTAGS = 30                          # Максимум хештегов


# ═══════════════════════════════════════════════════════════════
# КЛАСС ДЛЯ РАБОТЫ С INSTAGRAM
# ═══════════════════════════════════════════════════════════════

class InstagramReelsBot:
    """Бот для публикации Reels"""
    
    def __init__(self, username: str, password: str):
        self.username = username
        self.password = password
        self.client = Client()
        self.logged_in = False
    
    def login(self) -> bool:
        """Вход в Instagram с сохранением сессии"""
        try:
            # Пытаемся загрузить существующую сессию
            if os.path.exists(Config.SESSION_FILE):
                print("🔄 Загружаем сохранённую сессию...")
                self.client.load_settings(Config.SESSION_FILE)
                self.client.login(self.username, self.password)
                
                # Проверяем, что сессия валидна
                self.client.get_timeline_feed()
                print("✅ Сессия загружена успешно!")
            else:
                print("🔑 Первый вход в Instagram...")
                self.client.login(self.username, self.password)
                
                # Сохраняем сессию
                self.client.dump_settings(Config.SESSION_FILE)
                print("✅ Вход выполнен, сессия сохранена!")
            
            self.logged_in = True
            return True
            
        except Exception as e:
            print(f"❌ Ошибка входа: {e}")
            # Удаляем невалидную сессию
            if os.path.exists(Config.SESSION_FILE):
                os.remove(Config.SESSION_FILE)
            return False
    
    def post_reel(
        self,
        video_path: Path,
        caption: str,
        thumbnail_path: Optional[Path] = None,
        location: Optional[str] = None,
        disable_comments: bool = False
    ) -> bool:
        """Публикация Reels"""
        
        if not self.logged_in:
            print("❌ Не выполнен вход в Instagram")
            return False
        
        try:
            print(f"\n📤 Публикуем Reels: {video_path.name}")
            
            # Обрезаем описание если нужно
            if len(caption) > Config.MAX_CAPTION_LENGTH:
                print(f"⚠️  Описание обрезано до {Config.MAX_CAPTION_LENGTH} символов")
                caption = caption[:Config.MAX_CAPTION_LENGTH]
            
            # Публикуем
            media = self.client.clip_upload(
                path=str(video_path),
                caption=caption,
                thumbnail=str(thumbnail_path) if thumbnail_path else None,
                extra_data={
                    "disable_comments": 1 if disable_comments else 0,
                }
            )
            
            print(f"✅ Reels опубликован! ID: {media.pk}")
            print(f"🔗 Ссылка: https://www.instagram.com/reel/{media.code}/")
            
            return True
            
        except Exception as e:
            print(f"❌ Ошибка публикации: {e}")
            return False


# ═══════════════════════════════════════════════════════════════
# ОБРАБОТКА ФАЙЛОВ
# ═══════════════════════════════════════════════════════════════

class ReelsProcessor:
    """Обработчик очереди видео"""
    
    def __init__(self, bot: InstagramReelsBot):
        self.bot = bot
        self._create_directories()
    
    def _create_directories(self):
        """Создаём необходимые папки"""
        Config.INPUT_DIR.mkdir(exist_ok=True)
        Config.POSTED_DIR.mkdir(exist_ok=True)
        Config.FAILED_DIR.mkdir(exist_ok=True)
    
    def find_videos(self) -> list[Path]:
        """Находим все видео в очереди"""
        videos = []
        for ext in Config.VIDEO_EXTENSIONS:
            videos.extend(Config.INPUT_DIR.glob(f"*{ext}"))
        return sorted(videos)
    
    def load_metadata(self, video_path: Path) -> dict:
        """Загружаем метаданные для видео"""
        
        # Ищем metadata.json в той же папке
        metadata_path = video_path.parent / Config.METADATA_FILE
        
        if metadata_path.exists():
            with open(metadata_path, 'r', encoding='utf-8') as f:
                all_metadata = json.load(f)
                
                # Ищем метаданные для этого видео
                video_name = video_path.stem
                if video_name in all_metadata:
                    return all_metadata[video_name]
        
        # Ищем отдельный файл video_name.json
        json_path = video_path.with_suffix('.json')
        if json_path.exists():
            with open(json_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        
        # Ищем текстовый файл video_name.txt
        txt_path = video_path.with_suffix('.txt')
        if txt_path.exists():
            with open(txt_path, 'r', encoding='utf-8') as f:
                return {"caption": f.read().strip()}
        
        # По умолчанию - пустое описание
        return {"caption": ""}
    
    def process_queue(self) -> dict:
        """Обрабатываем всю очередь"""
        videos = self.find_videos()
        
        if not videos:
            print("📭 Очередь пуста. Поместите видео в папку:", Config.INPUT_DIR)
            return {"posted": 0, "failed": 0}
        
        print(f"\n📋 Найдено видео: {len(videos)}\n")
        
        stats = {"posted": 0, "failed": 0}
        
        for video_path in videos:
            print(f"{'='*60}")
            print(f"📹 Обрабатываем: {video_path.name}")
            
            # Загружаем метаданные
            metadata = self.load_metadata(video_path)
            caption = metadata.get("caption", "")
            
            print(f"📝 Описание: {caption[:100]}..." if len(caption) > 100 else f"📝 Описание: {caption}")
            
            # Публикуем
            success = self.bot.post_reel(
                video_path=video_path,
                caption=caption,
                disable_comments=metadata.get("disable_comments", False)
            )
            
            # Перемещаем файл
            if success:
                destination = Config.POSTED_DIR / video_path.name
                video_path.rename(destination)
                stats["posted"] += 1
                print(f"📦 Перемещено в: {destination}")
            else:
                destination = Config.FAILED_DIR / video_path.name
                video_path.rename(destination)
                stats["failed"] += 1
                print(f"📦 Перемещено в: {destination}")
        
        return stats


# ═══════════════════════════════════════════════════════════════
# ГЛАВНАЯ ФУНКЦИЯ
# ═══════════════════════════════════════════════════════════════

def main():
    """
    Основная функция
    """
    print("\n" + "="*60)
    print("📱 Instagram Reels Auto-Poster")
    print("="*60 + "\n")
    
    # Загружаем переменные окружения
    if load_dotenv:
        load_dotenv()
    
    # Получаем учётные данные
    username = os.getenv("INSTAGRAM_USERNAME")
    password = os.getenv("INSTAGRAM_PASSWORD")
    
    if not username or not password:
        print("❌ Не найдены учётные данные!")
        print("\nСоздайте файл .env с содержимым:")
        print("-" * 40)
        print("INSTAGRAM_USERNAME=ваш_логин")
        print("INSTAGRAM_PASSWORD=ваш_пароль")
        print("-" * 40)
        return
    
    # Создаём бота
    bot = InstagramReelsBot(username, password)
    
    # Входим
    if not bot.login():
        print("\n❌ Не удалось войти в Instagram")
        return
    
    # Обрабатываем очередь
    processor = ReelsProcessor(bot)
    stats = processor.process_queue()
    
    # Итоги
    print("\n" + "="*60)
    print("📊 ИТОГИ")
    print("="*60)
    print(f"✅ Опубликовано: {stats['posted']}")
    print(f"❌ Ошибок: {stats['failed']}")
    print("\n🎉 Готово!\n")


if __name__ == "__main__":
    main()