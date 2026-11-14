// OWNER: Person B
// Backup mock topic. Sources and perspectives follow the team's data/documents.csv
// and edges.csv. Narration is a SAMPLE built from those notes.
import { makeSegment, claims, sourceFromRow, finalizeBundle } from './makeSegment.js'

const FIELD = { lat: 40.3305, lng: -74.676, label: "William Clarke's orchard" }
const TOWN = { lat: 40.3487, lng: -74.6593, label: 'Nassau Hall, Princeton' }
const TRENTON = { lat: 40.2181, lng: -74.7608, label: 'Assunpink Creek, Trenton' }
const CLARKE_HOUSE = { lat: 40.329, lng: -74.6752, label: 'Thomas Clarke House' }

const topic = {
  topic_id: 'princeton',
  title: 'The Battle of Princeton',
  one_line: 'A winter night march and a morning battle in a New Jersey college town, January 1777.',
  aliases: ['Battle of Princeton', 'Princeton 1777', 'Princeton'],
  perspectives: [
    { perspective_id: 'american', label: 'The American army', color: '#7D9FC4', voice_id: 'SAMPLE-voice-american', description: "SAMPLE: Washington's reports and soldiers' letters." },
    { perspective_id: 'british', label: 'The British regulars', color: '#C8A15A', voice_id: 'SAMPLE-voice-british', description: "SAMPLE: Howe's official report, Mawhood's column, a regimental surgeon." },
    { perspective_id: 'townspeople', label: 'The people of Princeton', color: '#9DB29A', voice_id: 'SAMPLE-voice-townspeople', description: 'SAMPLE: Residents, the college, and the enslaved, through 26 days of occupation.' },
    { perspective_id: 'historian', label: 'Historians', color: '#AEB4B1', voice_id: 'SAMPLE-voice-historian', description: 'SAMPLE: What later accounts confirm, and what they dispute.' },
  ],
}

