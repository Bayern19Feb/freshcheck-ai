"""Download a starter training set for FreshCheck AI from openly licensed datasets.

Output (git-ignored, never published):
  data/images/<class name>/<id>.jpg     resized to max 448 px
  data/manifest.csv                     one row per image: class, split, source, licence, group

Sources (licences checked on 17 Oct 2026, see docs/AI_MODEL_GUIDE.md):
  1. Project-AgML/fresh_rotten_fruit_classification (Hugging Face), "raw" config
     = Sultana et al. 2022, "An extensive dataset for successful recognition of fresh
     and rotten fruits", Data in Brief 44:108552. Licence CC BY 4.0.
     -> apple, banana, orange, grape, strawberry, guava (fresh/rotten);
        jujube + pomegranate are used for the "Other" (not a supported fruit) class.
  2. Papaya Freshness Classification Dataset, Mendeley Data 7mgj5bvp5h v1. Licence CC BY 4.0.
  3. FruitVision (Mendeley Data xkbjx8959c v2), "Original Image.zip". Licence CC BY-NC-ND 4.0
     (non-commercial). -> mango fresh/rotten only.

Split: images that look nearly identical (perceptual hash) are grouped, and a whole
group always goes to the same split, to reduce train/test leakage.

Run:  .venv/Scripts/python tools/dataset/fetch_datasets.py
"""
import csv
import io
import os
import random
import sys
import zipfile
from pathlib import Path

import pyarrow.parquet as pq
import requests
from PIL import Image, ImageOps

sys.path.insert(0, str(Path(__file__).parent))
from remote_zip import HTTPRangeFile  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data"
RAW = DATA / "raw"
IMAGES = DATA / "images"
PER_CLASS = 200
SPLIT = {"train": 140, "validation": 20, "test": 40}
MAX_SIDE = 448
SEED = 2026

AGML = "https://huggingface.co/datasets/Project-AgML/fresh_rotten_fruit_classification/resolve/main/raw/train-0000{i}-of-00004.parquet"
PAPAYA_ZIP = "https://data.mendeley.com/public-files/datasets/7mgj5bvp5h/files/bab0ee18-32ac-4299-8983-b815dfda1eed/file_downloaded"
FRUITVISION_ZIP = "https://data.mendeley.com/public-files/datasets/xkbjx8959c/files/7d97a2e2-d501-4b8c-9fff-699433c001ea/file_downloaded"

SRC_AGML = ("Project-AgML/fresh_rotten_fruit_classification (Sultana et al. 2022)", "CC BY 4.0")
SRC_PAPAYA = ("Papaya Freshness Classification Dataset, Mendeley Data 7mgj5bvp5h", "CC BY 4.0")
SRC_FV = ("FruitVision, Mendeley Data xkbjx8959c v2", "CC BY-NC-ND 4.0")

AGML_FRUIT = {"apple": "Apple", "banana": "Banana", "orange": "Orange", "grape": "Grapes",
              "strawberry": "Strawberry", "guava": "Guava"}
COND = {"fresh": "Fresh", "rotten": "Spoiled"}


def save_image(img_bytes, class_name, image_id):
    """Fix orientation, shrink, save as JPEG. Returns the PIL image (small) for hashing."""
    img = Image.open(io.BytesIO(img_bytes))
    img = ImageOps.exif_transpose(img).convert("RGB")
    img.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
    out = IMAGES / class_name
    out.mkdir(parents=True, exist_ok=True)
    img.save(out / f"{image_id}.jpg", "JPEG", quality=88)
    return img


