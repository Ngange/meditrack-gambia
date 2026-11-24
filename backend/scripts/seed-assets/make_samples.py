"""Draws the synthetic X-ray images and sample PDFs used by scripts/seed-test-data.js.
Everything here is computer-drawn: no real patient, no real scan. Only needed if you want to
regenerate the files (pip install pillow numpy); the ready-made files are already in this folder."""
import math, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 900, 1100
LABEL = "SYNTHETIC SAMPLE - NOT A REAL X-RAY"

def font(size):
    for f in ("DejaVuSans.ttf", "arial.ttf"):
        try: return ImageFont.truetype(f, size)
        except OSError: pass
    return ImageFont.load_default()

def layer():
    return Image.new("L", (W, H), 0)

def finish(parts, name, seed):
    """parts = list of (image, blur) added together, then film noise, contrast and a label."""
    rnd = np.random.default_rng(seed)
    acc = np.zeros((H, W), dtype=np.float32)
    for img, blur in parts:
        acc += np.asarray(img.filter(ImageFilter.GaussianBlur(blur)), dtype=np.float32)
    # soft vignette like a real film
    yy, xx = np.mgrid[0:H, 0:W]
    vig = 1 - 0.35 * (((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2)
    acc = acc * vig + 18 + rnd.normal(0, 5, (H, W))
    acc = np.clip(acc, 0, 255).astype(np.uint8)
    im = Image.fromarray(acc, "L").convert("RGB")
    d = ImageDraw.Draw(im)
    d.text((18, H - 38), LABEL, fill=(200, 200, 200), font=font(22))
    d.text((18, 14), name.upper(), fill=(200, 200, 200), font=font(22))
    d.text((W - 60, 14), "R", fill=(230, 230, 230), font=font(30))
    return im

def chest(seed, scoliosis=0):
    soft, lungs, bone, heart = layer(), layer(), layer(), layer()
    ds, dl, db, dh = (ImageDraw.Draw(x) for x in (soft, lungs, bone, heart))
    ds.ellipse((90, 80, 810, 1180), fill=95)                 # torso
    ds.rectangle((330, 0, 570, 220), fill=85)                # neck
    dl.ellipse((140, 230, 430, 800), fill=70)                # lung fields darken the picture
    dl.ellipse((470, 230, 760, 800), fill=70)
    soft_arr = soft
    dh.ellipse((400, 520, 640, 820), fill=70)                # heart shadow
    for i in range(10):                                      # ribs: paired arcs
        y = 250 + i * 55
        for side in (-1, 1):
            cx = 450
            box = (cx - 330 if side < 0 else cx - 10, y - 60, cx + 10 if side < 0 else cx + 330, y + 90)
            db.arc(box, 200 if side < 0 else 340, 340 if side < 0 else 160 + 360, fill=150, width=9)
    for side in (-1, 1):                                     # clavicles
        db.line([(450, 215), (450 + side * 150, 200), (450 + side * 300, 240)], fill=190, width=16)
    for i in range(16):                                      # spine
        y = 180 + i * 48
        x = 450 + scoliosis * math.sin(i / 3)
        db.rounded_rectangle((x - 24, y, x + 24, y + 38), 8, fill=165)
    mask = Image.new("L", (W, H), 0)
    # lungs subtract: build final as soft - lungs - heart + bone
    base = np.asarray(soft, np.float32) - np.asarray(lungs, np.float32) * 0.9 + np.asarray(heart, np.float32) * 0.7
    base_img = Image.fromarray(np.clip(base, 0, 255).astype(np.uint8))
    return finish([(base_img, 10), (bone, 3)], "Chest PA", seed)

def hand(seed):
    soft, bone = layer(), layer()
    ds, db = ImageDraw.Draw(soft), ImageDraw.Draw(bone)
    ds.polygon([(300, 1100), (330, 640), (240, 420), (300, 250), (380, 330), (400, 180), (470, 160), (500, 330),
                (560, 150), (630, 170), (600, 360), (690, 250), (750, 290), (660, 480), (700, 640), (640, 1100)], fill=95)
    for fx, fy, ln in ((300, 520, 3), (410, 480, 3), (510, 470, 3), (600, 490, 3), (690, 560, 2)):  # fingers
        x0, y0 = 450, 760
        for k in range(ln + 1):
            t0, t1 = k / (ln + 1), (k + 1) / (ln + 1)
        px, py = fx, fy
        segs = [(x0 + (fx - x0) * t, y0 + (fy - y0) * t - t * ln * 60) for t in (0.0, 0.35, 0.6, 0.8, 1.0)]
        for a, b in zip(segs, segs[1:]):
            db.line([a, b], fill=200, width=22)
            db.ellipse((b[0] - 14, b[1] - 14, b[0] + 14, b[1] + 14), fill=210)
    for i in range(8):                                       # carpals
        x, y = 360 + (i % 4) * 55, 820 + (i // 4) * 60
        db.ellipse((x, y, x + 52, y + 48), fill=170)
    db.rectangle((385, 900, 425, 1100), fill=185); db.rectangle((470, 900, 510, 1100), fill=185)  # radius, ulna
    return finish([(soft, 12), (bone, 2.5)], "Hand PA", seed)

def knee(seed):
    soft, bone = layer(), layer()
    ds, db = ImageDraw.Draw(soft), ImageDraw.Draw(bone)
    ds.polygon([(250, 0), (650, 0), (700, 560), (680, 1100), (220, 1100), (200, 560)], fill=95)
    db.polygon([(350, 0), (550, 0), (600, 380), (520, 470), (380, 470), (300, 380)], fill=185)      # femur
    db.ellipse((300, 400, 450, 520), fill=200); db.ellipse((450, 400, 600, 520), fill=200)          # condyles
    db.polygon([(310, 560), (590, 560), (560, 640), (340, 640)], fill=190)                          # tibial plateau
    db.rectangle((370, 640, 530, 1100), fill=175)                                                   # tibia
    db.rectangle((560, 650, 620, 1100), fill=160)                                                   # fibula
    db.ellipse((395, 380, 505, 470), fill=0); db.ellipse((405, 385, 495, 460), fill=120)            # patella overlap
    return finish([(soft, 14), (bone, 3)], "Knee AP", seed)

def spine(seed):
    soft, bone = layer(), layer()
    ds, db = ImageDraw.Draw(soft), ImageDraw.Draw(bone)
    ds.rectangle((200, 0, 700, 1100), fill=90)
    for i in range(5):
        y = 120 + i * 190
        x = 450 + 12 * math.sin(i)
        db.rounded_rectangle((x - 95, y, x + 95, y + 150), 18, fill=180)                             # vertebral body
        db.rounded_rectangle((x - 22, y + 20, x + 22, y + 130), 10, fill=100)                        # canal
        db.polygon([(x - 95, y + 40), (x - 190, y + 60), (x - 95, y + 90)], fill=170)                # processes
        db.polygon([(x + 95, y + 40), (x + 190, y + 60), (x + 95, y + 90)], fill=170)
    return finish([(soft, 14), (bone, 3)], "Lumbar spine AP", seed)

def skull(seed):
    soft, bone = layer(), layer()
    ds, db = ImageDraw.Draw(soft), ImageDraw.Draw(bone)
    ds.ellipse((120, 140, 800, 900), fill=95)
    db.ellipse((150, 160, 780, 850), outline=190, width=34)                                          # cranial vault
    db.polygon([(560, 640), (780, 700), (770, 900), (560, 880)], fill=150)                           # face / jaw
    db.ellipse((560, 520, 700, 620), fill=100); db.ellipse((575, 535, 685, 605), fill=170)          # orbit
    db.rectangle((300, 800, 420, 1050), fill=170)                                                    # cervical spine
    for i in range(12):
        a = i * 0.5
        db.arc((250, 250 + i * 8, 600, 700), 200 + i * 6, 260 + i * 6, fill=120, width=3)
    return finish([(soft, 12), (bone, 3)], "Skull lateral", seed)

def pdf(path, title, lines, seed):
    pg = Image.new("RGB", (1240, 1754), "white"); d = ImageDraw.Draw(pg)
    d.rectangle((0, 0, 1240, 150), fill=(28, 95, 181))
    d.text((60, 50), "MediTrack Gambia - SAMPLE", fill="white", font=font(44))
    d.text((60, 200), title, fill=(17, 24, 39), font=font(52))
    y = 330
    for ln in lines:
        d.text((60, y), ln, fill=(40, 48, 66), font=font(34)); y += 62
    d.text((60, 1660), "Synthetic test document. Not a real medical record.", fill=(150, 150, 150), font=font(28))
    pg.save(path, "PDF", resolution=150)

if __name__ == "__main__":
    chest(1).save("xray-chest-pa.png")
    chest(2, scoliosis=22).save("xray-chest-pa-2.png")
    hand(3).save("xray-hand.png")
    knee(4).save("xray-knee.png")
    spine(5).save("xray-lumbar-spine.png")
    skull(6).save("xray-skull-lateral.png")
    pdf("sample-prescription.pdf", "Prescription", ["Patient: SAMPLE PATIENT", "Rx: Amoxicillin 500 mg", "Take one capsule three times daily", "Duration: 7 days", "", "Prescriber: Dr. Test Doctor"], 1)
    pdf("sample-lab-report.pdf", "Laboratory report", ["Full blood count", "Haemoglobin   12.8 g/dL   (12.0 - 15.5)", "WBC   6.4 x10^9/L   (4.0 - 11.0)", "Platelets   255 x10^9/L   (150 - 400)", "", "Verified by: Lab Technician"], 2)
    pdf("sample-discharge-summary.pdf", "Discharge summary", ["Admitted: 3 days", "Diagnosis: Uncomplicated malaria", "Treatment: Artemether-lumefantrine", "Condition on discharge: Stable", "Review in 2 weeks"], 3)
    pdf("sample-medical-certificate.pdf", "Medical certificate", ["This certifies that the patient was seen", "and is unfit for work for 3 days.", "", "Signed: Dr. Test Doctor", "Licence: GMC-TEST-001"], 4)