const sources = [
  ['D01', 'George Washington to John Hancock, 5 Jan 1777', 'Founders Online (National Archives)', 'https://founders.archives.gov/documents/Washington/03-07-02-0411', 'primary', 'american', "Washington's after-action report to Congress. Reports Mercer dead; estimates British loss near 500."],
  ['D02', 'George Washington to John Hancock, 7 Jan 1777', 'Founders Online (National Archives)', 'https://founders.archives.gov/documents/Washington/03-08-02-0008', 'primary', 'american', "Corrects himself: the report of Mercer's death 'was premature'."],
  ['D03', 'Battle of Princeton (overview)', 'Wikipedia', 'https://en.wikipedia.org/wiki/Battle_of_Princeton', 'encyclopedia', 'historian', 'Backbone overview of the whole timeline.'],
  ['D05', '10 Facts About the Battle of Princeton', "George Washington's Mount Vernon", 'https://www.mountvernon.org/george-washington/the-revolutionary-war/10-facts-about-the-battle-of-princeton/', 'secondary', 'historian', 'Mawhood rode in with his spaniels; the British believed they had killed Washington.'],
  ['D06', 'Princeton (battle article)', 'American Battlefield Trust', 'https://www.battlefields.org/learn/articles/princeton', 'secondary', 'historian', "Moment by moment: Mercer's 'Forward!', Capt. William Leslie's death, bayonets against rifles."],
  ['D08', 'Hugh Mercer', 'Wikipedia', 'https://en.wikipedia.org/wiki/Hugh_Mercer', 'encyclopedia', 'historian', 'Culloden survivor and doctor; died 12 January 1777.'],
  ['D09', 'Thomas Clarke House', 'NJ Dept. of Environmental Protection', 'https://nj.gov/dep/parksandforests/historic/clarkehouse.html', 'secondary', 'townspeople', 'Quaker farmhouse turned hospital for both armies. Lists Susannah, enslaved by the Clarke family.'],
  ['D10', "Extract of Howe's letter to Germain on Princeton (London Gazette 11747)", 'The London Gazette', 'https://thegazette.co.uk/London/issue/11747/page/2/data.pdf', 'primary', 'british', "Official British report: about 18 killed, 58 wounded, 200 missing ('many rejoined'). Claims Mercer among the enemy dead."],
  ['D13', 'Lt. Col. Charles Mawhood (first-person character sheet)', 'Princeton Battlefield Society', 'https://pbs1777.org/wp-content/uploads/2021/06/Charles-Mawhood.pdf', 'interpretive_first_person', 'british', 'Modern first-person interpretation, not a 1777 document.'],
  ['D14', 'A Brief Narrative of the Ravages of the British and Hessians at Princeton, 1776-77', 'Robert Lawrence; ed. V.L. Collins, Princeton Univ. Library 1906', 'https://distantreader.org/stacks/trust/uc2/uc2_ark+=13960=t0wp9v536.txt', 'primary', 'townspeople', "An 84-year-old lawyer's diary of the 26-day occupation; he saw only the start of the battle. Partisan."],
  ['D18', 'Alexander Hamilton shooting the cannonball that destroys the portrait of King George', 'Princeton University Archives (Mudd Library blog)', 'https://universityarchives.princeton.edu/2008/01/alexander-hamilton-shooting-the-cannonball-that-destroys-the-portrait-of-king-george', 'secondary', 'historian', 'No contemporary account ties Hamilton to the cannonball; the earliest link is from 1905.'],
  ['D19', 'Princetoniana Museum: Nassau Hall in the Revolution', 'Princetoniana Museum', 'https://www.princetonianamuseum.org/artifact/1e9c00c9-1613-489f-ae5a-96e5fd684f9f', 'secondary', 'historian', "States as fact that Hamilton's battery fired the ball that destroyed the portrait of George II."],
  ['D27', 'Thomas Clarke House historical marker (Susannah)', 'Historical Marker Database', 'https://www.hmdb.org/m.asp?m=263707', 'secondary', 'townspeople', 'Susannah cared for the wounded after the battle; the Clarkes freed her in 1779.'],
  ['D30', 'Intelligence in the Battle of Princeton', 'Wikipedia', 'https://en.wikipedia.org/wiki/Intelligence_in_the_Battle_of_Princeton', 'encyclopedia', 'american', 'A spy map of British positions made the night march possible.'],
  ['D32', "A Compromise Saves 'Washington's Charge' at Princeton", 'American Battlefield Trust', 'https://www.battlefields.org/learn/compromise-saves-washingtons-charge-princeton', 'secondary', 'historian', "The modern fight over the field: faculty housing against battlefield preservation."],
  ['D33', 'Sergeant R. describes the aftermath of Trenton (Wellsburg Gazette, 1832)', 'New Jersey State Archives', 'https://nj.gov/state/historical/assets/pdf/topical/war-document-march-24-1832.pdf', 'primary', 'american', "Expiring enlistments, and a march 'marked with the blood of the soldiers' feet'. Written 55 years later."],
].map(sourceFromRow)