def dhash(img, size=8):
    """64-bit difference hash of the centre square (what the model sees)."""
    w, h = img.size
    s = min(w, h)
    sq = img.crop(((w - s) // 2, (h - s) // 2, (w - s) // 2 + s, (h - s) // 2 + s))
    g = sq.convert("L").resize((size + 1, size), Image.LANCZOS)
    px = list(g.getdata())
    bits = 0
    for y in range(size):
        for x in range(size):
            bits = (bits << 1) | (px[y * (size + 1) + x] > px[y * (size + 1) + x + 1])
    return bits


def download(url, dest):
    if dest.exists():
        return dest
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_suffix(".part")
    with requests.get(url, stream=True, timeout=120) as r:
        r.raise_for_status()
        total = int(r.headers.get("Content-Length", 0))
        done = 0
        with open(tmp, "wb") as f:
            for chunk in r.iter_content(1 << 20):
                f.write(chunk)
                done += len(chunk)
                print(f"\r  {dest.name}: {done >> 20} / {total >> 20} MB", end="", flush=True)
    print()
    tmp.rename(dest)
    return dest


def main():
    rng = random.Random(SEED)
    rows = []  # dicts: class, file, source, licence, original, hash

    # ---- 1. AgML parquet shards ----
    print("1/3 Project-AgML fresh/rotten fruit (Hugging Face, CC BY 4.0)")
    counts = {}
    for i in range(4):
        path = download(AGML.format(i=i), RAW / "agml" / f"train-{i}.parquet")
        pf = pq.ParquetFile(path)
        for batch in pf.iter_batches(batch_size=32, columns=["image", "label", "fruit_type"]):
            for rec in batch.to_pylist():
                fruit = rec["fruit_type"]
                cond = "fresh" if rec["label"] == 0 else "rotten"
                if fruit in AGML_FRUIT:
                    cls = f"{AGML_FRUIT[fruit]} - {COND[cond]}"
                elif fruit in ("jujube", "pomegranate"):
                    cls = "Other"
                else:
                    continue
                n = counts.get(cls, 0)
                limit = 2 * PER_CLASS if cls == "Other" else PER_CLASS
                if n >= limit:
                    continue
                counts[cls] = n + 1
                image_id = f"agml-{fruit}-{cond}-{n:03d}"
                img = save_image(rec["image"]["bytes"], cls, image_id)
                rows.append({"class": cls, "file": f"{cls}/{image_id}.jpg", "source": SRC_AGML[0],
                             "licence": SRC_AGML[1], "original": f"{fruit}/{cond} #{n}", "hash": dhash(img)})
        print(f"  shard {i} done: {sum(counts.values())} images so far")

    # ---- 2. Papaya (range-read from zip) ----
    print("2/3 Papaya Freshness (Mendeley, CC BY 4.0) — downloading only the selected photos")
    z = zipfile.ZipFile(HTTPRangeFile(PAPAYA_ZIP))
    for folder, cond in (("Dataset/GOOD/", "Fresh"), ("Dataset/BAD/", "Spoiled")):
        names = sorted(n for n in z.namelist() if n.startswith(folder) and n.lower().endswith((".jpg", ".jpeg", ".png")))
        pick = sorted(rng.sample(names, PER_CLASS))
        for k, name in enumerate(pick):
            cls = f"Papaya - {cond}"
            image_id = f"papaya-{cond.lower()}-{k:03d}"
            img = save_image(z.read(name), cls, image_id)
            rows.append({"class": cls, "file": f"{cls}/{image_id}.jpg", "source": SRC_PAPAYA[0],
                         "licence": SRC_PAPAYA[1], "original": name, "hash": dhash(img)})
            print(f"\r  {cls}: {k + 1}/{PER_CLASS}", end="", flush=True)
        print()

    # ---- 3. Mango from FruitVision original images (range-read) ----
    print("3/3 FruitVision mango (Mendeley, CC BY-NC-ND 4.0) — downloading only the selected photos")
    z = zipfile.ZipFile(HTTPRangeFile(FRUITVISION_ZIP))
    for folder, cond in (("Fruits Original/Mango/Fresh/", "Fresh"), ("Fruits Original/Mango/Rotten/", "Spoiled")):
        names = sorted(n for n in z.namelist() if n.startswith(folder) and not n.endswith("/"))
        pick = sorted(rng.sample(names, PER_CLASS))
        for k, name in enumerate(pick):
            cls = f"Mango - {cond}"
            image_id = f"mango-{cond.lower()}-{k:03d}"
            img = save_image(z.read(name), cls, image_id)
            rows.append({"class": cls, "file": f"{cls}/{image_id}.jpg", "source": SRC_FV[0],
                         "licence": SRC_FV[1], "original": name, "hash": dhash(img)})
            print(f"\r  {cls}: {k + 1}/{PER_CLASS}", end="", flush=True)
        print()

    # ---- group near-duplicates, then split whole groups ----
    print("Grouping near-duplicate photos and splitting train / validation / test")
    by_class = {}
    for r in rows:
        by_class.setdefault(r["class"], []).append(r)
    dup_groups = 0
    for cls, items in sorted(by_class.items()):
        parent = list(range(len(items)))

        def find(a):
            while parent[a] != a:
                parent[a] = parent[parent[a]]
                a = parent[a]
            return a

        for a in range(len(items)):
            for b in range(a + 1, len(items)):
                if bin(items[a]["hash"] ^ items[b]["hash"]).count("1") <= 6:
                    parent[find(a)] = find(b)
        groups = {}
        for idx, it in enumerate(items):
            groups.setdefault(find(idx), []).append(it)
        group_list = list(groups.values())
        dup_groups += sum(1 for g in group_list if len(g) > 1)
        rng.shuffle(group_list)
        n = len(items)
        targets = {k: round(v * n / PER_CLASS) for k, v in SPLIT.items()} if cls != "Other" else \
            {k: v * 2 for k, v in SPLIT.items()}
        filled = {"test": 0, "validation": 0, "train": 0}
        for gi, g in enumerate(group_list):
            # fill test first, then validation, rest train; big groups always go to train
            if len(g) <= 3 and filled["test"] + len(g) <= targets["test"]:
                split = "test"
            elif len(g) <= 3 and filled["validation"] + len(g) <= targets["validation"]:
                split = "validation"
            else:
                split = "train"
            filled[split] += len(g)
            for it in g:
                it["split"] = split
                it["group"] = f"{cls}#{gi}"
        print(f"  {cls:20s} train {filled['train']:3d}  validation {filled['validation']:3d}  test {filled['test']:3d}  (groups {len(group_list)})")

    with open(DATA / "manifest.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["class", "split", "file", "group", "source", "licence", "original"])
        w.writeheader()
        for r in sorted(rows, key=lambda r: (r["class"], r["file"])):
            w.writerow({k: r[k] for k in w.fieldnames})
    print(f"Wrote {len(rows)} images and data/manifest.csv ({dup_groups} near-duplicate groups kept together).")


if __name__ == "__main__":
    os.chdir(ROOT)
    main()
