// OWNER: Person B
// Backup mock story bundle. Narration sticks to widely documented facts.
// Source excerpts are SAMPLE paraphrases, not quotations: Person C replaces them.
import { makeSegment, claims, finalizeBundle } from './makeSegment.js'

const FIELD = { lat: 40.3299, lng: -74.6754, label: 'Clarke farm, south of Princeton' }
const TOWN = { lat: 40.3487, lng: -74.6593, label: 'Nassau Hall, Princeton' }
const TRENTON = { lat: 40.2171, lng: -74.7429, label: 'Assunpink Creek, Trenton' }

const topic = {
  topic_id: 'battle-of-princeton',
  title: 'The Battle of Princeton',
  one_line: 'A winter night march and a morning battle in a New Jersey college town, January 1777.',
  aliases: ['Battle of Princeton', 'Princeton 1777', 'Princeton'],
  perspectives: [
    {
      perspective_id: 'continental',
      label: 'The Continental Army',
      color: '#7D9FC4',
      voice_id: 'SAMPLE-voice-continental',
      description: 'SAMPLE: Washington\'s army, from his letters and soldiers\' later testimony.',
    },
    {
      perspective_id: 'british',
      label: 'The British regulars',
      color: '#C8A15A',
      voice_id: 'SAMPLE-voice-british',
      description: 'SAMPLE: Mawhood\'s column, from British reports and returns.',
    },
    {
      perspective_id: 'town',
      label: 'The people of Princeton',
      color: '#9DB29A',
      voice_id: 'SAMPLE-voice-town',
      description: 'SAMPLE: Residents and the college, caught between two armies.',
    },
  ],
}

const P = (text) => `SAMPLE: Paraphrase, not a quotation. ${text}`

const sources = [
  {
    source_id: 'pr-washington',
    title: 'George Washington, letter to John Hancock, 5 January 1777',
    source_type: 'primary',
    perspective: 'continental',
    url: null,
    excerpt: P('Washington reports the night march from Trenton, the fighting near Princeton, the loss of General Mercer, and the prisoners taken.'),
    license: 'SAMPLE: Public domain, to confirm',
    attribution: 'SAMPLE: Papers of George Washington',
  },
  {
    source_id: 'pr-british',
    title: 'British army returns and officers\' accounts of the action at Princeton',
    source_type: 'primary',
    perspective: 'british',
    url: null,
    excerpt: P('British reports describe Mawhood\'s march toward Trenton, the turn to meet the Americans, and list killed, wounded and missing.'),
    license: 'SAMPLE: Public domain, to confirm',
    attribution: 'SAMPLE: British military records',
  },
  {
    source_id: 'pr-resident',
    title: 'A resident\'s journal of the occupation of Princeton, 1776 to 1777',
    source_type: 'primary',
    perspective: 'town',
    url: null,
    excerpt: P('A resident records the occupation of the town, families leaving, and the college building used by soldiers.'),
    license: 'SAMPLE: Public domain, to confirm',
    attribution: 'SAMPLE: Anonymous journal, later published',
  },
  {
    source_id: 'pr-pension',
    title: 'Veterans\' pension testimony',
    source_type: 'oral_history',
    perspective: 'continental',
    url: null,
    excerpt: P('Veterans recalling the battle decades later describe the frozen road, the orchard fight, and Washington riding forward.'),
    license: 'SAMPLE: Public domain (US government records), to confirm',
    attribution: 'SAMPLE: Revolutionary War pension applications',
  },
  {
    source_id: 'pr-park',
    title: 'Battlefield park interpretive history',
    source_type: 'secondary',
    perspective: 'town',
    url: null,
    excerpt: P('The park history traces the fighting across the Clarke farm and the American move north after the battle.'),
    license: 'SAMPLE: License to confirm',
    attribution: 'SAMPLE: State park materials',
  },
  {
    source_id: 'pr-ency',
    title: 'Encyclopedia entry on the Battle of Princeton',
    source_type: 'encyclopedia',
    perspective: 'continental',
    url: null,
    excerpt: P('The entry summarises the campaign from Trenton to Princeton and its effect on morale.'),
    license: 'SAMPLE: License to confirm',
    attribution: 'SAMPLE: General reference work',
  },
]

