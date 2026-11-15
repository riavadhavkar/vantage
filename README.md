# Vantage

**Hear every side of the story before you decide.**

Vantage is an interactive documentary engine for any event, past or present. Type an event or pick one of our deep dives, choose whose eyes to see it through, and the story is written for you as you go, one narrated, illustrated scene at a time. Every scene is grounded in real sources, and when those sources disagree, Vantage shows you the disagreement instead of hiding it.

Live site: [vantageo.us](https://vantageo.us) · Demo video and Devpost: _coming soon_

## What you can do

- **Type any event.** Ask for "the eruption of Pompeii" and Vantage researches it with Gemini and Google Search, or builds a source library from Wikipedia when that is not available (turning questions and typos into the right article), and Grok searches the web in the background for primary documents and eyewitness accounts. It reads them, sorts the people into three sides that saw it differently, finds where the sources disagree, and starts the documentary. Disagreements found this way are labeled as found by AI.
- **Or pick a deep dive and a perspective.** The Battle of Princeton (3 January 1777) through American soldiers, British soldiers, or the townspeople caught in between. The sinking of the Titanic (14–15 April 1912) through the crew, first-class passengers, or steerage. A narrator and a historian are there for both.
- **Choose where the story goes.** Each scene ends with choices, or you can ask your own question by typing or speaking, and the next scene answers it.
- **Switch perspectives mid-story.** The same moment, retold from another side, in another voice.
- **See the evidence.** Every claim is tagged to the source it came from: Washington's letters to Congress, the London Gazette, the 1912 Senate and British inquiries, survivor memoirs, and more. Open the source panel to read them.
- **See where sources disagree.** Was General Mercer dead or alive? How many British soldiers fell? Did the Titanic break in two before it sank? When a scene touches a documented contradiction, Vantage lays the two accounts side by side, each with its source.
- **Numbers you can trust.** When a scene mentions money, distances, dates, or ages, Wolfram|Alpha computes the context exactly (for example what £70,000 in 1777 is worth today). You can also ask your own question, such as how fast something was moving or what the moon looked like that night. It becomes one more source, labeled "computation", with a link to the exact Wolfram|Alpha query so you can check it. The AI only picks the question; Wolfram computes the answer.
- **Watch it in your language.** Narration and subtitles in English, Spanish, Hindi, and French.
- **Follow the map and the story connections.** Scenes are pinned to where they happened, and a graph shows how the scenes connect.
- **Get a study map.** One tap builds a mind map of the whole event: causes, key people, turning points, where the sources disagree, and consequences, with the sources behind it listed underneath.
- **Continue on your phone.** Every session has a link code. Text `VANTAGE <code>` to the Vantage iMessage line, (628) 502-3837, and pick up exactly where you left off, then watch what you did on the phone show up back on the web. On the phone you can also text any event to start a new story, `STUDY` for the study map, `SOURCES` for the links, or a language name to switch languages.
- **Or call.** Phone number (620) 798-6062 reaches a voice agent on a Photon number, connected over SIP to an ElevenLabs agent. Pick a language by number and ask about any event out loud. The agent calls our backend, so a call uses the same sources as the website.

## How it works

The backend is a FastAPI service with two agent modes.

- **Fast mode** (about 5 seconds): retrieves the most relevant source passages for your perspective and choice, and a grounded narrator writes the next scene.
- **Deep mode** (30 to 45 seconds a scene): a Director agent hands the work to a Researcher, a Narrator, and a Fact-checker that re-checks every claim against the sources and looks up documented disagreements.

The knowledge base for the two deep dives is 67 hand-curated sources chunked into ChromaDB, plus a hand-built list of 60 connections between them, 17 of which are places where the sources directly contradict each other. Narration comes from Gemini with Grok as a fallback, scenes are painted as full-color cinematic illustrations with Grok image generation, each perspective has its own ElevenLabs voice, and computed facts (money, distances, moon phases) come from Wolfram|Alpha. The iMessage and phone side runs on Photon, and the site is served from Vercel, connected to the backend through a Cloudflare tunnel.

The full system overview is in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Quick start

You need Python, Node, and API keys for Gemini, xAI (Grok), ElevenLabs, and Photon, plus a Wolfram|Alpha LLM API App ID (`WOLFRAM_APP_ID`) for computed answers.

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

Some sites block scripts. `fetch_sources.py` lists any source it could not download so it can be copied into `data/sources/<doc_id>.txt` by hand. See [data/README.md](data/README.md).

## Repo map

| Folder | What's in it |
| --- | --- |
| `backend/` | FastAPI app, agents, prompts, ChromaDB knowledge layer, Photon iMessage bot |
| `frontend/` | React + Vite web app (the interface lives in `frontend/src/ui/`) |
| `data/` | Source list, contradiction edges, and the fetch scripts |
| `demo/` | Cached demo path and media (not used by the web app any more) |
| `docs/` | Architecture and team handoffs |

## Built with

FastAPI · ChromaDB · Google Gemini · xAI Grok · ElevenLabs · Wolfram|Alpha · LangChain deepagents · Photon · React · Vite · Tailwind CSS · Leaflet · React Flow · Vercel · Cloudflare

## Credits

The story graph is drawn with [React Flow](https://reactflow.dev) (xyflow, MIT). Its corner attribution is hidden in the app, so it is credited here and in the share sheet's "about vantage". The map uses [Leaflet](https://leafletjs.com) with tiles © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors. Source texts belong to their publishers and are not committed to this repo; `data/documents.csv` lists each one with its link.

## Team

Built at HackPrinceton 2026 by Kashish (agents and backend), Ria (frontend and media), and Bhawna (knowledge base, demo, and docs).

See [CONTRIBUTING.md](CONTRIBUTING.md) before committing.
