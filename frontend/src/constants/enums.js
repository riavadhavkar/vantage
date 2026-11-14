// Mirrors backend/enums.py EXACTLY. Change both together.
export const PERSPECTIVE = Object.freeze({
  NARRATOR: "narrator",
  BRITISH_RAJ: "british_raj",
  CONGRESS_LEADERSHIP: "congress_leadership",
  MUSLIM_LEAGUE: "muslim_league",
  SIKH_COMMUNITY: "sikh_community",
  REFUGEE: "refugee",
  HISTORIAN: "historian",
});

export const MOOD = Object.freeze({
  TENSE: "tense",
  SOMBER: "somber",
  HOPEFUL: "hopeful",
  CURIOUS: "curious",
  TRIUMPHANT: "triumphant",
  NEUTRAL: "neutral",
});

export const EDGE_TYPE = Object.freeze({
  CAUSED_BY: "caused_by",
  HAPPENED_NEXT: "happened_next",
  SAME_EVENT: "same_event",
  OPPOSING_VIEW: "opposing_view",
  DEEPER_CONTEXT: "deeper_context",
});

export const CHOICE_TYPE = Object.freeze({
  PERSPECTIVE_SHIFT: "perspective_shift",
  GO_DEEPER: "go_deeper",
  WHAT_NEXT: "what_next",
  PRIMARY_SOURCE: "primary_source",
});

export const SOURCE_TYPE = Object.freeze({
  PRIMARY: "primary",
  SECONDARY: "secondary",
  ORAL_HISTORY: "oral_history",
  NEWS: "news",
  ENCYCLOPEDIA: "encyclopedia",
});
