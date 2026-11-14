"""Fallback segments used when Gemini fails, so the demo never breaks. Owner: A."""
from schemas import Choice, Location, Contradiction, ContradictionSide

MOCK_BY_TOPIC = {
    "princeton": [
        dict(
            segment_id="seg_night_march",
            title="A silent march at midnight",
            narrative_text=(
                "On the night of January 2, 1777, George Washington left his campfires burning "
                "along the Assunpink Creek and slipped his army away in the dark. While the British "
                "expected to finish him at dawn, the Americans marched on frozen back roads toward "
                "Princeton, hoping to strike the garrison there before anyone noticed they were gone."
            ),
            perspective="american",
            mood="tense",
            scene_prompt="Soldiers marching on a frozen dirt road at night, campfires glowing far behind them",
            location=Location(lat=40.329, lng=-74.6752, label="Princeton Battlefield"),
            date_label="January 1777",
            source_ids=["D03"],
            choices=[
                Choice(choice_id="ch_british_side", label="See the morning from the British side",
                       perspective="british", choice_type="perspective_shift"),
                Choice(choice_id="ch_mercer_fate", label="What happened to General Mercer?",
                       perspective="historian", choice_type="go_deeper"),
            ],
        ),
        dict(
            segment_id="seg_mercer_dead_or_alive",
            title="Dead, or not yet?",
            narrative_text=(
                "General Hugh Mercer fell in an orchard near the Clarke farmhouse, beaten and stabbed "
                "by British bayonets. Washington's first report to Congress listed him among the dead. "
                "Two days later Washington wrote again: that report had been premature. Mercer lingered "
                "for more than a week before he died."
            ),
            perspective="historian",
            mood="somber",
            scene_prompt="A quiet stone farmhouse in winter used as a field hospital, a lantern in the window",
            location=Location(lat=40.329, lng=-74.6752, label="Thomas Clarke House"),
            date_label="January 1777",
            source_ids=["D01", "D02"],
            choices=[
                Choice(choice_id="ch_townspeople", label="How did the town live through it?",
                       perspective="townspeople", choice_type="perspective_shift"),
            ],
            contradiction=Contradiction(
                contradiction_id="con_mercer_death",
                claim="Was General Mercer dead after the battle?",
                side_a=ContradictionSide(text="Reported dead on January 5", source_id="D01"),
                side_b=ContradictionSide(text="Report called premature on January 7", source_id="D02"),
                explanation="Washington corrected his own report two days later.",
            ),
        ),
    ],
    "titanic": [
        dict(
            segment_id="seg_iceberg_warning",
            title="Warnings in the dark",
            narrative_text=(
                "On April 14, 1912, the Titanic received several ice warnings from other ships as it "
                "crossed the North Atlantic. The night was calm and moonless. Just before midnight, "
                "lookouts spotted an iceberg dead ahead, and there was no longer enough time to turn."
            ),
            perspective="crew",
            mood="tense",
            scene_prompt="A ship's crow's nest at night above a black calm sea, a pale shape of ice ahead",
            location=Location(lat=41.7325, lng=-49.9469, label="North Atlantic"),
            date_label="April 1912",
            source_ids=["T01"],
            choices=[
                Choice(choice_id="ch_steerage", label="Follow the passengers below deck",
                       perspective="steerage", choice_type="perspective_shift"),
                Choice(choice_id="ch_lifeboats", label="Why were there so few lifeboats?",
                       perspective="historian", choice_type="go_deeper"),
            ],
        ),
    ],
}

# Backwards compatible name
MOCK_SEGMENTS = MOCK_BY_TOPIC["princeton"]
