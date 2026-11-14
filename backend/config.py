"""All env vars and constants live here. Owner: A."""
import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
PHOTON_API_KEY = os.getenv("PHOTON_API_KEY", "")
PHOTON_WEBHOOK_SECRET = os.getenv("PHOTON_WEBHOOK_SECRET", "")
VANTAGE_CHROMA_PATH = os.getenv("VANTAGE_CHROMA_PATH", "../data/chroma")
VANTAGE_FRONTEND_ORIGIN = os.getenv("VANTAGE_FRONTEND_ORIGIN", "http://localhost:5173")

CHROMA_COLLECTION = "vantage_chunks"
MAX_CHUNKS = 5

# Fill real ElevenLabs voice IDs. Keys must match enums.Perspective values.
VOICE_BY_PERSPECTIVE = {
    "narrator": "",
    "historian": "",
    "american": "",
    "british": "",
    "townspeople": "",
    "crew": "",
    "first_class": "",
    "steerage": "",
}

# Gemini models (override in .env if one fails)
GEMINI_TEXT_MODEL = os.getenv("GEMINI_TEXT_MODEL", "gemini-4-hydrogen")
GEMINI_FALLBACK_TEXT_MODEL = os.getenv("GEMINI_FALLBACK_TEXT_MODEL", "gemini-3.8-flash")
GEMINI_IMAGE_MODEL = os.getenv("GEMINI_IMAGE_MODEL", "gemini-3.1-flash-image")
GEMINI_EMBED_MODEL = os.getenv("GEMINI_EMBED_MODEL", "gemini-embedding-2")
IMAGE_STYLE_PREFIX = (
    "Loose charcoal sketch, rough expressive strokes, warm muted sepia tones, "
    "editorial illustration, no text, no lettering: "
)

XAI_API_KEY = os.getenv("XAI_API_KEY", "")
XAI_IMAGE_MODEL = os.getenv("XAI_IMAGE_MODEL", "")

XAI_API_KEY = os.getenv("XAI_API_KEY", "")
XAI_IMAGE_MODEL = os.getenv("XAI_IMAGE_MODEL", "")
XAI_TEXT_MODEL = os.getenv("XAI_TEXT_MODEL", "")

# "fast" = single grounded narrator call, "deep" = deepagents Director + sub-agents
AGENT_MODE = os.getenv("VANTAGE_AGENT_MODE", "fast").lower()
