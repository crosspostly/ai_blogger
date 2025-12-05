# ═══════════════════════════════════════════════════════════════
# YouTube Uploader
# ═══════════════════════════════════════════════════════════════

import os
import csv
import time
import pickle
from pathlib import Path
from typing import Tuple
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

class YouTubeUploader:
    def __init__(self, csv_path: Path):
        self.csv_path = csv_path
        self.youtube = None
        self.credentials = None
        self.credentials_file = 'youtube_credentials.json'
        self.token_file = 'youtube_token.pickle'
        self.scopes = ['https://www.googleapis.com/auth/youtube.upload']
    
    def authenticate(self) -> bool:
        """Authenticate with YouTube API"""
        print("🔑 [YouTube] Authenticating...")
        
        try:
            # Try token first
            if os.path.exists(self.token_file):
                with open(self.token_file, 'rb') as f:
                    self.credentials = pickle.load(f)
            
            # Refresh if needed
            if self.credentials:
                if self.credentials.expired and self.credentials.refresh_token:
                    self.credentials.refresh(Request())
                if self.credentials.valid:
                    self.youtube = build('youtube', 'v3', credentials=self.credentials)
                    print("✅ [YouTube] Authenticated (token refreshed)\n")
                    return True
            
            # New auth
            if not os.path.exists(self.credentials_file):
                print("❌ [YouTube] youtube_credentials.json not found\n")
                return False
            
            flow = InstalledAppFlow.from_client_secrets_file(
                self.credentials_file,
                self.scopes
            )
            self.credentials = flow.run_local_server(port=0)
            
            # Save token
            with open(self.token_file, 'wb') as f:
                pickle.dump(self.credentials, f)
            
            self.youtube = build('youtube', 'v3', credentials=self.credentials)
            print("✅ [YouTube] Authenticated (new)\n")
            return True
        
        except Exception as e:
            print(f"❌ [YouTube] Auth failed: {e}\n")
            return False
    
    def upload(self, video_path: Path, title: str, description: str, tags: list) -> Tuple[bool, str]:
        """Upload to YouTube"""
        try:
            print(f"📤 [YouTube] Uploading {video_path.name}...")
            
            body = {
                "snippet": {
                    "title": title,
                    "description": description,
                    "tags": tags[:30],  # Max 30 tags
                    "categoryId": "24"  # Entertainment
                },
                "status": {
                    "privacyStatus": "public",
                    "selfDeclaredMadeForKids": False
                }
            }
            
            media = MediaFileUpload(
                str(video_path),
                mimetype='video/mp4',
                resumable=True,
                chunksize=10*1024*1024  # 10MB chunks
            )
            
            request = self.youtube.videos().insert(
                part="snippet,status",
                body=body,
                media_body=media
            )
            
            # Execute with progress
            response = None
            while response is None:
                try:
                    status, response = request.next_chunk()
                    if status:
                        progress = int(status.progress() * 100)
                        print(f"   Progress: {progress}%")
                except Exception as e:
                    print(f"   Retry: {e}")
                    time.sleep(5)
            
            video_id = response['id']
            url = f"https://www.youtube.com/watch?v={video_id}"
            print(f"✅ [YouTube] Posted: {url}\n")
            
            return True, url
        
        except Exception as e:
            error_msg = str(e)[:100]
            print(f"❌ [YouTube] Error: {error_msg}\n")
            return False, error_msg
    
    def process_videos(self, queue_dir: Path) -> int:
        """Process all new videos from CSV"""
        if not self.authenticate():
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
                
                title = row.get('Title', 'New Video')
                description = row.get('Description', '')
                tags = row.get('Tags', '').split(',') if row.get('Tags') else []
                
                success, result = self.upload(video_path, title, description, tags)
                
                if success:
                    row['Status'] = 'published'
                    row['YouTube URL'] = result
                    row['Error'] = ''
                    count += 1
                else:
                    row['Status'] = 'error'
                    row['Error'] = result
                
                time.sleep(3)  # YouTube quota safety
            
            # Write updated CSV
            if rows:
                with open(self.csv_path, 'w', encoding='utf-8', newline='') as f:
                    writer = csv.DictWriter(f, fieldnames=rows[0].keys())
                    writer.writeheader()
                    writer.writerows(rows)
        
        except Exception as e:
            print(f"❌ [YouTube] Process error: {e}\n")
        
        return count

if __name__ == "__main__":
    queue_dir = Path('videos_queue')
    csv_path = Path('upload_tracker.csv')
    
    uploader = YouTubeUploader(csv_path)
    posted = uploader.process_videos(queue_dir)
    
    print(f"\n✅ YouTube: {posted} videos posted")