const segments = [
  makeSegment({
    segment_id: 'pr-1',
    title: 'The night march',
    perspective: 'continental',
    mood: 'tense',
    date_label: '2 to 3 January 1777',
    location: TRENTON,
    scene_prompt: 'SAMPLE: an army marching on a frozen winter road at night, campfires behind',
    narrative_text:
      'After the fighting at Assunpink Creek on 2 January, Washington\'s army faced General Cornwallis across the creek at Trenton. That night the Americans left their campfires burning, with a small party to tend them, and marched the army away by a back road toward Princeton. The ground had frozen hard enough to carry the guns.',
    claims: claims('pr-1', [
      ['The armies faced each other across Assunpink Creek on 2 January.', 'pr-ency'],
      ['A small party kept the campfires burning while the army left.', 'pr-washington'],
      ['The frozen ground let the army move its guns.', 'pr-pension'],
    ]),
    choices: [
      { choice_id: 'pr-1-a', label: 'See it from the British column', perspective: 'british', choice_type: 'perspective_shift' },
      { choice_id: 'pr-1-b', label: 'What happened at sunrise', perspective: 'continental', choice_type: 'what_next' },
    ],
  }),
  makeSegment({
    segment_id: 'pr-2',
    title: 'Mawhood\'s column',
    perspective: 'british',
    mood: 'curious',
    date_label: '3 January 1777, morning',
    location: FIELD,
    connected_to: 'pr-1',
    edge_type: 'same_event',
    scene_prompt: 'SAMPLE: a column of soldiers on a road by a stream bridge, winter fields',
    narrative_text:
      'On the morning of 3 January, Lieutenant Colonel Charles Mawhood marched two regiments out of Princeton to join Cornwallis at Trenton. Near the bridge over Stony Brook, his column sighted American troops crossing the fields to the south. Mawhood turned back to meet them.',
    claims: claims('pr-2', [
      ['Mawhood led two regiments out of Princeton toward Trenton.', 'pr-british'],
      ['His column sighted Americans near Stony Brook and turned back.', 'pr-british'],
    ]),
    choices: [
      { choice_id: 'pr-2-a', label: 'See it from Mercer\'s brigade', perspective: 'continental', choice_type: 'perspective_shift' },
      { choice_id: 'pr-2-b', label: 'What the town saw', perspective: 'town', choice_type: 'go_deeper' },
    ],
  }),
  makeSegment({
    segment_id: 'pr-3',
    title: 'The orchard',
    perspective: 'continental',
    mood: 'tense',
    date_label: '3 January 1777, sunrise',
    location: FIELD,
    connected_to: 'pr-1',
    edge_type: 'happened_next',
    scene_prompt: 'SAMPLE: an orchard on a frosty farm at sunrise, smoke in the trees',
    narrative_text:
      'Brigadier General Hugh Mercer\'s brigade met the British in an orchard on William Clarke\'s farm. The British charged with bayonets, and many of Mercer\'s riflemen had none of their own. Mercer was knocked from his horse and bayoneted several times. He died of his wounds nine days later.',
    claims: claims('pr-3', [
      ['Mercer\'s brigade met the British in an orchard on the Clarke farm.', 'pr-park'],
      ['Many riflemen had no bayonets.', 'pr-pension'],
      ['Mercer was mortally wounded and died nine days later.', 'pr-washington'],
    ]),
    choices: [
      { choice_id: 'pr-3-a', label: 'What happened as the line broke', perspective: 'continental', choice_type: 'what_next' },
      { choice_id: 'pr-3-b', label: 'Hear it from the town', perspective: 'town', choice_type: 'perspective_shift' },
    ],
  }),
  makeSegment({
    segment_id: 'pr-4',
    title: 'Washington rides in',
    perspective: 'continental',
    mood: 'triumphant',
    date_label: '3 January 1777, morning',
    location: FIELD,
    connected_to: 'pr-3',
    edge_type: 'happened_next',
    scene_prompt: 'SAMPLE: a rider on a winter field between two lines of soldiers',
    narrative_text:
      'As Mercer\'s men fell back, Washington rode onto the field and rallied them, along with arriving Pennsylvania militia. The American line steadied and pushed forward, and the British line broke. Part of Mawhood\'s force fought its way toward Trenton. Others fell back into the town.',
    claims: claims('pr-4', [
      ['Washington rallied the retreating troops and arriving militia.', 'pr-pension'],
      ['The British line broke and split.', 'pr-british'],
    ]),
    contradiction: {
      contradiction_id: 'pr-4-x',
      claim: 'How many British soldiers were lost at Princeton.',
      side_a: {
        text: 'Washington\'s report to Congress put British losses far higher, with many killed and a large number taken prisoner.',
        source_id: 'pr-washington',
      },
      side_b: {
        text: 'British returns listed far fewer killed and wounded than the American report.',
        source_id: 'pr-british',
      },
      explanation:
        'Each side counted at a different moment and had reasons to shade the numbers. Historians still give a range rather than one figure.',
    },
    choices: [
      { choice_id: 'pr-4-a', label: 'Follow the British into town', perspective: 'town', choice_type: 'perspective_shift' },
      { choice_id: 'pr-4-b', label: 'What happened next', perspective: 'continental', choice_type: 'what_next' },
    ],
  }),
  makeSegment({
    segment_id: 'pr-5',
    title: 'Nassau Hall',
    perspective: 'town',
    mood: 'somber',
    date_label: '3 January 1777',
    location: TOWN,
    connected_to: 'pr-4',
    edge_type: 'deeper_context',
    scene_prompt: 'SAMPLE: a large stone college hall in a small town, winter, inside light at the windows',
    narrative_text:
      'British soldiers who fell back into Princeton took shelter in Nassau Hall, the college\'s main building. American artillery fired on it, and the soldiers inside soon surrendered. Many residents had already left. The college had stopped teaching, and both armies had used the building as barracks.',
    claims: claims('pr-5', [
      ['British soldiers sheltered in Nassau Hall and surrendered.', 'pr-washington'],
      ['Many residents had left town during the occupation.', 'pr-resident'],
      ['Both armies used the college building as barracks.', 'pr-resident'],
    ]),
    choices: [
      { choice_id: 'pr-5-a', label: 'See it from the British column', perspective: 'british', choice_type: 'perspective_shift' },
      { choice_id: 'pr-5-b', label: 'Where the army went next', perspective: 'continental', choice_type: 'what_next' },
    ],
  }),
  makeSegment({
    segment_id: 'pr-6',
    title: 'North to Morristown',
    perspective: 'continental',
    mood: 'hopeful',
    date_label: 'January 1777',
    location: { lat: 40.7968, lng: -74.4815, label: 'Morristown, New Jersey' },
    travel_from: TOWN,
    connected_to: 'pr-4',
    edge_type: 'happened_next',
    scene_prompt: 'SAMPLE: a winter camp of log huts on wooded hills',
    narrative_text:
      'Washington did not stay to hold Princeton. With Cornwallis marching back from Trenton, the tired army moved north and went into winter quarters at Morristown. Coming days after the victory at Trenton, the battle lifted American morale and pushed the British back from much of New Jersey.',
    claims: claims('pr-6', [
      ['The army went into winter quarters at Morristown.', 'pr-park'],
      ['The campaign lifted American morale.', 'pr-ency'],
    ]),
    is_final: true,
  }),
]

export const princeton = finalizeBundle({
  topic,
  sources,
  segments,
  start_segment_id: 'pr-1',
  routes: {
    'pr-1-a': 'pr-2',
    'pr-1-b': 'pr-3',
    'pr-2-a': 'pr-3',
    'pr-2-b': 'pr-5',
    'pr-3-a': 'pr-4',
    'pr-3-b': 'pr-5',
    'pr-4-a': 'pr-5',
    'pr-4-b': 'pr-6',
    'pr-5-a': 'pr-2',
    'pr-5-b': 'pr-6',
  },
})
