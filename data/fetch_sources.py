"""
Vantage: download and clean every source listed in documents.csv.

Usage (on your laptop, not a server):
    pip install requests trafilatura pypdf
    python fetch_sources.py                 # all docs
    python fetch_sources.py --priority P1   # core sources first (both topics)
    python fetch_sources.py --topic princeton --priority P1   # Princeton core only

Every chunk should carry the doc's `topic` in its ChromaDB metadata, and
retrieval should filter on it, so a Titanic question never pulls Princeton text.

Output: sources/<doc_id>.txt (clean text) and sources/manifest.json
(metadata per doc, ready to attach to every chunk in ChromaDB).
Anything that fails is listed at the end so it can be copied by hand.
"""
import argparse, csv, io, json, os, re, time
import requests
import trafilatura
from pypdf import PdfReader

HEADERS = {"User-Agent": "Mozilla/5.0 (Vantage hackathon research bot)"}
OUT = "sources"


def wiki_text(url):
    title = url.rstrip("/").split("/wiki/")[-1]
    r = requests.get(
        "https://en.wikipedia.org/w/api.php",
        params={"action": "query", "prop": "extracts", "explaintext": 1,
                "titles": requests.utils.unquote(title), "format": "json"},
        headers=HEADERS, timeout=30)
    pages = r.json()["query"]["pages"]
    return next(iter(pages.values())).get("extract", "")


def pdf_text(content):
    reader = PdfReader(io.BytesIO(content))
    return "\n".join((p.extract_text() or "") for p in reader.pages)


def fetch(row):
    url, method = row["url"], row["fetch_method"]
    if "wikipedia.org/wiki/" in url:
        return wiki_text(url)
    r = requests.get(url, headers=HEADERS, timeout=60)
    r.raise_for_status()
    if method == "pdf" or url.lower().endswith(".pdf"):
        return pdf_text(r.content)
    if method == "txt":
        return r.text
    return trafilatura.extract(r.text, include_comments=False, include_tables=True) or ""


def strip_gutenberg(text):
    # Keep only the book itself, not the Project Gutenberg license text.
    start = re.search(r"\*\*\* ?START OF (THE|THIS) PROJECT GUTENBERG.*?\*\*\*", text)
    end = re.search(r"\*\*\* ?END OF (THE|THIS) PROJECT GUTENBERG", text)
    if start:
        text = text[start.end():end.start() if end else None]
    return text


def clean(text):
    text = strip_gutenberg(text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--priority", choices=["P1", "P2"], default=None)
    ap.add_argument("--topic", choices=["princeton", "titanic"], default=None)
    args = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)

    with open("documents.csv", newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    if args.priority:
        rows = [r for r in rows if r["priority"] == args.priority]
    if args.topic:
        rows = [r for r in rows if r["topic"] == args.topic]

    manifest, failed = {}, []
    for row in rows:
        did = row["doc_id"]
        try:
            text = clean(fetch(row))
            if len(text) < 300:
                raise ValueError(f"only {len(text)} chars extracted")
            with open(f"{OUT}/{did}.txt", "w", encoding="utf-8") as f:
                f.write(text)
            meta = {k: row[k] for k in row}
            meta["subtopics"] = row["subtopics"].split("|")
            meta["lat"], meta["lng"] = float(row["lat"]), float(row["lng"])
            meta["chars"] = len(text)
            manifest[did] = meta
            print(f"OK   {did}  {len(text):>7} chars  {row['title'][:60]}")
        except Exception as e:
            failed.append((did, row["url"], str(e)))
            print(f"FAIL {did}  {e}")
        time.sleep(1)  # be polite to small archive sites

    with open(f"{OUT}/manifest.json", "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    if failed:
        print("\nCopy these by hand into sources/<doc_id>.txt:")
        for did, url, err in failed:
            print(f"  {did}  {url}  ({err})")


if __name__ == "__main__":
    main()
