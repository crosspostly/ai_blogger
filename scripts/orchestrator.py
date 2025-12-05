# ═══════════════════════════════════════════════════════════════
# Multi-Platform Orchestrator
# Main coordinator for Instagram, YouTube, TikTok
# ═══════════════════════════════════════════════════════════════

import csv
import time
import asyncio
from pathlib import Path
from datetime import datetime
from uploader_ig import InstagramUploader
from uploader_yt import YouTubeUploader
from uploader_tt import TikTokUploader

class Orchestrator:
    def __init__(self, csv_path: str = 'upload_tracker.csv', queue_dir: str = 'videos_queue'):
        self.csv_path = Path(csv_path)
        self.queue_dir = Path(queue_dir)
        self.stats = {
            'instagram': {'posted': 0, 'failed': 0},
            'youtube': {'posted': 0, 'failed': 0},
            'tiktok': {'posted': 0, 'failed': 0}
        }
    
    def create_sample_csv(self):
        """Create sample CSV if it doesn't exist"""
        if self.csv_path.exists():
            return
        
        print("📝 Creating sample CSV...\n")
        
        sample_data = [
            {
                'Video File': 'video1.mp4',
                'Title': 'Amazing Place - 5 Years Left',
                'Caption': 'This place will disappear in 5 years\n\nWhile you\'re reading this — nobody\'s there...',
                'Description': 'Cinematic travel video from Bali',
                'Tags': 'travel,viral,nature,bali,cinematic',
                'Status': 'new',
                'Instagram URL': '',
                'YouTube URL': '',
                'TikTok URL': '',
                'Error': '',
                'Timestamp': ''
            }
        ]
        
        with open(self.csv_path, 'w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=sample_data[0].keys())
            writer.writeheader()
            writer.writerows(sample_data)
        
        print(f"✅ Created {self.csv_path}\n")
    
    def ensure_directories(self):
        """Create required directories"""
        self.queue_dir.mkdir(exist_ok=True)
        print(f"✅ Directory ready: {self.queue_dir}\n")
    
    def run_sequential(self):
        """Run uploaders sequentially (safer, one at a time)"""
        print("\n" + "="*70)
        print("🚀 RUNNING SEQUENTIAL UPLOAD")
        print("="*70 + "\n")
        
        # Instagram
        print("\n[1/3] INSTAGRAM\n")
        ig = InstagramUploader(self.csv_path)
        posted = ig.process_videos(self.queue_dir)
        self.stats['instagram']['posted'] = posted
        time.sleep(5)
        
        # YouTube
        print("\n[2/3] YOUTUBE\n")
        yt = YouTubeUploader(self.csv_path)
        posted = yt.process_videos(self.queue_dir)
        self.stats['youtube']['posted'] = posted
        time.sleep(5)
        
        # TikTok
        print("\n[3/3] TIKTOK\n")
        tt = TikTokUploader(self.csv_path)
        posted = asyncio.run(tt.process_videos(self.queue_dir))
        self.stats['tiktok']['posted'] = posted
    
    async def run_parallel(self):
        """Run uploaders in parallel (faster but needs more resources)"""
        print("\n" + "="*70)
        print("🚀 RUNNING PARALLEL UPLOAD")
        print("="*70 + "\n")
        
        # Instagram (sync)
        print("[1/3] INSTAGRAM\n")
        ig = InstagramUploader(self.csv_path)
        ig_task = asyncio.to_thread(ig.process_videos, self.queue_dir)
        
        # YouTube (sync)
        print("[2/3] YOUTUBE\n")
        yt = YouTubeUploader(self.csv_path)
        yt_task = asyncio.to_thread(yt.process_videos, self.queue_dir)
        
        # TikTok (async)
        print("[3/3] TIKTOK\n")
        tt = TikTokUploader(self.csv_path)
        tt_task = tt.process_videos(self.queue_dir)
        
        # Run all
        ig_posted, yt_posted, tt_posted = await asyncio.gather(
            ig_task, yt_task, tt_task
        )
        
        self.stats['instagram']['posted'] = ig_posted
        self.stats['youtube']['posted'] = yt_posted
        self.stats['tiktok']['posted'] = tt_posted
    
    def print_summary(self):
        """Print final summary"""
        print("\n" + "="*70)
        print("📊 SUMMARY")
        print("="*70)
        
        total_posted = 0
        for platform, data in self.stats.items():
            posted = data['posted']
            total_posted += posted
            emoji = '📸' if platform == 'instagram' else '📺' if platform == 'youtube' else '🎵'
            print(f"{emoji} {platform.upper():12} ✅ {posted} posted")
        
        print("="*70)
        print(f"\n🎉 Total: {total_posted} videos posted!")
        print(f"⏰ Finished at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    def run(self, mode: str = 'sequential'):
        """Main orchestrator entry point"""
        print("\n" + "="*70)
        print("🎬 MULTI-PLATFORM VIDEO UPLOADER ORCHESTRATOR")
        print("="*70)
        print(f"📅 Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"📂 Queue dir: {self.queue_dir}")
        print(f"📋 CSV file: {self.csv_path}")
        print(f"🔄 Mode: {mode}")
        print("="*70)
        
        self.create_sample_csv()
        self.ensure_directories()
        
        # Check if CSV exists
        if not self.csv_path.exists():
            print("❌ CSV file not found!\n")
            return
        
        # Check for videos
        videos = list(self.queue_dir.glob('*.mp4')) + list(self.queue_dir.glob('*.mov'))
        if not videos:
            print("📭 No videos found in queue\n")
            return
        
        print(f"📹 Found {len(videos)} video(s)\n")
        
        # Run
        try:
            if mode.lower() == 'parallel':
                asyncio.run(self.run_parallel())
            else:
                self.run_sequential()
        except Exception as e:
            print(f"❌ Error: {e}\n")
        
        self.print_summary()

if __name__ == "__main__":
    import sys
    
    mode = sys.argv[1] if len(sys.argv) > 1 else 'sequential'
    
    orchestrator = Orchestrator()
    orchestrator.run(mode=mode)
