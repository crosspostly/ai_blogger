# ═══════════════════════════════════════════════════════════════
# Instagram Uploader
# ═══════════════════════════════════════════════════════════════

import os
import csv
import time
import gc
from pathlib import Path
from typing import Optional, Tuple
from instagrapi import Client as InstagramClient

class InstagramUploader:
    def __init__(self, csv_path: Path):
        self.csv_path = csv_path
        self.client = None
        self.session_file = 'instagram_session.json'
        self.username = os.getenv('INSTAGRAM_USERNAME', 'danie_lalatun')
        self.password = os.getenv('INSTAGRAM_PASSWORD', '')
    
    def connect(self) -> bool:
        """Connect to Instagram"""
        print("🔑 [Instagram] Logging in...")
        self.client = InstagramClient()
        
        try:
            if os.path.exists(self.session_file):
                self.client.load_settings(self.session_file)
            self.client.login(self.username, self.password)
            print("✅ [Instagram] Logged in\n")
            return True
        except Exception as e:
            print(f"❌ [Instagram] Login failed: {e}\n")
            return False
    
    def upload(self, video_path: Path, caption: str) -> Tuple[bool, str]:
        """Upload to Instagram"""
        try:
            print(f"📤 [Instagram] Uploading {video_path.name}...")
            
            media = self.client.clip_upload(
                str(video_path),
                caption,
                extra_data={"disable_comments": 0}
            )
            
            url = f"https://www.instagram.com/reel/{media.code}/"
            print(f"✅ [Instagram] Posted: {url}\n")
            
            del media
            gc.collect()
            time.sleep(2)
            
            return True, url
        except Exception as e:
            error_msg = str(e)[:100]
            print(f"❌ [Instagram] Error: {error_msg}\n")
            return False, error_msg
    
    def disconnect(self):
        """Close session"""
        try:
            if self.client:
                self.client.dump_settings(self.session_file)
                self.client.logout()
        except:
            pass
    
    def process_videos(self, queue_dir: Path) -> int:
        """Process all new videos from CSV"""
        if not self.connect():
            return 0
        
        count = 0
        try:
            # Read CSV
            rows = []
            if self.csv_path.exists():
                with open(self.csv_path, 'r', encoding='utf-8-sig') as f:
                    reader = csv.DictReader(f)
                    rows = list(reader)
            
            # Find new videos
            for row in rows:
                if row.get('Status', '').lower() != 'new':
                    continue
                
                video_name = row.get('Video File', '')
                if not video_name:
                    continue
                
                video_path = queue_dir / video_name
                if not video_path.exists():
                    row['Status'] = 'error'
                    row['Error'] = 'File not found'
                    continue
                
                caption = row.get('Caption', '')
                success, result = self.upload(video_path, caption)
                
                if success:
                    row['Status'] = 'published'
                    row['URL'] = result
                    row['Error'] = ''
                    count += 1
                else:
                    row['Status'] = 'error'
                    row['Error'] = result
                
                time.sleep(2)
            
            # Write updated CSV
            if rows:
                with open(self.csv_path, 'w', encoding='utf-8', newline='') as f:
                    writer = csv.DictWriter(f, fieldnames=rows[0].keys())
                    writer.writeheader()
                    writer.writerows(rows)
        
        finally:
            self.disconnect()
        
        return count

if __name__ == "__main__":
    queue_dir = Path('videos_queue')
    csv_path = Path('upload_tracker.csv')
    
    uploader = InstagramUploader(csv_path)
    posted = uploader.process_videos(queue_dir)
    
    print(f"\n✅ Instagram: {posted} videos posted")
