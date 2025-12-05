# ═══════════════════════════════════════════════════════════════
# TikTok Uploader (Playwright)
# ═══════════════════════════════════════════════════════════════

import os
import csv
import time
import asyncio
from pathlib import Path
from typing import Tuple
from playwright.async_api import async_playwright

class TikTokUploader:
    def __init__(self, csv_path: Path):
        self.csv_path = csv_path
        self.username = os.getenv('TIKTOK_USERNAME', '')
        self.password = os.getenv('TIKTOK_PASSWORD', '')
        self.headless = True  # Set to False for debugging
    
    async def upload(self, video_path: Path, caption: str, tags: list) -> Tuple[bool, str]:
        """Upload to TikTok via Playwright"""
        try:
            print(f"📤 [TikTok] Uploading {video_path.name}...")
            
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=self.headless)
                context = await browser.new_context(
                    viewport={'width': 1920, 'height': 1080}
                )
                page = await context.new_page()
                
                # Go to TikTok
                await page.goto("https://www.tiktok.com/upload", wait_until='networkidle')
                
                # Check if login needed
                try:
                    # Try to find login button (if not logged in)
                    login_btn = await page.query_selector('button:has-text("Log in")', timeout=5000)
                    if login_btn:
                        print("   Logging in...")
                        await page.click('button:has-text("Log in")')
                        await page.wait_for_timeout(2000)
                        
                        # Use phone/email login
                        await page.click('button:has-text("Use phone or email")')
                        await page.wait_for_timeout(1000)
                        
                        # Fill username
                        await page.fill('input[name="username"]', self.username)
                        await page.wait_for_timeout(500)
                        
                        # Fill password
                        await page.fill('input[type="password"]', self.password)
                        await page.wait_for_timeout(500)
                        
                        # Submit
                        await page.click('button[type="submit"]')
                        await page.wait_for_timeout(5000)
                except:
                    pass  # Already logged in or different flow
                
                # Wait for upload page
                await page.wait_for_load_state('networkidle', timeout=15000)
                
                # Upload video
                print("   Selecting video...")
                file_input = await page.query_selector('input[type="file"]')
                if file_input:
                    await file_input.set_input_files(str(video_path))
                else:
                    # Try drop area
                    await page.set_input_files('input[type="file"]', str(video_path))
                
                await page.wait_for_timeout(10000)  # Wait for encoding
                
                # Fill caption
                print("   Adding caption...")
                caption_full = f"{caption}\n{' '.join([f'#{tag}' for tag in tags])}"
                
                # Try different selectors for caption
                caption_input = None
                try:
                    caption_input = await page.query_selector('textarea')
                except:
                    try:
                        caption_input = await page.query_selector('[contenteditable="true"]')
                    except:
                        pass
                
                if caption_input:
                    await caption_input.fill(caption_full)
                
                # Submit
                print("   Publishing...")
                post_btn = await page.query_selector('button:has-text("Post")')
                if post_btn:
                    await post_btn.click()
                else:
                    # Try another selector
                    post_btn = await page.query_selector('button:has-text("Publish")')
                    if post_btn:
                        await post_btn.click()
                
                # Wait for confirmation
                await page.wait_for_load_state('networkidle', timeout=30000)
                
                # Try to get URL (may not be available immediately)
                try:
                    url_elem = await page.query_selector('a[href*="tiktok.com"]')
                    if url_elem:
                        url = await url_elem.get_attribute('href')
                    else:
                        url = "https://www.tiktok.com/upload"  # Fallback
                except:
                    url = "https://www.tiktok.com/upload"
                
                print(f"✅ [TikTok] Posted!\n")
                
                await browser.close()
                return True, url
        
        except Exception as e:
            error_msg = str(e)[:100]
            print(f"❌ [TikTok] Error: {error_msg}\n")
            return False, error_msg
    
    async def process_videos(self, queue_dir: Path) -> int:
        """Process all new videos from CSV"""
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
                tags = row.get('Tags', '').split(',') if row.get('Tags') else []
                
                success, result = await self.upload(video_path, caption, tags)
                
                if success:
                    row['Status'] = 'published'
                    row['TikTok URL'] = result
                    row['Error'] = ''
                    count += 1
                else:
                    row['Status'] = 'error'
                    row['Error'] = result
                
                await asyncio.sleep(5)  # Rate limiting
            
            # Write updated CSV
            if rows:
                with open(self.csv_path, 'w', encoding='utf-8', newline='') as f:
                    writer = csv.DictWriter(f, fieldnames=rows[0].keys())
                    writer.writeheader()
                    writer.writerows(rows)
        
        except Exception as e:
            print(f"❌ [TikTok] Process error: {e}\n")
        
        return count

if __name__ == "__main__":
    queue_dir = Path('videos_queue')
    csv_path = Path('upload_tracker.csv')
    
    uploader = TikTokUploader(csv_path)
    posted = asyncio.run(uploader.process_videos(queue_dir))
    
    print(f"\n✅ TikTok: {posted} videos posted")
