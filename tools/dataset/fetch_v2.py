"""FreshCheck AI dataset v2 — up to 500 fresh + 500 spoiled photos per fruit for the
freshness model, and ~50 fruits for the fruit-identification model.

Every photo comes from an openly licensed research dataset (see SOURCES). Photos are
saved resized (max 320 px) in data/v2/images/ (git-ignored, never published) and
listed in data/v2/images.csv with their source, licence, split and which model uses them.

Splits are leak-resistant:
  * photo sets of separate fruits: near-identical photos (difference hash) are grouped,
    and whole groups are assigned to train / validation / test (70/10/20);
  * time-lapse (FruQ) and rotating-fruit (Fruits-360) frames: frames are sorted and split
    in contiguous blocks, so test frames are never neighbours of training frames.

The script is resumable: re-running it skips photos that were already saved.
Run: .venv/Scripts/python tools/dataset/fetch_v2.py
"""
import csv
import io
import json
import random
import re
import subprocess
import sys
import threading
import zipfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import pyarrow.parquet as pq
from PIL import Image, ImageOps

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from remote_zip import HTTPRangeFile  # noqa: E402
from sources import mendeley_files, zenodo_files  # noqa: E402

ROOT = HERE.parents[1]
DATA = ROOT / "data"
OUT = DATA / "v2"
IMG = OUT / "images"
RAW = DATA / "raw"
CAP = 500                 # max photos per fruit per condition
F360_CAP = 400            # max Fruits-360 photos per fruit (identification)
NOT_FRUIT_CAP = 700       # max photos for the "Not a fruit" identification class
ID_FROM_FRESH = 150       # freshness photos per fruit+condition also used for identification
MAX_SIDE = 320
SEED = 2026

CATALOG = json.loads((HERE / "fruit_catalog.json").read_text(encoding="utf-8"))

SOURCES = {
    "agml": ("Sultana et al. 2022, Data in Brief 44:108552 (via Hugging Face Project-AgML/fresh_rotten_fruit_classification)", "CC BY 4.0", "photos"),
    "fruitnet": ("FruitNet: Indian fruits dataset with quality, Mendeley Data b6fftwbr2v (Meshram & Patil 2022)", "CC BY 4.0", "photos"),
    "papaya": ("Papaya Freshness Classification Dataset, Mendeley Data 7mgj5bvp5h", "CC BY 4.0", "photos"),
    "fruitvision": ("FruitVision, Mendeley Data xkbjx8959c v2", "CC BY-NC-ND 4.0", "photos"),
    "fruq": ("FruQ-DB / FruQ-multi, Zenodo record 7224690 (time-lapse video frames)", "CC BY 4.0", "frames"),
    "fruits360": ("Fruits-360 (Mihai Oltean), github.com/fruits-360/fruits-360-100x100", "CC BY-SA 4.0", "frames"),
}

rows = {}   # file -> row


def log(*a):
    print(*a, flush=True)


def save(img_bytes, fruit, cond, src, key, original, order=None):
    """Resize and save one photo (skips if already saved). cond: fresh | spoiled | none."""
    rel = f"{fruit}/{cond}/{src}-{key}.jpg"
    path = IMG / rel
    if not path.exists():
        if callable(img_bytes):          # lazy download: only fetch when not saved yet
            img_bytes = img_bytes()
        img = Image.open(io.BytesIO(img_bytes))
        img = ImageOps.exif_transpose(img).convert("RGB")
        img.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
        path.parent.mkdir(parents=True, exist_ok=True)
        img.save(path, "JPEG", quality=88)
    rows[rel] = {"file": rel, "fruit": fruit, "condition": cond, "source": src, "original": original,
                 "order": order if order is not None else ""}


def count(fruit, cond):
    return sum(1 for r in rows.values() if r["fruit"] == fruit and r["condition"] == cond)


def num_key(name):
    nums = re.findall(r"\d+", name)
    return [int(n) for n in nums] if nums else [0]


def pick_spread(items, n):
    """Pick n items spread evenly through a list (keeps variety, deterministic)."""
    if n >= len(items):
        return list(items)
    step = len(items) / n
    return [items[int(i * step)] for i in range(n)]


