# Vantage

**Every story, seen from every side.**

Vantage is an interactive documentary engine for any event, past or present. You pick a moment, choose whose eyes to see it through, and the story is written for you as you go, one narrated, illustrated scene at a time. Every scene is grounded in real sources, and when those sources disagree, Vantage shows you the disagreement instead of hiding it.

Demo video: _coming soon_ · Devpost: _coming soon_

## What you can do

- **Pick a story and a perspective.** The Battle of Princeton (3 January 1777) through American soldiers, British soldiers, or the townspeople caught in between. The sinking of the Titanic (14–15 April 1912) through the crew, first-class passengers, or steerage. A narrator and a historian are there for both.
- **Choose where the story goes.** Each scene ends with choices, or you can ask your own question by typing or speaking, and the next scene answers it.
- **Switch perspectives mid-story.** The same moment, retold from another side, in another voice.
- **See the evidence.** Every claim is tagged to the source it came from: Washington's letters to Congress, the London Gazette, the 1912 Senate and British inquiries, survivor memoirs, and more. Open the source panel to read them.
- **See where sources disagree.** Was General Mercer dead or alive? How many British soldiers fell? Did the Titanic break in two before it sank? When a scene touches a documented contradiction, Vantage lays the two accounts side by side, each with its source.
- **Follow the map and the knowledge graph.** Scenes are pinned to where they happened, and a graph shows how the sources and events connect.
- **Continue on your phone.** Every session has a link code. Text `VANTAGE <code>` to the Vantage iMessage line and pick up exactly where you left off, then watch what you did on the phone show up back on the web.

## How it works

The backend is a FastAPI service with two agent modes.

- **Fast mode** (about 5 seconds): retrieves the most relevant source passages for your perspective and choice, and a grounded narrator writes the next scene.
- **Deep mode** (about 12 seconds): a Director agent hands the work to a Researcher, a Narrator, and a Fact-checker that re-checks every claim against the sources and looks up documented disagreements.

The knowledge base is more than 50 hand-curated sources on the two topics chunked into ChromaDB, plus a hand-built list of where those sources agree, follow each other, or contradict each other. Narration comes from Gemini with Grok as a fallback, scenes are painted as full-color cinematic illustrations with Grok image generation, and each perspective has its own ElevenLabs voice. The iMessage side runs on Photon.

The full system overview is in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Quick start

You need Python, Node, and API keys for Gemini, xAI (Grok), ElevenLabs, and Photon.

    # 1. keys
    cp .env.example .env              # then fill in the keys

    # 2. source library (the text is not committed; this downloads and cleans it)
    cd data
    pip install requests trafilatura pypdf
    python fetch_sources.py --priority P1
    python fetch_sources.py --priority P2
    python rebuild_manifest.py

    # 3. backend
    cd ../backend
    python -m venv .venv && source .venv/bin/activate
    pip install -r requirements.txt
    python -m knowledge.ingest        # load the sources into ChromaDB
    uvicorn main:app --port 8000

    # 4. iMessage agent (optional, second terminal)
    python photon_bot.py

    # 5. frontend (third terminal)
    cd frontend && npm install && cp .env.example .env && npm run dev

No keys? Open the frontend with `?demo=1` to play a cached sample run with no network calls.

Some sites block scripts. `fetch_sources.py` lists any source it could not download so it can be copied into `data/sources/<doc_id>.txt` by hand. See [data/README.md](data/README.md).

## Repo map

| Folder | What's in it |
| --- | --- |
| `backend/` | FastAPI app, agents, prompts, ChromaDB knowledge layer, Photon iMessage bot |
| `frontend/` | React + Vite web app (design notes in `frontend/DESIGN.md`) |
| `data/` | Source list, contradiction edges, and the fetch scripts |
| `demo/` | Cached demo path and media |
| `docs/` | Architecture and team handoffs |

## Built with

FastAPI · ChromaDB · Google Gemini · xAI Grok · ElevenLabs · LangChain deepagents · Photon · React · Vite

## Team

Built at HackPrinceton 2026 by Kashish (agents and backend), Ria (frontend and media), and Bhawna (knowledge base, demo, and docs).

See [CONTRIBUTING.md](CONTRIBUTING.md) before committing.
