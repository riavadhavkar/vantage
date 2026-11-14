"""Shared enum values. Mirror EXACTLY in frontend/src/constants/enums.js. Owner: A."""
from enum import Enum


class Perspective(str, Enum):
    NARRATOR = "narrator"
    BRITISH_RAJ = "british_raj"
    CONGRESS_LEADERSHIP = "congress_leadership"
    MUSLIM_LEAGUE = "muslim_league"
    SIKH_COMMUNITY = "sikh_community"
    REFUGEE = "refugee"
    HISTORIAN = "historian"


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
    ORAL_HISTORY = "oral_history"
    NEWS = "news"
    ENCYCLOPEDIA = "encyclopedia"


class Mode(str, Enum):
    WEB = "web"
    IMESSAGE = "imessage"
