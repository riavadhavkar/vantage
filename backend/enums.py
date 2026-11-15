"""Shared enum values. Mirror EXACTLY in frontend/src/constants/enums.js. Owner: A.
Perspectives match data/documents.csv (princeton + titanic).
"""
from enum import Enum


class Perspective(str, Enum):
    NARRATOR = "narrator"
    HISTORIAN = "historian"
    # princeton
    AMERICAN = "american"
    BRITISH = "british"
    TOWNSPEOPLE = "townspeople"
    # titanic
    CREW = "crew"
    FIRST_CLASS = "first_class"
    STEERAGE = "steerage"
    # any-event mode: three generic sides, labeled per event by /api/topic
    SIDE_A = "side_a"
    SIDE_B = "side_b"
    SIDE_C = "side_c"


class Mood(str, Enum):
    TENSE = "tense"
    SOMBER = "somber"
    HOPEFUL = "hopeful"
    CURIOUS = "curious"
    TRIUMPHANT = "triumphant"
    NEUTRAL = "neutral"


class EdgeType(str, Enum):
    CAUSED_BY = "caused_by"
    HAPPENED_NEXT = "happened_next"
    SAME_EVENT = "same_event"
    OPPOSING_VIEW = "opposing_view"
    DEEPER_CONTEXT = "deeper_context"


class ChoiceType(str, Enum):
    PERSPECTIVE_SHIFT = "perspective_shift"
    GO_DEEPER = "go_deeper"
    WHAT_NEXT = "what_next"
    PRIMARY_SOURCE = "primary_source"


class SourceType(str, Enum):
    PRIMARY = "primary"
    SECONDARY = "secondary"
    SECONDARY_WITH_PRIMARY = "secondary_with_primary"
    INTERPRETIVE_FIRST_PERSON = "interpretive_first_person"
    ORAL_HISTORY = "oral_history"
    NEWS = "news"
    ENCYCLOPEDIA = "encyclopedia"


class Mode(str, Enum):
    WEB = "web"
    IMESSAGE = "imessage"


# Which perspectives belong to which topic (used to steer the narrator).
PERSPECTIVES_BY_TOPIC = {
    "princeton": ["narrator", "historian", "american", "british", "townspeople"],
    "titanic": ["narrator", "historian", "crew", "first_class", "steerage"],
}
