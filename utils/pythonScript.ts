export const PYTHON_SCRIPT = `import os
import sys
import subprocess
import glob
import shutil
import piexif

# Requirements:
# pip install piexif
# ffmpeg must be installed on system

def clean_image(filepath):
    try:
        print(f"Processing Image: {filepath}")
        exif_dict = {"0th": {}, "Exif": {}, "GPS": {}, "1st": {}, "thumbnail": None}
        
        # Set Fake Device Data
        exif_dict["0th"][piexif.ImageIFD.Make] = "Apple"
        exif_dict["0th"][piexif.ImageIFD.Model] = "iPhone 17 Pro"
        exif_dict["0th"][piexif.ImageIFD.Software] = "18.1"
        
        exif_bytes = piexif.dump(exif_dict)
        piexif.insert(exif_bytes, filepath)
        print(" - Metadata injected (iPhone 17 Pro)")
    except ImportError:
        print("Error: piexif library not found. Run 'pip install piexif'")
    except Exception as e:
        print(f" - Error processing image: {e}")

def process_video_assets(folder_path):
    # Check for video + audio to merge
    videos = glob.glob(os.path.join(folder_path, "*.mp4"))
    audio = glob.glob(os.path.join(folder_path, "voiceover.wav"))
    
    if videos and audio:
        video_path = videos[0]
        audio_path = audio[0]
        output_path = os.path.join(folder_path, "final_merged_selfie.mp4")
        print(f"Merging Video + Audio in {folder_path}")
        
        # ffmpeg command to replace audio or merge
        # -stream_loop -1 loops the video if audio is longer
        # -shortest cuts to shortest stream
        cmd = [
            "ffmpeg", "-y",
            "-stream_loop", "-1", "-i", video_path,
            "-i", audio_path,
            "-c:v", "copy", "-c:a", "aac",
            "-map", "0:v:0", "-map", "1:a:0",
            "-shortest",
            output_path
        ]
        try:
            subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            print(" - Merged successfully!")
        except Exception as e:
            print(f" - Merge failed: {e}")

def create_video_from_slideshow(folder_path):
    images = sorted(glob.glob(os.path.join(folder_path, "*.jpg")))
    audio = glob.glob(os.path.join(folder_path, "voiceover.wav"))
    
    if len(images) >= 3 and audio:
        print(f"Creating Slideshow Video in {folder_path}")
        output_path = os.path.join(folder_path, "slideshow_video.mp4")

        # Create input list file (UTF-8 to avoid Unicode issues on Windows codepages)
        input_list_path = os.path.join(folder_path, "input.txt")
        with open(input_list_path, "w", encoding="utf-8") as f:
            for img in images:
                f.write(f"file '{os.path.abspath(img)}'\\n")
                f.write("duration 3\\n")
        
        # Command: Images -> Video + Audio
        # Assuming 3 images, 3s duration each approx
        cmd = [
            "ffmpeg", "-y",
            "-f", "concat", "-safe", "0", "-i", input_list_path,
            "-i", audio[0],
            "-vf", "format=yuv420p",
            "-c:v", "libx264", "-c:a", "aac",
            "-shortest",
            output_path
        ]
        
        try:
            subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            print(" - Slideshow created!")
        except Exception as e:
            print(f" - Slideshow creation failed: {e}")
        finally:
            if os.path.exists(input_list_path):
                os.remove(input_list_path)

def main():
    print("Starting Asset Processing...")
    
    # Process all nested folders
    for root, dirs, files in os.walk("."):
        
        # Clean Images
        for file in files:
            full_path = os.path.join(root, file)
            if file.lower().endswith(('.jpg', '.jpeg')):
                clean_image(full_path)
        
        # Check for asset folders to process video
        if "Slideshow" in root or "Selfie" in root or "Video" in root:
             create_video_from_slideshow(root)
             process_video_assets(root)

    print("\\nDone! All assets processed.")

if __name__ == "__main__":
    main()
`;