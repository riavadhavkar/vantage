// OWNER: Person B
// Mock story bundle for frontend development and the cached demo fallback.
// Narration sticks to widely documented facts. Source excerpts are SAMPLE
// paraphrases, not quotations: Person C replaces them with verbatim text.
import { makeSegment, claims, finalizeBundle } from './makeSegment.js'

const WRECK = { lat: 41.7325, lng: -49.9469, label: 'North Atlantic, where Titanic sank' }

const topic = {
  topic_id: 'titanic',
  title: 'The sinking of the Titanic',
  one_line: 'A liner on its first voyage meets ice in the North Atlantic, April 1912.',
  aliases: ['Titanic', 'RMS Titanic', 'Titanic sinking'],
  perspectives: [
    {
      perspective_id: 'crew',
      label: 'The bridge and crew',
      color: '#6F9BC4',
      voice_id: 'SAMPLE-voice-crew',
      description: 'SAMPLE: Officers, lookouts and wireless operators, as told in their testimony.',
    },
    {
      perspective_id: 'passengers',
      label: 'The passengers',
      color: '#C49A6C',
      voice_id: 'SAMPLE-voice-passengers',
      description: 'SAMPLE: Survivors from every class, in memoirs and later interviews.',
    },
    {
      perspective_id: 'inquiry',
      label: 'The inquiries',
      color: '#AEB4B1',
      voice_id: 'SAMPLE-voice-inquiry',
      description: 'SAMPLE: The American and British investigations that followed.',
    },
  ],
}

const P = (text) => `SAMPLE: Paraphrase, not a quotation. ${text}`

const sources = [
  {
    source_id: 'ti-us-inquiry',
    title: 'United States Senate inquiry into the loss of the Titanic (1912)',
    source_type: 'primary',
    perspective: 'inquiry',
    url: null,
    excerpt: P('Witnesses described ice warnings arriving by wireless through the day, the lookout\'s bell, and the first lifeboats leaving partly filled.'),
    license: 'SAMPLE: Public domain (US government work), to confirm',
    attribution: 'SAMPLE: US Senate Committee on Commerce hearings, 1912',
  },
  {
    source_id: 'ti-uk-inquiry',
    title: 'British Wreck Commissioner\'s inquiry report (1912)',
    source_type: 'primary',
    perspective: 'inquiry',
    url: null,
    excerpt: P('The report sets out the lifeboat capacity against the number aboard, the calm and clear conditions, and its finding about the Californian.'),
    license: 'SAMPLE: Crown copyright expired, to confirm',
    attribution: 'SAMPLE: Wreck Commissioner\'s Court, London, 1912',
  },
  {
    source_id: 'ti-beesley',
    title: 'Lawrence Beesley, The Loss of the S.S. Titanic (1912)',
    source_type: 'primary',
    perspective: 'passengers',
    url: null,
    excerpt: P('A second-class passenger recalls feeling only a slight change in the engines, and the calm on deck in the first hour.'),
    license: 'SAMPLE: Public domain, to confirm',
    attribution: 'SAMPLE: Survivor memoir, first published 1912',
  },
  {
    source_id: 'ti-gracie',
    title: 'Archibald Gracie, The Truth about the Titanic (1913)',
    source_type: 'primary',
    perspective: 'passengers',
    url: null,
    excerpt: P('A first-class passenger describes loading the boats and how the order to save women and children was carried out on each side.'),
    license: 'SAMPLE: Public domain, to confirm',
    attribution: 'SAMPLE: Survivor memoir, published 1913',
  },
  {
    source_id: 'ti-oral',
    title: 'Survivor interviews recorded later in life',
    source_type: 'oral_history',
    perspective: 'passengers',
    url: null,
    excerpt: P('Survivors interviewed decades later describe what they saw from the boats as the stern rose.'),
    license: 'SAMPLE: Rights to confirm with the archive',
    attribution: 'SAMPLE: Oral history collection',
  },
  {
    source_id: 'ti-wreck',
    title: 'Reports on the discovery of the wreck (1985)',
    source_type: 'secondary',
    perspective: 'inquiry',
    url: null,
    excerpt: P('The wreck was found on the sea floor in two main sections, with a debris field between them.'),
    license: 'SAMPLE: Rights to confirm',
    attribution: 'SAMPLE: Expedition reports and later surveys',
  },
  {
    source_id: 'ti-ency',
    title: 'Encyclopedia entry on the Titanic disaster',
    source_type: 'encyclopedia',
    perspective: 'inquiry',
    url: null,
    excerpt: P('The disaster led to the first International Convention for the Safety of Life at Sea, which required enough lifeboats for all and a constant radio watch.'),
    license: 'SAMPLE: License to confirm',
    attribution: 'SAMPLE: General reference work',
  },
]

