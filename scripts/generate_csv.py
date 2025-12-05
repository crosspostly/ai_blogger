# ═══════════════════════════════════════════════════════════════
# CSV Generator
# Quickly create CSV entries from videos in queue
# ═══════════════════════════════════════════════════════════════

import csv
from pathlib import Path

def generate_csv(queue_dir: str = 'videos_queue', csv_file: str = 'upload_tracker.csv'):
    """Generate CSV from videos in queue folder"""
    
    queue_path = Path(queue_dir)
    csv_path = Path(csv_file)
    
    # Video extensions
    extensions = ['.mp4', '.mov', '.avi', '.mkv']
    
    # Find all videos
    videos = []
    for ext in extensions:
        videos.extend(queue_path.glob(f'*{ext}'))
    
    if not videos:
        print(f"No videos found in {queue_dir}/")
        return
    
    # Read existing CSV
    existing_rows = {}
    if csv_path.exists():
        with open(csv_path, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                video_file = row.get('Video File', '')
                if video_file:
                    existing_rows[video_file] = row
    
    # Create rows for new videos
    fieldnames = [
        'Video File', 'Title', 'Caption', 'Description', 'Tags',
        'Status', 'Instagram URL', 'YouTube URL', 'TikTok URL',
        'Error', 'Timestamp'
    ]
    
    rows = []
    
    for video in sorted(videos):
        video_name = video.name
        
        # Check if already exists
        if video_name in existing_rows:
            rows.append(existing_rows[video_name])
            print(f"✓ {video_name} (existing)")
            continue
        
        # Create new row
        title = video.stem.replace('_', ' ').replace('-', ' ')
        row = {
            'Video File': video_name,
            'Title': f"[EDIT] {title}",
            'Caption': "🎬 New video! #Reels #Instagram #YouTube #TikTok",
            'Description': "Great content!",
            'Tags': "viral,entertainment,auto",
            'Status': 'new',
            'Instagram URL': '',
            'YouTube URL': '',
            'TikTok URL': '',
            'Error': '',
            'Timestamp': ''
        }
        rows.append(row)
        print(f"+ {video_name} (new)")
    
    # Write CSV
    if rows:
        with open(csv_path, 'w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)
        
        print(f"\n✅ CSV updated: {csv_path}")
        print(f"   Total entries: {len(rows)}")
    else:
        print("No videos to process")

if __name__ == "__main__":
    import sys
    
    queue_dir = sys.argv[1] if len(sys.argv) > 1 else 'videos_queue'
    csv_file = sys.argv[2] if len(sys.argv) > 2 else 'upload_tracker.csv'
    
    generate_csv(queue_dir, csv_file)
