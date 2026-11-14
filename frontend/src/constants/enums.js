// Mirrors backend/enums.py EXACTLY. Change both together.
export const PERSPECTIVE = Object.freeze({
  NARRATOR: "narrator",
  HISTORIAN: "historian",
  AMERICAN: "american",
  BRITISH: "british",
  TOWNSPEOPLE: "townspeople",
  CREW: "crew",
  FIRST_CLASS: "first_class",
  STEERAGE: "steerage",
});

export const PERSPECTIVES_BY_TOPIC = Object.freeze({
  princeton: ["narrator", "historian", "american", "british", "townspeople"],
  titanic: ["narrator", "historian", "crew", "first_class", "steerage"],
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
  SECONDARY_WITH_PRIMARY: "secondary_with_primary",
  INTERPRETIVE_FIRST_PERSON: "interpretive_first_person",
  ORAL_HISTORY: "oral_history",
  NEWS: "news",
  ENCYCLOPEDIA: "encyclopedia",
});

export const MODE = Object.freeze({
  WEB: "web",
  IMESSAGE: "imessage",
});