# ---------------------------------------------------------------- sources
def from_agml():
    log("[1/6] Sultana et al. / AgML (local copy from v1, CC BY 4.0)")
    fmap = {"apple": "apple", "banana": "banana", "orange": "orange", "grape": "grapes", "strawberry": "strawberry",
            "guava": "guava", "jujube": "jujube", "pomegranate": "pomegranate"}
    n = 0
    for shard in sorted((RAW / "agml").glob("train-*.parquet")):
        for batch in pq.ParquetFile(shard).iter_batches(batch_size=32, columns=["image", "label", "fruit_type"]):
            for rec in batch.to_pylist():
                fruit = fmap.get(rec["fruit_type"])
                if not fruit:
                    continue
                cond = "fresh" if rec["label"] == 0 else "spoiled"
                if count(fruit, cond) >= CAP:
                    continue
                k = f"{rec['fruit_type']}-{cond}-{count(fruit, cond):03d}"
                save(rec["image"]["bytes"], fruit, cond, "agml", k, f"{rec['fruit_type']}/{cond}")
                n += 1
    log(f"   {n} photos")


def from_zip(label, url, plan, src):
    """plan: list of (zip_folder_prefix, fruit, cond). Fills each fruit+cond up to CAP."""
    if url.startswith("file:"):
        path = url[5:]
        log(f"[{label}] reading local zip {path}")
        opener = lambda: zipfile.ZipFile(path)
    else:
        log(f"[{label}] opening remote zip (only selected photos are downloaded)")
        opener = lambda: zipfile.ZipFile(HTTPRangeFile(url))
    z = opener()
    local = threading.local()

    def worker_zip():                     # one zip reader per thread (they are not thread-safe)
        if not hasattr(local, "z"):
            local.z = opener()
        return local.z
    names = [n for n in z.namelist() if not n.endswith("/") and n.lower().endswith((".jpg", ".jpeg", ".png"))]
    rng = random.Random(f"{SEED}-{src}")
    for prefix, fruit, cond in plan:
        need = CAP - count(fruit, cond)
        if need <= 0:
            continue
        pool = sorted([n for n in names if n.startswith(prefix)], key=num_key)
        if src == "fruq":                      # time-lapse: keep frame order, spread over the video
            chosen = pick_spread(pool, need)
        else:
            chosen = sorted(rng.sample(pool, min(need, len(pool))))
        keys = {name: re.sub(r"[^A-Za-z0-9]+", "_", name.split("/", 1)[-1])[-60:] for name in chosen}
        todo = [n for n in chosen if not (IMG / f"{fruit}/{cond}/{src}-{keys[n]}.jpg").exists()]
        order = (lambda n: pool.index(n)) if src == "fruq" else (lambda n: None)
        with ThreadPoolExecutor(max_workers=3 if src == "fruq" else 12) as ex:   # saved as they arrive (low memory)
            for i, (name, data) in enumerate(zip(todo, ex.map(lambda n: worker_zip().read(n), todo))):
                save(data, fruit, cond, src, keys[name], name, order=order(name))
                if (i + 1) % 100 == 0:
                    log(f"   {fruit}/{cond}: downloaded {i + 1}/{len(todo)}")
        for name in chosen:                                # already on disk from an earlier run
            if name not in todo:
                save(b"", fruit, cond, src, keys[name], name, order=order(name))
        log(f"   {fruit}/{cond}: now {count(fruit, cond)}")


