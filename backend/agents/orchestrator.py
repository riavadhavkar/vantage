"""run_pipeline(session_id, choice_id, question, mode) -> Segment. Owner: A.
Right now this returns MOCK segments so the frontend can build. Gemini comes next.
"""
from typing import Optional

from enums import Mode
from schemas import Segment, Choice, Location, Contradiction, ContradictionSide
from state import session_store
from config import VOICE_BY_PERSPECTIVE

MOCK_SEGMENTS = [
    dict(
        segment_id="seg_mountbatten_plan",
        title="A deadline moved forward",
        narrative_text=(
            "In June 1947, Lord Mountbatten announced that British rule in India would end "
            "within weeks, not months. Two new nations would be created, and millions of people "
            "suddenly had to wonder which side of a line their homes would fall on."
        ),
        perspective="narrator",
        mood="tense",
        scene_prompt="A crowded radio room in Delhi, people leaning in to listen to an announcement",
        location=Location(lat=28.61, lng=77.21, label="Delhi"),
        date_label="June 1947",
        source_ids=["src_mountbatten_plan"],
        choices=[
            Choice(choice_id="ch_radcliffe_line", label="See how the border was drawn",
                   perspective="british_raj", choice_type="what_next"),
            Choice(choice_id="ch_refugee_trains", label="Follow the families who had to leave",
                   perspective="refugee", choice_type="perspective_shift"),
        ],
    ),
    dict(
        segment_id="seg_radcliffe_line_drawn",
        title="A line drawn in five weeks",
        narrative_text=(
            "Cyril Radcliffe had never been to India. He was given about five weeks and outdated "
            "maps to divide Punjab and Bengal. The final border was kept secret until after "
            "independence day."
        ),
        perspective="british_raj",
        mood="somber",
        scene_prompt="A colonial office at night, maps spread across a heavy wooden desk",
        location=Location(lat=31.52, lng=74.36, label="Lahore"),
        travel_from=Location(lat=28.61, lng=77.21, label="Delhi"),
        date_label="August 1947",
        source_ids=["src_radcliffe_report"],
        connected_to=["seg_mountbatten_plan"],
        edge_type="happened_next",
        choices=[
            Choice(choice_id="ch_refugee_trains", label="Follow the families who had to leave",
                   perspective="refugee", choice_type="perspective_shift"),
            Choice(choice_id="ch_death_toll", label="How many people died?",
                   perspective="historian", choice_type="go_deeper"),
        ],
        contradiction=Contradiction(
            contradiction_id="con_death_toll",
            claim="Number of people killed during Partition",
            side_a=ContradictionSide(text="About 200,000", source_id="src_british_estimate"),
            side_b=ContradictionSide(text="Up to 2 million", source_id="src_later_historians"),
            explanation="Early official estimates counted only reported deaths; later historians "
                        "used migration and census data.",
        ),
    ),
]


def run_pipeline(session_id: str, choice_id: Optional[str] = None,
                 question: Optional[str] = None, mode: Mode = Mode.WEB) -> Optional[Segment]:
    state = session_store.get_viewer_state(session_id)
    if state is None:
        return None

    index = len(state["seen_segment_ids"]) % len(MOCK_SEGMENTS)
    data = dict(MOCK_SEGMENTS[index])
    data["session_id"] = session_id
    data["voice_id"] = VOICE_BY_PERSPECTIVE.get(data["perspective"]) or None
    if question:
        data["title"] = "You asked: " + question
    segment = Segment(**data)

    state["seen_segment_ids"].append(segment.segment_id)
    state["current_segment_id"] = segment.segment_id
    state["current_perspective"] = segment.perspective.value
    session_store.save_viewer_state(state)
    return segment
