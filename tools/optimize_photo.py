"""Resize a photo for the web.

Usage:
  python3 tools/optimize_photo.py <input> <output.jpg>            # max 1600px, JPEG
Requires: pip install pillow (and pillow-heif for .HEIC)
"""
import sys

from PIL import Image, ImageOps

try:
    from pillow_heif import register_heif_opener  # iPhone .HEIC photos: pip install pillow-heif
    register_heif_opener()
except ImportError:
    pass

MAX_SIZE = 1600


def optimize(src, dest):
    im = ImageOps.exif_transpose(Image.open(src)).convert('RGB')
    im.thumbnail((MAX_SIZE, MAX_SIZE), Image.LANCZOS)
    im.save(dest, 'JPEG', quality=82, optimize=True, progressive=True)
    return im.size


if __name__ == '__main__':
    print(optimize(sys.argv[1], sys.argv[2]))
