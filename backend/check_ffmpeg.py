import imageio_ffmpeg
import os
path = imageio_ffmpeg.get_ffmpeg_exe()
print(f"FFMPEG Path: {path}")
print(f"Exists: {os.path.exists(path)}")