const segments = [
  makeSegment({
    segment_id: 'pr-1',
    title: 'The night march',
    perspective: 'american',
    mood: 'tense',
    date_label: '2 to 3 January 1777',
    location: TRENTON,
    scene_prompt: 'SAMPLE: an army marching on a frozen winter road at night, campfires behind',
    narrative_text:
      "Enlistments were running out, and Washington's army faced Cornwallis across Assunpink Creek at Trenton. A spy's map of British positions showed another way. That night the Americans left their fires burning and slipped away on a back road toward Princeton. One sergeant, writing 55 years later, remembered a march marked with the blood of the soldiers' feet.",
    claims: claims('pr-1', [
      ['Enlistments were expiring as the army left Trenton.', 'D33'],
      ['Spy intelligence on British positions made the night march possible.', 'D30'],
      ['The army faced Cornwallis at Assunpink Creek before the march.', 'D03'],
    ]),
    choices: [
      { choice_id: 'pr-1-a', label: 'See it from the British column', perspective: 'british', choice_type: 'perspective_shift' },
      { choice_id: 'pr-1-b', label: 'What happened at sunrise', perspective: 'american', choice_type: 'what_next' },
    ],
  }),
  makeSegment({
    segment_id: 'pr-2',
    title: "Mawhood's column",
    perspective: 'british',
    mood: 'curious',
    date_label: '3 January 1777, morning',
    location: FIELD,
    connected_to: ['pr-1'],
    edge_type: 'same_event',
    scene_prompt: 'SAMPLE: a column of soldiers on a road by a stream bridge, winter fields',
    narrative_text:
      'On the morning of 3 January, Lieutenant Colonel Charles Mawhood led his regiments out of Princeton toward Trenton, riding with his spaniels. Near Stony Brook, his column sighted American troops crossing the fields. Mawhood turned back to meet them.',
    claims: claims('pr-2', [
      ['Mawhood rode out with his spaniels.', 'D05'],
      ["Mawhood's column turned back to meet the Americans.", 'D13'],
    ]),
    choices: [
      { choice_id: 'pr-2-a', label: "See it from Mercer's brigade", perspective: 'american', choice_type: 'perspective_shift' },
      { choice_id: 'pr-2-b', label: 'What the town saw', perspective: 'townspeople', choice_type: 'perspective_shift' },
    ],
  }),
  makeSegment({
    segment_id: 'pr-3',
    title: 'The orchard',
    perspective: 'american',
    mood: 'tense',
    date_label: '3 January 1777, sunrise',
    location: FIELD,
    connected_to: ['pr-1', 'pr-2'],
    edge_type: 'happened_next',
    scene_prompt: 'SAMPLE: an orchard on a frosty farm at sunrise, smoke in the trees',
    narrative_text:
      "General Hugh Mercer, a doctor who had survived Culloden, led his brigade into William Clarke's orchard calling 'Forward!'. The British charged with bayonets, and many of his riflemen had none. Mercer was knocked from his horse and left for dead. Captain William Leslie was killed on the British side.",
    claims: claims('pr-3', [
      ["Mercer led his brigade into the orchard calling 'Forward!'.", 'D06'],
      ['British bayonets met American rifles that had none.', 'D06'],
      ['Mercer was a doctor and a survivor of Culloden.', 'D08'],
    ]),
    choices: [
      { choice_id: 'pr-3-a', label: 'What happened as the line broke', perspective: 'american', choice_type: 'what_next' },
      { choice_id: 'pr-3-b', label: 'Where Mercer was carried', perspective: 'townspeople', choice_type: 'go_deeper' },
    ],
  }),
  makeSegment({
    segment_id: 'pr-4',
    title: 'Washington rides in',
    perspective: 'american',
    mood: 'triumphant',
    date_label: '3 January 1777, morning',
    location: FIELD,
    connected_to: ['pr-3'],
    edge_type: 'happened_next',
    scene_prompt: 'SAMPLE: a rider on a winter field between two lines of soldiers',
    narrative_text:
      "As Mercer's line broke, Washington rode onto the field and rallied it. The British, who for a moment believed they had killed him, were pushed back. Part of Mawhood's force fought its way out toward Trenton. Others fell back into the town. Afterwards, the two sides could not agree on what it had cost.",
    claims: claims('pr-4', [
      ["Washington rallied the army after Mercer's line broke.", 'D03'],
      ['The British believed for a time that they had killed Washington.', 'D05'],
    ]),
    contradiction: {
      contradiction_id: 'pr-4-x',
      claim: 'How many British soldiers were lost at Princeton.',
      side_a: { text: "Washington's report to Congress put the British loss near 500.", source_id: 'D01' },
      side_b: { text: "Howe's official report listed about 18 killed, 58 wounded and 200 missing, many of whom rejoined.", source_id: 'D10' },
      explanation: 'Each commander wrote for his own government, within days, without a full count. Later historians call the British figures unreliable and estimate a number in between.',
    },
    choices: [
      { choice_id: 'pr-4-a', label: 'Follow the fight into town', perspective: 'townspeople', choice_type: 'perspective_shift' },
      { choice_id: 'pr-4-b', label: 'Was Mercer dead?', perspective: 'townspeople', choice_type: 'go_deeper' },
    ],
  }),
  makeSegment({
    segment_id: 'pr-5',
    title: 'Nassau Hall',
    perspective: 'townspeople',
    mood: 'somber',
    date_label: '3 January 1777',
    location: TOWN,
    connected_to: ['pr-4'],
    edge_type: 'happened_next',
    scene_prompt: 'SAMPLE: a large stone college hall in a small town, winter, light at the windows',
    narrative_text:
      "For 26 days the town had been occupied. Robert Lawrence, an 84-year-old lawyer, kept a diary of it. Now British soldiers took shelter in Nassau Hall, the college building, and American guns fired on it until they surrendered. A cannonball is said to have struck the portrait of King George II inside. Who fired it is still argued.",
    claims: claims('pr-5', [
      ['A resident kept a diary through the 26-day occupation.', 'D14'],
      ['British soldiers in Nassau Hall surrendered after American guns fired on it.', 'D03'],
    ]),
    contradiction: {
      contradiction_id: 'pr-5-x',
      claim: "Alexander Hamilton's battery fired the ball that destroyed the portrait of George II.",
      side_a: { text: 'The University Archives find no contemporary account tying Hamilton to the cannonball. The earliest link appears in 1905.', source_id: 'D18' },
      side_b: { text: "The Princetoniana Museum states as fact that Hamilton's battery fired the ball.", source_id: 'D19' },
      explanation: 'That a cannonball hit the portrait is well supported. Naming Hamilton is a later addition, repeated until it sounded like a record.',
    },
    choices: [
      { choice_id: 'pr-5-a', label: 'Was Mercer dead?', perspective: 'townspeople', choice_type: 'go_deeper' },
      { choice_id: 'pr-5-b', label: 'What became of the field', perspective: 'historian', choice_type: 'what_next' },
    ],
  }),
  makeSegment({
    segment_id: 'pr-6',
    title: 'Dead or alive',
    perspective: 'townspeople',
    mood: 'somber',
    date_label: '3 to 12 January 1777',
    location: CLARKE_HOUSE,
    travel_from: FIELD,
    connected_to: ['pr-3'],
    edge_type: 'deeper_context',
    scene_prompt: 'SAMPLE: a Quaker farmhouse in winter used as a field hospital, candlelight inside',
    narrative_text:
      "Mercer was carried to Thomas Clarke's farmhouse, which became a hospital for both armies. Susannah, a woman enslaved by the Clarke family, cared for the wounded. Mercer lived for nine more days. Washington's first report to Congress called him dead. Two days later he wrote that the report had been premature. Mercer died on 12 January. The Clarkes freed Susannah in 1779.",
    claims: claims('pr-6', [
      ["The Clarke farmhouse was a hospital for both armies.", 'D09'],
      ['Susannah cared for the wounded and was freed in 1779.', 'D27'],
      ['Mercer died on 12 January 1777.', 'D08'],
    ]),
    contradiction: {
      contradiction_id: 'pr-6-x',
      claim: 'General Mercer was killed at Princeton.',
      side_a: { text: "Washington's report of 5 January, and Howe's official report, both list Mercer among the dead.", source_id: 'D01' },
      side_b: { text: "On 7 January Washington wrote that the report of Mercer's death was premature.", source_id: 'D02' },
      explanation: 'Reports were written within days, from the field. Mercer was mortally wounded but alive, and the record caught up with him only after he died.',
    },
    choices: [
      { choice_id: 'pr-6-a', label: 'See it from the British column', perspective: 'british', choice_type: 'perspective_shift' },
      { choice_id: 'pr-6-b', label: 'What became of the field', perspective: 'historian', choice_type: 'what_next' },
    ],
  }),
  makeSegment({
    segment_id: 'pr-7',
    title: 'The second battle of Princeton',
    perspective: 'historian',
    mood: 'hopeful',
    date_label: 'Today',
    location: { lat: 40.3318, lng: -74.6726, label: "Maxwell's Field" },
    connected_to: ['pr-5', 'pr-6'],
    edge_type: 'happened_next',
    scene_prompt: 'SAMPLE: an open winter field at the edge of woods, a few modern houses beyond',
    narrative_text:
      "The ground where Washington charged did not stay untouched. In recent years, plans for faculty housing ran into a campaign to preserve the battlefield. A compromise saved the part of the field known as Washington's Charge. The argument over what happened here has always been, in part, an argument over what to keep.",
    claims: claims('pr-7', [['A compromise preserved the area of the field known as Washington\'s Charge.', 'D32']]),
    is_final: true,
  }),
]

export const princeton = finalizeBundle({
  topic,
  sources,
  segments,
  start_segment_id: 'pr-1',
  routes: {
    'pr-1-a': 'pr-2', 'pr-1-b': 'pr-3',
    'pr-2-a': 'pr-3', 'pr-2-b': 'pr-5',
    'pr-3-a': 'pr-4', 'pr-3-b': 'pr-6',
    'pr-4-a': 'pr-5', 'pr-4-b': 'pr-6',
    'pr-5-a': 'pr-6', 'pr-5-b': 'pr-7',
    'pr-6-a': 'pr-2', 'pr-6-b': 'pr-7',
  },
})
