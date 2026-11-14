# Vantage knowledge data

Source metadata for the two topics Vantage ships with. The source text itself is
not committed (many pages are copyrighted); `fetch_sources.py` rebuilds it.

| File | What it is |
|---|---|
| `documents.csv` | One row per source: topic, perspective, date, subtopics, map coordinates, URL, notes |
| `edges.csv` | Links between sources: `same-event`, `opposing-view`, `caused-by`, `happened-next` |
| `fetch_sources.py` | Downloads and cleans every source into `sources/<doc_id>.txt` plus `sources/manifest.json` |
| `rebuild_manifest.py` | Rebuilds `manifest.json` after any source is added by hand |

## Topics

- **princeton**: Battle of Princeton, 3 Jan 1777. Docs `D01` to `D39`.
- **titanic**: Sinking of the Titanic, 14-15 Apr 1912. Docs `T01` to `T23`.

Perspectives drive narrator voices: `american`, `british`, `townspeople`, `historian` (Princeton)
and `crew`, `first_class`, `steerage`, `historian` (Titanic).

## Contradictions

Rows in `edges.csv` with `relation = opposing-view` are documented disagreements between
sources (for example, Washington reporting General Mercer dead on 5 Jan 1777 and calling that
report "premature" on 7 Jan). The Fact-Checker agent uses them to flag conflicting accounts.

## Rebuild the source text

```
pip install requests trafilatura pypdf
python fetch_sources.py --priority P1
python fetch_sources.py --priority P2
python rebuild_manifest.py
```

Some sites block scripts; the fetch script lists those so they can be copied by hand into
`sources/<doc_id>.txt`. Run `rebuild_manifest.py` afterwards.

Every chunk loaded into ChromaDB carries its document's metadata. Retrieval filters on `topic`.

## Video sources

Rows with `source_type = video_link` (`V01` to `V05`) are reputable videos the app links to in the
source panel. Their text files hold a short summary written by the team, never a transcript.
`fetch_sources.py` skips them.
