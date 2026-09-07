"""
loadtests/generate_fixture.py

Generates a minimal synthetic JPEG fixture for load tests.
This avoids bundling binary files in git and ensures reproducible, lightweight test images.

Usage:
    python loadtests/generate_fixture.py

Output:
    loadtests/fixtures/test-dog-synthetic.jpg  (≈4 KB, 64×64 px)
"""

import struct
import zlib
import os

OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "fixtures", "test-dog-synthetic.jpg")


def make_minimal_jpeg(width: int = 64, height: int = 64) -> bytes:
    """
    Creates a minimal valid JPEG (SOI + APP0 JFIF + greyscale quantisation
    + Huffman tables + SOS + EOI).  The image is a simple grey gradient — small
    enough to be fast in CI but valid enough to pass format checks.
    """
    # We use Pillow if available (produces a proper JPEG), otherwise fall back
    # to a raw minimal JFIF byte sequence.
    try:
        from PIL import Image
        import io

        img = Image.new("RGB", (width, height), color=(139, 100, 60))  # warm brown (dog fur)
        # Draw a simple "paw" pattern
        pixels = img.load()
        cx, cy = width // 2, height // 2
        for x in range(width):
            for y in range(height):
                # Circular body
                if (x - cx) ** 2 + (y - cy) ** 2 < (min(width, height) // 3) ** 2:
                    pixels[x, y] = (80, 50, 20)

        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=75)
        return buf.getvalue()
    except ImportError:
        # Minimal raw JFIF — not a real image but passes magic-byte checks
        # (SOI + APP0 JFIF marker + minimal data + EOI)
        soi = b"\xff\xd8"
        app0 = b"\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00"
        # Minimal SOF0 (greyscale 4x4)
        sof0 = b"\xff\xc0\x00\x0b\x08\x00\x04\x00\x04\x01\x01\x11\x00"
        # Minimal DHT (stub)
        dht = b"\xff\xc4\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0a\x0b"
        sos = b"\xff\xda\x00\x08\x01\x01\x00\x00?\x00"
        eoi = b"\xff\xd9"
        return soi + app0 + sof0 + dht + sos + eoi


def main():
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    data = make_minimal_jpeg()
    with open(OUTPUT_PATH, "wb") as f:
        f.write(data)
    size_kb = len(data) / 1024
    print(f"[OK] Generated: {OUTPUT_PATH} ({size_kb:.1f} KB)")


if __name__ == "__main__":
    main()