def from_fruits360():
    log("[6/6] Fruits-360 100x100 (git sparse checkout, CC BY-SA 4.0)")
    repo = RAW / "fruits360"
    folders = sorted({f for v in CATALOG["fruits"].values() for f in v["f360"]} | set(CATALOG["not_fruit_f360"]))
    if not (repo / ".git").exists():
        subprocess.run(["git", "clone", "--depth", "1", "--filter=blob:none", "--sparse",
                        "https://github.com/fruits-360/fruits-360-100x100.git", str(repo)], check=True)
    subprocess.run(["git", "-C", str(repo), "sparse-checkout", "set", "--no-cone"] +
                   [f"/Training/{f}/" for f in folders], check=True)
    missing = [f for f in folders if not (repo / "Training" / f).is_dir()]
    if missing:
        log("   WARNING missing Fruits-360 folders:", missing)

    def take(fruit, cond, folder_list, cap):
        per = max(1, cap // max(1, len(folder_list)))
        for folder in folder_list:
            d = repo / "Training" / folder
            if not d.is_dir():
                continue
            files = sorted(d.glob("*.jpg"), key=lambda p: num_key(p.name))
            for i, p in enumerate(pick_spread(files, per)):
                key = re.sub(r"[^A-Za-z0-9]+", "_", f"{folder}_{p.stem}")
                save(p.read_bytes(), fruit, cond, "fruits360", key, f"Training/{folder}/{p.name}", order=files.index(p))

    for fruit, info in CATALOG["fruits"].items():
        if info["f360"]:
            take(fruit, "none", info["f360"], F360_CAP)
    take("not-a-fruit", "none", CATALOG["not_fruit_f360"], NOT_FRUIT_CAP)
    log(f"   identification photos: {sum(1 for r in rows.values() if r['source'] == 'fruits360')}")


# ---------------------------------------------------------------- hashing + splits
def dhash(path, size=8):
    img = Image.open(path)
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


def assign_splits():
    rng = random.Random(SEED)
    strata = {}
    for r in rows.values():
        strata.setdefault((r["fruit"], r["condition"], r["source"]), []).append(r)
    for (fruit, cond, src), items in sorted(strata.items()):
        n = len(items)
        if SOURCES[src][2] == "frames":
            # contiguous blocks per original folder (video / rotating fruit)
            byfolder = {}
            for r in items:
                byfolder.setdefault(r["original"].rsplit("/", 1)[0], []).append(r)
            for folder_items in byfolder.values():
                folder_items.sort(key=lambda r: int(r["order"] or 0))
                m = len(folder_items)
                for i, r in enumerate(folder_items):
                    r["split"] = "train" if i < 0.7 * m else "validation" if i < 0.8 * m else "test"
                    r["group"] = f"{src}:{r['original'].rsplit('/', 1)[0]}:{r['split']}"
            continue
        hashes = [dhash(IMG / r["file"]) for r in items]
        parent = list(range(n))

        def find(a):
            while parent[a] != a:
                parent[a] = parent[parent[a]]
                a = parent[a]
            return a
        for a in range(n):
            for b in range(a + 1, n):
                if bin(hashes[a] ^ hashes[b]).count("1") <= 6:
                    parent[find(a)] = find(b)
        groups = {}
        for i, r in enumerate(items):
            groups.setdefault(find(i), []).append(r)
        glist = list(groups.values())
        rng.shuffle(glist)
        target = {"test": round(0.2 * n), "validation": round(0.1 * n)}
        filled = {"test": 0, "validation": 0, "train": 0}
        for gi, g in enumerate(glist):
            if len(g) <= 3 and filled["test"] + len(g) <= target["test"]:
                split = "test"
            elif len(g) <= 3 and filled["validation"] + len(g) <= target["validation"]:
                split = "validation"
            else:
                split = "train"
            filled[split] += len(g)
            for r in g:
                r["split"] = split
                r["group"] = f"{src}:{fruit}:{cond}#{gi}"


def assign_uses():
    fresh_fruits = {f for (f, c) in {(r["fruit"], r["condition"]) for r in rows.values()} if c in ("fresh", "spoiled")} - {"not-a-fruit"}
    for r in rows.values():
        r["use_fresh"] = r["condition"] in ("fresh", "spoiled")
        r["use_id"] = r["condition"] == "none"
    # A spread of freshness photos also teaches the identifier what real photos look like.
    for fruit in sorted(fresh_fruits):
        for cond in ("fresh", "spoiled"):
            items = sorted([r for r in rows.values() if r["fruit"] == fruit and r["condition"] == cond], key=lambda r: r["file"])
            for r in pick_spread(items, ID_FROM_FRESH):
                r["use_id"] = True
    return sorted(fresh_fruits)


def main():
    IMG.mkdir(parents=True, exist_ok=True)
    from_agml()

    fn = {f["filename"]: f for f in mendeley_files("b6fftwbr2v")}["FruitNetDataset.zip"]
    plan = []
    for fname, fruit in (("Apple", "apple"), ("Banana", "banana"), ("Guava", "guava"), ("Lime", "lime"), ("Orange", "orange"), ("Pomegranate", "pomegranate")):
        plan += [(f"Good Quality_Fruits/{fname}_Good/", fruit, "fresh"), (f"Bad Quality_Fruits/{fname}_Bad/", fruit, "spoiled")]
    from_zip("2/6 FruitNet", fn["url"], plan, "fruitnet")

    pp = [f for f in mendeley_files("7mgj5bvp5h") if f["filename"].lower().endswith(".zip")][0]
    from_zip("3/6 Papaya", pp["url"], [("Dataset/GOOD/", "papaya", "fresh"), ("Dataset/BAD/", "papaya", "spoiled")], "papaya")

    fq = {f["filename"]: f for f in zenodo_files("7224690")}["FruQ-multi.zip"]
    # Zenodo rate-limits many small requests, so download this zip once in a single stream (resumable).
    fq_local = RAW / "fruq" / "FruQ-multi.zip"
    if not fq_local.exists() or fq_local.stat().st_size != fq["size"]:
        fq_local.parent.mkdir(parents=True, exist_ok=True)
        log(f"[4/6 FruQ] downloading whole zip ({fq['size'] >> 20} MB) once ...")
        subprocess.run(["curl", "-L", "-C", "-", "--retry", "10", "-s", "-o", str(fq_local), fq["url"]], check=True)
    fq = {**fq, "url": f"file:{fq_local}"}
    fq_plan = [
        ("FruQ-multi/GrapeQ/Good/", "grapes", "fresh"), ("FruQ-multi/GrapeQ/Rotten/", "grapes", "spoiled"),
        ("FruQ-multi/StrawberryQ/Rotten/", "strawberry", "spoiled"),
        ("FruQ-multi/KakiQ/Good/", "persimmon", "fresh"), ("FruQ-multi/KakiQ/Rotten/", "persimmon", "spoiled"),
        ("FruQ-multi/PeachQ/Good/", "peach", "fresh"), ("FruQ-multi/PeachQ/Rotten/", "peach", "spoiled"),
        ("FruQ-multi/PearQ/Good/", "pear", "fresh"), ("FruQ-multi/PearQ/Rotten/", "pear", "spoiled"),
        ("FruQ-multi/tomatoQ/Good/", "tomato", "fresh"), ("FruQ-multi/tomatoQ/Rotten/", "tomato", "spoiled"),
        ("FruQ-multi/WatermeloQ/Good/", "watermelon", "fresh"), ("FruQ-multi/WatermeloQ/Rotten/", "watermelon", "spoiled"),
    ]
    from_zip("4/6 FruQ", fq["url"], fq_plan, "fruq")
    # cucumber + pepper (vegetables) help the models learn "not a supported fruit"
    global CAP
    saved_cap, CAP = CAP, 60
    from_zip("4b/6 FruQ vegetables", fq["url"], [("FruQ-multi/CucumberQ/Fresh/", "not-a-fruit", "fresh"), ("FruQ-multi/CucumberQ/Rotten/", "not-a-fruit", "spoiled"),
                                                 ("FruQ-multi/PepperQ/Good/", "not-a-fruit-2", "fresh"), ("FruQ-multi/PepperQ/Rotten/", "not-a-fruit-2", "spoiled")], "fruq")
    CAP = saved_cap
    for r in rows.values():
        if r["fruit"] == "not-a-fruit-2":
            r["fruit"] = "not-a-fruit"

    fv = {f["filename"]: f for f in mendeley_files("xkbjx8959c")}["Original Image.zip"]
    from_zip("5/6 FruitVision", fv["url"], [("Fruits Original/Mango/Fresh/", "mango", "fresh"), ("Fruits Original/Mango/Rotten/", "mango", "spoiled"),
                                            ("Fruits Original/Grape/Fresh/", "grapes", "fresh"), ("Fruits Original/Grape/Rotten/", "grapes", "spoiled")], "fruitvision")

    from_fruits360()

    log("Assigning leak-resistant splits ...")
    assign_splits()
    fresh_fruits = assign_uses()

    with open(OUT / "images.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["file", "fruit", "condition", "split", "group", "source", "licence", "original", "use_fresh", "use_id"])
        w.writeheader()
        for r in sorted(rows.values(), key=lambda r: r["file"]):
            w.writerow({**{k: r.get(k, "") for k in w.fieldnames}, "licence": SOURCES[r["source"]][1],
                        "source": r["source"], "use_fresh": int(r["use_fresh"]), "use_id": int(r["use_id"])})

    log("\nFreshness photos (fresh / spoiled):")
    for fruit in fresh_fruits + ["not-a-fruit"]:
        log(f"   {fruit:12s} {count(fruit, 'fresh'):4d} / {count(fruit, 'spoiled'):4d}")
    log(f"Identification fruits: {len({r['fruit'] for r in rows.values() if r['use_id']})} classes (incl. not-a-fruit)")
    log(f"Total photos: {len(rows)}  -> data/v2/images.csv")


if __name__ == "__main__":
    main()
