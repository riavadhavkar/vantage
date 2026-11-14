"""The data contract between backend and frontend. Change only with team agreement. Owner: A."""
from typing import List, Optional
from pydantic import BaseModel, Field

from enums import Perspective, Mood, EdgeType, ChoiceType, SourceType


class Location(BaseModel):
    lat: float
    lng: float
    label: str


class Choice(BaseModel):
    choice_id: str
    label: str
    perspective: Perspective
    choice_type: ChoiceType


class ContradictionSide(BaseModel):
    text: str
    source_id: str


class Contradiction(BaseModel):
    contradiction_id: str
    claim: str
    side_a: ContradictionSide
    side_b: ContradictionSide
    explanation: str


class Source(BaseModel):
    source_id: str
    title: str
    source_type: SourceType
    perspective: Perspective
    url: Optional[str] = None
    excerpt: str = ""


class Segment(BaseModel):
    segment_id: str
    session_id: str
    title: str
    narrative_text: str
    perspective: Perspective
    mood: Mood
    voice_id: Optional[str] = None
    scene_prompt: str = ""
    image_url: Optional[str] = None
    audio_url: Optional[str] = None
    location: Optional[Location] = None
    travel_from: Optional[Location] = None
    date_label: Optional[str] = None
    source_ids: List[str] = Field(default_factory=list)
    connected_to: List[str] = Field(default_factory=list)
    edge_type: Optional[EdgeType] = None
    choices: List[Choice] = Field(default_factory=list)
    contradiction: Optional[Contradiction] = None
    is_final: bool = False


# ---------- requests ----------
class StartRequest(BaseModel):
    topic: str


class NextSegmentRequest(BaseModel):
    session_id: str
    choice_id: str


class AskRequest(BaseModel):
    session_id: str
    question: str


class TtsRequest(BaseModel):
    segment_id: str
    text: str
    voice_id: str


class ImageRequest(BaseModel):
    segment_id: str
    scene_prompt: str


# ---------- responses ----------
class StartResponse(BaseModel):
    session_id: str
    segment: Segment
    link_code: Optional[str] = None


class SegmentResponse(BaseModel):
    segment: Segment


class SourcesResponse(BaseModel):
    sources: List[Source]


class GraphNode(BaseModel):
    id: str
    label: str
    perspective: Perspective
    is_current: bool = False


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    edge_type: Optional[EdgeType] = None


class GraphResponse(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]


class TtsResponse(BaseModel):
    audio_url: str
    audio_duration_ms: Optional[int] = None


class ImageResponse(BaseModel):
    image_url: str


class ErrorResponse(BaseModel):
    error_code: str
    message: str
