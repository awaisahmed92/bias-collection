"""Branded placeholder art cards for products missing photography (v2)."""
from PIL import Image, ImageDraw, ImageFont, ImageFilter

SERIF = "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf"
SERIF_B = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"
SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

ITEMS = {
    "p-polo.jpg":      ("Pique Polo", "Men · Shirts", (52, 68, 92)),
    "p-kurta.jpg":     ("Regal Kurta", "Men · Eastern", (196, 188, 170)),
    "p-dress.jpg":     ("Scarlett Dress", "Women · Dresses", (172, 88, 68)),
    "p-blouse.jpg":    ("Ivory Blouse", "Women · Tops", (205, 192, 168)),
    "p-scarf.jpg":     ("Heritage Scarf", "Women · Scarves", (178, 120, 84)),
    "p-belt.jpg":      ("Artisan Belt", "Accessories", (126, 84, 50)),
    "p-watch.jpg":     ("Gold Watch", "Accessories", (92, 76, 58)),
    "p-sunglasses.jpg":("Riviera Shades", "Accessories", (76, 66, 56)),
    "p-tote.jpg":      ("Canvas Tote", "Accessories", (186, 168, 140)),
    "p-sneakers.jpg":  ("Court Sneakers", "Accessories", (158, 160, 152)),
}

W = H = 1000

def clamp(v): return max(0, min(255, int(v)))
def shade(c, f): return tuple(clamp(x * f) for x in c)
def luminance(c): return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]

def vgradient(top, bottom):
    img = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(img)
    for y in range(H):
        t = y / (H - 1)
        c = tuple(clamp(top[i] * (1 - t) + bottom[i] * t) for i in range(3))
        d.line([(0, y), (W, y)], fill=c)
    return img

for fname, (name, sub, base) in ITEMS.items():
    top = shade(base, 1.14) if luminance(base) < 150 else shade(base, 1.06)
    bottom = shade(base, 0.70)
    img = vgradient(top, bottom)

    # soft radial highlight
    hl = Image.new("L", (W, H), 0)
    dh = ImageDraw.Draw(hl)
    dh.ellipse((W * 0.18, H * 0.10, W * 0.86, H * 0.82), fill=46)
    hl = hl.filter(ImageFilter.GaussianBlur(140))
    img = Image.composite(img, Image.new("RGB", (W, H), shade(base, 1.3)), Image.eval(hl, lambda p: 255 - p))

    dark = luminance(base) < 145
    fg = (246, 242, 233) if dark else (43, 36, 29)
    accent = (206, 168, 112) if dark else (140, 106, 51)

    d = ImageDraw.Draw(img, "RGBA")
    d.rectangle((54, 54, W - 54, H - 54), outline=fg + (200,), width=2)
    d.rectangle((66, 66, W - 66, H - 66), outline=fg + (90,), width=1)

    f_big = ImageFont.truetype(SERIF_B, 290)
    d.text((W // 2, H // 2 - 130), "B", font=f_big, fill=fg + (255,), anchor="mm")
    f_mark = ImageFont.truetype(SANS, 25)
    d.text((W // 2, H - 138), "B I A S   C O L L E C T I O N", font=f_mark, fill=fg + (220,), anchor="mm")
    f_name = ImageFont.truetype(SERIF, 62)
    f_sub = ImageFont.truetype(SANS, 23)
    d.text((W // 2, H // 2 + 128), name, font=f_name, fill=fg + (255,), anchor="mm")
    d.line((W // 2 - 90, H // 2 + 177, W // 2 + 90, H // 2 + 177), fill=accent + (255,), width=3)
    d.text((W // 2, H // 2 + 216), sub.upper(), font=f_sub, fill=accent + (255,), anchor="mm")

    img.save(f"public/images/{fname}", quality=88)
    print("made", fname)
