"""Resize a photo for the web (and optionally make a square crate cover).

Usage:
  python3 tools/optimize_photo.py <input> <output.jpg>            # max 1600px, JPEG
  python3 tools/optimize_photo.py <input> <cover.jpg> --cover     # 512x512 square crop
Requires: pip install pillow
"""
import sys

from PIL import Image, ImageOps

MAX_SIZE = 1600
COVER_SIZE = 512


def optimize(src, dest, cover=False):
    im = ImageOps.exif_transpose(Image.open(src)).convert('RGB')
    if cover:
        im = ImageOps.fit(im, (COVER_SIZE, COVER_SIZE), Image.LANCZOS, centering=(0.5, 0.35))
    else:
        im.thumbnail((MAX_SIZE, MAX_SIZE), Image.LANCZOS)
    im.save(dest, 'JPEG', quality=82, optimize=True, progressive=True)
    return im.size


if __name__ == '__main__':
    print(optimize(sys.argv[1], sys.argv[2], '--cover' in sys.argv))