const segments = [
  makeSegment({
    segment_id: 'ti-1',
    title: 'Warnings on the wire',
    perspective: 'crew',
    mood: 'tense',
    date_label: '14 April 1912',
    location: WRECK,
    scene_prompt: 'SAMPLE: wireless room on a liner at night, sea and ice beyond',
    narrative_text:
      'On Sunday, 14 April 1912, Titanic\'s wireless operators took messages from several ships reporting ice ahead. The operators worked for the Marconi company, and much of their evening went to passengers\' private telegrams. Not every warning reached the officers on the bridge. The ship held its speed through a clear, calm, moonless night.',
    claims: claims('ti-1', [
      ['Several ships sent ice warnings to Titanic on 14 April 1912.', 'ti-us-inquiry'],
      ['Not every warning reached the officers on the bridge.', 'ti-uk-inquiry'],
      ['The night was clear, calm and moonless.', 'ti-uk-inquiry'],
    ]),
    choices: [
      { choice_id: 'ti-1-a', label: 'Hear it from the passengers', perspective: 'passengers', choice_type: 'perspective_shift' },
      { choice_id: 'ti-1-b', label: 'What happened at 11:40 pm', perspective: 'crew', choice_type: 'what_next' },
      { choice_id: 'ti-1-c', label: 'Read what the inquiries found', perspective: 'inquiry', choice_type: 'primary_source' },
    ],
  }),
  makeSegment({
    segment_id: 'ti-2',
    title: 'A slight jolt',
    perspective: 'passengers',
    mood: 'curious',
    date_label: '14 April 1912, 11:40 pm',
    location: WRECK,
    connected_to: 'ti-1',
    edge_type: 'same_event',
    scene_prompt: 'SAMPLE: passengers on a liner deck at night, ice on the planks',
    narrative_text:
      'Below decks, many passengers felt the collision as a faint shudder, or did not feel it at all. Some went out on deck and found ice scattered across the forward well deck. With the engines stopped and no general alarm, many went back to bed. For the first hour, few believed the ship was in danger.',
    claims: claims('ti-2', [
      ['Many passengers felt only a faint shudder.', 'ti-beesley'],
      ['Ice fell onto the forward well deck.', 'ti-us-inquiry'],
      ['No general alarm was sounded.', 'ti-uk-inquiry'],
    ]),
    choices: [
      { choice_id: 'ti-2-a', label: 'See it from the bridge', perspective: 'crew', choice_type: 'perspective_shift' },
      { choice_id: 'ti-2-b', label: 'Why the lifeboats left half empty', perspective: 'passengers', choice_type: 'go_deeper' },
    ],
  }),
  makeSegment({
    segment_id: 'ti-3',
    title: 'Iceberg right ahead',
    perspective: 'crew',
    mood: 'tense',
    date_label: '14 April 1912, 11:40 pm',
    location: WRECK,
    connected_to: 'ti-1',
    edge_type: 'happened_next',
    scene_prompt: 'SAMPLE: lookout in a crow\'s nest, dark sea, a shape of ice ahead',
    narrative_text:
      'Lookout Frederick Fleet rang the warning bell and telephoned the bridge. First Officer William Murdoch ordered the helm hard over and signalled the engine room. The ship turned, but not far enough. The iceberg scraped along the starboard bow and opened the forward compartments to the sea. Within the hour, the ship\'s designer, Thomas Andrews, had told Captain Edward Smith that she would sink.',
    claims: claims('ti-3', [
      ['The lookout rang the bell and telephoned the bridge.', 'ti-us-inquiry'],
      ['The iceberg opened the forward compartments along the starboard side.', 'ti-uk-inquiry'],
      ['Thomas Andrews judged that the ship would sink.', 'ti-uk-inquiry'],
    ]),
    choices: [
      { choice_id: 'ti-3-a', label: 'Hear it from the passengers in the boats', perspective: 'passengers', choice_type: 'perspective_shift' },
      { choice_id: 'ti-3-b', label: 'Read what the inquiries found', perspective: 'inquiry', choice_type: 'primary_source' },
    ],
  }),
  makeSegment({
    segment_id: 'ti-4',
    title: 'Room for half',
    perspective: 'passengers',
    mood: 'somber',
    date_label: '15 April 1912, 12:45 am',
    location: WRECK,
    connected_to: 'ti-3',
    edge_type: 'happened_next',
    scene_prompt: 'SAMPLE: a lifeboat being lowered down the side of a liner at night',
    narrative_text:
      'The first lifeboat went down the side at about 12:45 am, far from full. Titanic carried 20 boats with room for about 1,178 people, and more than 2,200 were aboard. Officers loaded women and children first, and the rule was applied differently on each side of the ship. Survival rates differed sharply by class.',
    claims: claims('ti-4', [
      ['The first lifeboat left at about 12:45 am, partly filled.', 'ti-us-inquiry'],
      ['Twenty boats had room for about 1,178 people; more than 2,200 were aboard.', 'ti-uk-inquiry'],
      ['The order was carried out differently on each side of the ship.', 'ti-gracie'],
    ]),
    choices: [
      { choice_id: 'ti-4-a', label: 'Did she break in two?', perspective: 'passengers', choice_type: 'what_next' },
      { choice_id: 'ti-4-b', label: 'Ask why no ship came sooner', perspective: 'inquiry', choice_type: 'perspective_shift' },
    ],
  }),
  makeSegment({
    segment_id: 'ti-5',
    title: 'Did she break in two?',
    perspective: 'passengers',
    mood: 'somber',
    date_label: '15 April 1912, 2:20 am',
    location: WRECK,
    connected_to: 'ti-4',
    edge_type: 'happened_next',
    scene_prompt: 'SAMPLE: stern of a liner rising against stars, seen from a small boat',
    narrative_text:
      'Titanic sank at 2:20 am. Survivors in the boats did not agree on how. Some described the hull breaking apart as the stern rose. Others, including the most senior officer to survive, said she went down whole. The British inquiry accepted the second account. The wreck, found in 1985, lies in two main pieces.',
    claims: claims('ti-5', [
      ['Titanic sank at about 2:20 am.', 'ti-uk-inquiry'],
      ['Some survivors described the hull breaking apart.', 'ti-oral'],
      ['The wreck lies in two main sections.', 'ti-wreck'],
    ]),
    contradiction: {
      contradiction_id: 'ti-5-x',
      claim: 'Titanic broke in two before it sank.',
      side_a: {
        text: 'Several survivors in the boats described the hull breaking apart between the funnels as the stern rose.',
        source_id: 'ti-oral',
      },
      side_b: {
        text: 'Second Officer Charles Lightoller testified that the ship went down intact.',
        source_id: 'ti-uk-inquiry',
      },
      explanation:
        'Witnesses watched from different boats, in darkness, at different distances. The inquiries leaned on the officers\' testimony. The discovery of the wreck in two sections in 1985 settled the physical question.',
    },
    choices: [
      { choice_id: 'ti-5-a', label: 'Ask why no ship came sooner', perspective: 'inquiry', choice_type: 'perspective_shift' },
      { choice_id: 'ti-5-b', label: 'What happened at dawn', perspective: 'passengers', choice_type: 'what_next' },
    ],
  }),
  makeSegment({
    segment_id: 'ti-6',
    title: 'Rockets in the night',
    perspective: 'inquiry',
    mood: 'tense',
    date_label: 'May 1912',
    connected_to: 'ti-4',
    edge_type: 'opposing_view',
    scene_prompt: 'SAMPLE: a hearing room with long tables and tall windows',
    narrative_text:
      'Both inquiries asked why the steamer Californian, stopped in the ice within sight of Titanic\'s rockets, did not come. Her wireless operator had turned in before the first distress call. Officers on her bridge saw rockets and reported them to Captain Stanley Lord, who did not wake the operator. Both inquiries criticised him. Lord maintained until his death that his ship was too far away.',
    claims: claims('ti-6', [
      ['Californian\'s wireless operator was off duty when the distress calls went out.', 'ti-us-inquiry'],
      ['Officers on Californian saw rockets and reported them to the captain.', 'ti-uk-inquiry'],
      ['Both inquiries criticised Captain Lord.', 'ti-uk-inquiry'],
    ]),
    choices: [
      { choice_id: 'ti-6-a', label: 'Go back to the bridge', perspective: 'crew', choice_type: 'perspective_shift' },
      { choice_id: 'ti-6-b', label: 'What happened at dawn', perspective: 'passengers', choice_type: 'what_next' },
    ],
  }),
  makeSegment({
    segment_id: 'ti-7',
    title: 'Carpathia at dawn',
    perspective: 'passengers',
    mood: 'hopeful',
    date_label: '15 April 1912, about 4:00 am',
    location: WRECK,
    travel_from: { lat: 41.17, lng: -49.22, label: 'Carpathia when the call came' },
    connected_to: 'ti-5',
    edge_type: 'happened_next',
    scene_prompt: 'SAMPLE: small boats on a flat sea at dawn, a steamer approaching through ice',
    narrative_text:
      'The Cunard liner Carpathia heard the distress call and steamed north through the ice. She reached the boats around 4 am and took aboard about 705 survivors. More than 1,500 people died. The inquiries that followed led to new rules: lifeboat space for everyone aboard, and a wireless watch kept day and night.',
    claims: claims('ti-7', [
      ['Carpathia reached the lifeboats around 4 am.', 'ti-us-inquiry'],
      ['About 705 people survived and more than 1,500 died.', 'ti-uk-inquiry'],
      ['New rules required lifeboat space for all and a constant wireless watch.', 'ti-ency'],
    ]),
    is_final: true,
  }),
]

export const titanic = finalizeBundle({
  topic,
  sources,
  segments,
  start_segment_id: 'ti-1',
  routes: {
    'ti-1-a': 'ti-2',
    'ti-1-b': 'ti-3',
    'ti-1-c': 'ti-6',
    'ti-2-a': 'ti-3',
    'ti-2-b': 'ti-4',
    'ti-3-a': 'ti-4',
    'ti-3-b': 'ti-6',
    'ti-4-a': 'ti-5',
    'ti-4-b': 'ti-6',
    'ti-5-a': 'ti-6',
    'ti-5-b': 'ti-7',
    'ti-6-a': 'ti-3',
    'ti-6-b': 'ti-7',
  },
})
