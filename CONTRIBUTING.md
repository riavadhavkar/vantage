# Contributing

## Ownership

| Person | Branches | Owns |
|---|---|---|
| A (Kashish) | `a/agents`, `a/photon` | `backend/` (agents, knowledge, API, Photon), except files below |
| B | `b/graph-ui`, `b/narration` | `frontend/`, `backend/routers/media.py`, `backend/services/elevenlabs_service.py` |
| C | `c/data`, `c/prompts` | `data/`, `demo/`, `backend/prompts/`, README, Devpost |

**Shared contract:** `backend/schemas.py`, `backend/enums.py`, `frontend/src/constants/enums.js`. Change only when all three agree, and change all three together.

## Rules

- Never commit directly to `main`; work on your own branch and open a PR.
- Only edit files you own.
- Never commit `.env`; only `.env.example`.
- Commit messages: `area: what changed`, lowercase (e.g. `data: tag refugee oral histories`).

## Checkpoints
Sat 3 PM, Sat 6 PM, Sat 10 PM, Sun 6 AM:

    git add . && git commit -m "ui: animate choice buttons"
    git pull origin main
    git push origin <your-branch>
    # open a PR into main and merge
