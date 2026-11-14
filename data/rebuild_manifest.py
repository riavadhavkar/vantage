"""
Rebuild sources/manifest.json from documents.csv for every sources/<doc_id>.txt
that exists, including files you pasted in by hand.

Usage (same folder as documents.csv):
    python rebuild_manifest.py
"""
import csv, json, os

OUT = "sources"
with open("documents.csv", newline="", encoding="utf-8") as f:
    rows = {r["doc_id"]: r for r in csv.DictReader(f)}

manifest, missing = {}, []
for did, row in rows.items():
    path = f"{OUT}/{did}.txt"
    if not os.path.exists(path):
        missing.append(did)
        continue
    with open(path, encoding="utf-8") as f:
        text = f.read()
    meta = dict(row)
    meta["subtopics"] = row["subtopics"].split("|")
    meta["lat"], meta["lng"] = float(row["lat"]), float(row["lng"])
    meta["chars"] = len(text)
    manifest[did] = meta

with open(f"{OUT}/manifest.json", "w", encoding="utf-8") as f:
    json.dump(manifest, f, indent=2)

print(f"manifest.json now has {len(manifest)} docs.")
small = [d for d, m in manifest.items() if m["chars"] < 1500]
if small:
    print("Suspiciously short (open and check):", ", ".join(small))
p1_missing = [d for d in missing if rows[d]["priority"] == "P1"]
if p1_missing:
    print("P1 docs still missing a text file:", ", ".join(p1_missing))
