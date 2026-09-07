from PIL import Image, ImageDraw

size = 512
image = Image.new("RGB", (size, size), (238, 243, 248))
draw = ImageDraw.Draw(image)
# Simple non-photorealistic dog-like silhouette; this is a load-test fixture,
# not a benchmark image for model accuracy.
draw.ellipse((90, 155, 420, 440), fill=(182, 125, 76), outline=(80, 50, 30), width=5)
draw.polygon([(125, 190), (55, 90), (180, 150)], fill=(140, 85, 50), outline=(80, 50, 30))
draw.polygon([(390, 190), (455, 90), (340, 150)], fill=(140, 85, 50), outline=(80, 50, 30))
draw.ellipse((170, 235, 215, 285), fill=(20, 20, 20))
draw.ellipse((295, 235, 340, 285), fill=(20, 20, 20))
draw.ellipse((225, 300, 285, 350), fill=(35, 25, 20))
draw.arc((190, 315, 320, 405), 10, 170, fill=(35, 25, 20), width=6)
draw.text((120, 460), "AnimalMind load-test fixture", fill=(30, 40, 55))
image.save("loadtests/fixtures/test-dog-synthetic.jpg", quality=90, optimize=True)
