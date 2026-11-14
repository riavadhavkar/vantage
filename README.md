# Vantage

OWNER: Person C (README + Devpost)

TODO: project description, setup, demo link.

## Quick start

    # backend
    cd backend && python -m venv .venv && source .venv/bin/activate
    pip install -r requirements.txt
    cp ../.env.example ../.env
    uvicorn main:app --reload

    # frontend
    cd frontend && npm install && cp .env.example .env && npm run dev

See [CONTRIBUTING.md](CONTRIBUTING.md) before committing.
