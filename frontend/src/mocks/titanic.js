// OWNER: Person B
// Primary mock topic. Sources and perspectives follow the team's data/documents.csv
// and edges.csv. Narration is a SAMPLE built from those notes; the real narration
// comes from the Narrator agent, grounded in retrieved chunks.
import { makeSegment, claims, sourceFromRow, finalizeBundle } from './makeSegment.js'

const WRECK = { lat: 41.7317, lng: -49.9467, label: 'Wreck site, North Atlantic' }
const CQD = { lat: 41.7667, lng: -50.2333, label: 'Radioed distress position' }
const CALIFORNIAN = { lat: 42.0833, lng: -50.1167, label: 'Californian, stopped in the ice (approx.)' }

const topic = {
  topic_id: 'titanic',
  title: 'The sinking of the Titanic',
  one_line: 'A liner on its first voyage meets ice in the North Atlantic, April 1912.',
  aliases: ['Titanic', 'RMS Titanic', 'Titanic sinking'],
  perspectives: [
    { perspective_id: 'crew', label: 'Officers and crew', color: '#6F9BC4', voice_id: 'SAMPLE-voice-crew', description: 'SAMPLE: Lightoller, Bride and Lord, in their own testimony.' },
    { perspective_id: 'first_class', label: 'Cabin passengers', color: '#B49AAE', voice_id: 'SAMPLE-voice-first-class', description: 'SAMPLE: Memoirs by Beesley and Gracie, written within a year.' },
    { perspective_id: 'steerage', label: 'Third class', color: '#C49A6C', voice_id: 'SAMPLE-voice-steerage', description: 'SAMPLE: Emigrants in steerage, and the numbers behind who survived.' },
    { perspective_id: 'historian', label: 'Inquiries and historians', color: '#AEB4B1', voice_id: 'SAMPLE-voice-historian', description: 'SAMPLE: The 1912 inquiries and what the wreck showed later.' },
  ],
}

const sources = [
  ['T01', 'Sinking of the Titanic', 'Wikipedia', 'https://en.wikipedia.org/wiki/Sinking_of_the_Titanic', 'encyclopedia', 'historian', 'Backbone overview of the night.'],
  ['T02', 'US Senate Inquiry, Day 1: Testimony of Charles Lightoller (part 1)', 'Titanic Inquiry Project', 'https://www.titanicinquiry.org/USInq/AmInq01Lightoller01.php', 'primary', 'crew', "Senior surviving officer. He told the Senate the ship went down 'absolutely intact'."],
  ['T04', "British Wreck Commissioner's Report: Circumstances in Connection with the SS Californian", 'Titanic Inquiry Project', 'https://www.titanicinquiry.org/BOTInq/BOTReport/botRepCalifornian.php', 'primary', 'historian', 'Official British finding against the Californian.'],
  ['T05', 'British Inquiry, Day 7: Testimony of Captain Stanley Lord', 'Titanic Inquiry Project', 'https://www.titanicinquiry.org/BOTInq/BOTInq07Lord03.php', 'primary', 'crew', "Lord's own account. He had gone below after a 17-hour day and took the rockets for company signals."],
  ['T06', 'Reappraisal of Evidence: SS Californian and Titanic (1992)', 'UK Marine Accident Investigation Branch', 'https://assets.publishing.service.gov.uk/media/54c15bf240f0b6158d000027/MAIBReport_ReappraisalOfEvidence-SSCalifornian-Titanic-1992.pdf', 'official_modern', 'historian', 'Government re-examination of the 1912 Californian finding, done after the wreck was found.'],
  ['T08', 'The Loss of the S.S. Titanic (Lawrence Beesley, 1912)', 'Project Gutenberg', 'https://www.gutenberg.org/ebooks/6675.txt.utf-8', 'primary', 'first_class', 'Second-class passenger and science teacher. Calm, observant, written within weeks.'],
  ['T09', 'The Truth about the Titanic (Archibald Gracie, 1913)', 'Project Gutenberg', 'https://www.gutenberg.org/cache/epub/67584/pg67584.txt', 'primary', 'first_class', 'First-class survivor who went down with the ship and reached Collapsible B. Records that Jack Thayer insisted the ship split, while Gracie and the officers disagreed.'],
  ['T10', "Sinking of the Titanic and Great Sea Disasters (1912 compilation, incl. Harold Bride's story)", 'Project Gutenberg', 'https://www.gutenberg.org/files/781/781.txt', 'press_1912', 'crew', "Wireless operator Harold Bride: the band played ragtime and 'Autumn'. Sensational in places."],
  ['T12', "The last song played by the Titanic's musicians", 'Snopes', 'https://www.snopes.com/history/titanic/lastsong.asp', 'secondary', 'historian', "Rates 'Nearer, My God, to Thee' as undetermined: some survivors heard it, some who stayed to the end did not."],
  ['T13', 'Titanic survivors said the ship split in half. For 73 years, no one believed them', 'Biography.com', 'https://www.biography.com/history-culture/a44289145/titanic-survivors-ship-split-in-half', 'secondary', 'historian', "Lightoller at the British inquiry called it 'utterly untrue'; survivors like Frank Osman and Eva Hart said it broke. The 1985 discovery proved them right."],
  ['T16', "Titanic's distress position vs. wreck position", 'US Coast Guard Navigation Center', 'https://www.navcen.uscg.gov/node/401', 'official_modern', 'historian', 'The wreck lies about 13 nautical miles from the radioed distress position.'],
  ['T17', 'Would you have survived the Titanic?', 'New Zealand Herald', 'https://www.nzherald.co.nz/indepth/news/would-you-have-survived-the-titanic/', 'secondary', 'steerage', 'Survival by class and sex: about 62% of first-class vs about 25% of third-class ticket holders.'],
  ['T18', 'Passengers of the Titanic', 'Wikipedia', 'https://en.wikipedia.org/wiki/Passengers_of_the_Titanic', 'encyclopedia', 'steerage', 'Emigrants in third class from dozens of countries, boarding at Southampton, Cherbourg and Queenstown.'],
  ['T19', 'Wreck of the Titanic', 'Wikipedia', 'https://en.wikipedia.org/wiki/Wreck_of_the_Titanic', 'encyclopedia', 'historian', 'Found in 1985, in two halves on the seabed, about 13 miles from the radioed position.'],
  ['T21', "'Water crept into steerage': Carl Olaf Jansson's account (New York Times, 19 Apr 1912)", 'Bill Wormstedt (transcription)', 'https://wormstedt.com/Titanic/shots/janssonnyt.htm', 'press_1912', 'steerage', "A third-class passenger's own account. The paper misspelled his name as Johnson."],
].map(sourceFromRow)

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
      "On Sunday, 14 April 1912, Titanic's wireless operators took messages from several ships reporting ice ahead. Much of their evening went to passengers' private telegrams, and not every warning reached the officers on the bridge. The ship held its speed through a clear, calm, moonless night.",
    claims: claims('ti-1', [
      ['Several ships sent ice warnings on 14 April.', 'T01'],
      ['Not every warning reached the bridge.', 'T01'],
      ['The night was clear, calm and moonless.', 'T08'],
    ]),
    choices: [
      { choice_id: 'ti-1-a', label: 'Hear it from the cabin passengers', perspective: 'first_class', choice_type: 'perspective_shift' },
      { choice_id: 'ti-1-b', label: 'What happened at 11:40 pm', perspective: 'crew', choice_type: 'what_next' },
      { choice_id: 'ti-1-c', label: 'Read what the inquiries found', perspective: 'historian', choice_type: 'primary_source' },
    ],
  }),
  makeSegment({
    segment_id: 'ti-2',
    title: 'A slight jolt',
    perspective: 'first_class',
    mood: 'curious',
    date_label: '14 April 1912, 11:40 pm',
    location: WRECK,
    connected_to: ['ti-1'],
    edge_type: 'same_event',
    scene_prompt: 'SAMPLE: passengers on a liner deck at night, ice on the planks',
    narrative_text:
      'Lawrence Beesley, a science teacher travelling second class, felt the collision as little more than a change in the engines. Some passengers went out on deck and found ice scattered across the forward well deck. With no general alarm, many went back to their cabins. For the first hour, few believed the ship was in danger.',
    claims: claims('ti-2', [
      ['Beesley felt only a slight change in the engines.', 'T08'],
      ['Ice fell onto the forward well deck.', 'T01'],
      ['For the first hour, few passengers believed the ship was in danger.', 'T08'],
    ]),
    choices: [
      { choice_id: 'ti-2-a', label: 'See it from the bridge', perspective: 'crew', choice_type: 'perspective_shift' },
      { choice_id: 'ti-2-b', label: 'Hear it from third class', perspective: 'steerage', choice_type: 'perspective_shift' },
    ],
  }),
  makeSegment({
    segment_id: 'ti-3',
    title: 'Iceberg right ahead',
    perspective: 'crew',
    mood: 'tense',
    date_label: '14 April 1912, 11:40 pm',
    location: WRECK,
    connected_to: ['ti-1'],
    edge_type: 'happened_next',
    scene_prompt: "SAMPLE: lookout in a crow's nest, dark sea, a shape of ice ahead",
    narrative_text:
      'The lookouts rang the warning bell and telephoned the bridge. The officer of the watch ordered the helm hard over. The ship turned, but not far enough, and the iceberg scraped along the starboard bow, opening the forward compartments to the sea. Within the hour, the officers knew she would sink, and that the boats could not hold everyone.',
    claims: claims('ti-3', [
      ['The lookouts warned the bridge by bell and telephone.', 'T01'],
      ['The iceberg opened the forward compartments along the starboard side.', 'T01'],
      ['The boats could not hold everyone aboard.', 'T02'],
    ]),
    choices: [
      { choice_id: 'ti-3-a', label: 'Hear it from third class', perspective: 'steerage', choice_type: 'perspective_shift' },
      { choice_id: 'ti-3-b', label: 'Did she break in two?', perspective: 'first_class', choice_type: 'what_next' },
    ],
  }),
  makeSegment({
    segment_id: 'ti-4',
    title: 'Room for half',
    perspective: 'steerage',
    mood: 'somber',
    date_label: '15 April 1912, after midnight',
    location: WRECK,
    connected_to: ['ti-3', 'ti-2'],
    edge_type: 'happened_next',
    scene_prompt: 'SAMPLE: crowded lower-deck corridor of a liner, water on the floor',
    narrative_text:
      'Third class was full of emigrants from dozens of countries, who had boarded at Southampton, Cherbourg and Queenstown. One of them, Carl Olaf Jansson, told a newspaper days later how water crept into steerage. The boats had room for about half of those aboard. About 62 percent of first-class ticket holders survived. In third class, about 25 percent did.',
    claims: claims('ti-4', [
      ['Third-class passengers came from dozens of countries and boarded at three ports.', 'T18'],
      ['A third-class survivor described water creeping into steerage.', 'T21'],
      ['About 62% of first-class and about 25% of third-class ticket holders survived.', 'T17'],
    ]),
    choices: [
      { choice_id: 'ti-4-a', label: 'Did she break in two?', perspective: 'first_class', choice_type: 'what_next' },
      { choice_id: 'ti-4-b', label: 'Ask why no ship came sooner', perspective: 'historian', choice_type: 'perspective_shift' },
    ],
  }),
  makeSegment({
    segment_id: 'ti-5',
    title: 'Did she break in two?',
    perspective: 'first_class',
    mood: 'somber',
    date_label: '15 April 1912, 2:20 am',
    location: WRECK,
    connected_to: ['ti-4'],
    edge_type: 'happened_next',
    scene_prompt: 'SAMPLE: stern of a liner rising against stars, seen from a small boat',
    narrative_text:
      'Archibald Gracie went down with the ship and reached an overturned collapsible boat. Beside him, young Jack Thayer insisted he had seen her split apart. Gracie and the officers disagreed. Charles Lightoller, the most senior officer to survive, told both inquiries she went down whole. For 73 years, the record took his side.',
    claims: claims('ti-5', [
      ['Gracie records Jack Thayer insisting the ship split.', 'T09'],
      ['Lightoller testified the ship went down intact.', 'T02'],
      ['Survivors who said she broke were not believed for decades.', 'T13'],
    ]),
    contradiction: {
      contradiction_id: 'ti-5-x',
      claim: 'Titanic broke in two before it sank.',
      side_a: { text: 'Survivors including Jack Thayer, Frank Osman and Eva Hart said they saw the ship break apart.', source_id: 'T13' },
      side_b: { text: "Second Officer Lightoller told the Senate the ship went down 'absolutely intact'.", source_id: 'T02' },
      explanation: "Witnesses watched from different boats, in darkness. The inquiries accepted the officer's account. The wreck, found in 1985 in two halves, proved the other survivors right.",
    },
    choices: [
      { choice_id: 'ti-5-a', label: 'What the band played', perspective: 'crew', choice_type: 'go_deeper' },
      { choice_id: 'ti-5-b', label: 'What the wreck showed', perspective: 'historian', choice_type: 'what_next' },
    ],
  }),
  makeSegment({
    segment_id: 'ti-6',
    title: 'Rockets in the night',
    perspective: 'historian',
    mood: 'tense',
    date_label: 'May to July 1912',
    location: CALIFORNIAN,
    connected_to: ['ti-4'],
    edge_type: 'opposing_view',
    scene_prompt: 'SAMPLE: a hearing room with long tables and tall windows',
    narrative_text:
      "Both inquiries asked why the steamer Californian, stopped in the ice, did not come. The British report found she could have reached Titanic and saved many lives. Her captain, Stanley Lord, had gone below after a 17-hour day, and said the rockets his officers reported looked like company signals. In 1992, after the wreck was found, the British government looked at the evidence again.",
    claims: claims('ti-6', [
      ['The British inquiry found against the Californian.', 'T04'],
      ['Lord had gone below after a 17-hour day and took the rockets for company signals.', 'T05'],
      ['A 1992 government report re-examined the 1912 finding.', 'T06'],
    ]),
    contradiction: {
      contradiction_id: 'ti-6-x',
      claim: 'The Californian could have reached Titanic in time.',
      side_a: { text: 'The British Wreck Commissioner found she could have pushed through the ice and saved many if not all of the lives lost.', source_id: 'T04' },
      side_b: { text: 'Captain Lord said he was resting after a 17-hour day and that the rockets were reported as company signals, not distress.', source_id: 'T05' },
      explanation: 'The distress position Titanic radioed was about 13 miles off, which makes every claim about distance uncertain. The 1992 reappraisal revisited the finding.',
    },
    choices: [
      { choice_id: 'ti-6-a', label: 'Go back to the bridge', perspective: 'crew', choice_type: 'perspective_shift' },
      { choice_id: 'ti-6-b', label: 'What the wreck showed', perspective: 'historian', choice_type: 'what_next' },
    ],
  }),
  makeSegment({
    segment_id: 'ti-7',
    title: 'The last song',
    perspective: 'crew',
    mood: 'somber',
    date_label: '15 April 1912, about 2:10 am',
    location: WRECK,
    connected_to: ['ti-5'],
    edge_type: 'deeper_context',
    scene_prompt: 'SAMPLE: musicians playing on a tilted deck at night, lamps still lit',
    narrative_text:
      "The ship's musicians kept playing as the boats left. Junior wireless operator Harold Bride, who survived, said the band played ragtime and then a tune called 'Autumn'. Other survivors remembered the hymn 'Nearer, My God, to Thee'. Some who stayed until the end heard no hymn at all.",
    claims: claims('ti-7', [
      ["Harold Bride said the band played ragtime and 'Autumn'.", 'T10'],
      ['Other survivors remembered a hymn; some who stayed to the end did not.', 'T12'],
    ]),
    choices: [
      { choice_id: 'ti-7-a', label: 'What the wreck showed', perspective: 'historian', choice_type: 'what_next' },
      { choice_id: 'ti-7-b', label: 'Hear it from third class', perspective: 'steerage', choice_type: 'perspective_shift' },
    ],
  }),
  makeSegment({
    segment_id: 'ti-8',
    title: 'Found in two halves',
    perspective: 'historian',
    mood: 'hopeful',
    date_label: 'September 1985',
    location: WRECK,
    travel_from: CQD,
    connected_to: ['ti-5', 'ti-6'],
    edge_type: 'happened_next',
    scene_prompt: 'SAMPLE: deep sea floor, a ship bow in the dark, a submersible light',
    narrative_text:
      'In 1985, an expedition found the wreck on the seabed, in two halves, about 13 nautical miles from the position Titanic had radioed for help. The survivors who said she broke apart had been right. The wrong position also reopened the old question of how close the Californian really was.',
    claims: claims('ti-8', [
      ['The wreck was found in 1985 in two halves.', 'T19'],
      ['It lies about 13 nautical miles from the radioed position.', 'T16'],
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
    'ti-1-a': 'ti-2', 'ti-1-b': 'ti-3', 'ti-1-c': 'ti-6',
    'ti-2-a': 'ti-3', 'ti-2-b': 'ti-4',
    'ti-3-a': 'ti-4', 'ti-3-b': 'ti-5',
    'ti-4-a': 'ti-5', 'ti-4-b': 'ti-6',
    'ti-5-a': 'ti-7', 'ti-5-b': 'ti-8',
    'ti-6-a': 'ti-3', 'ti-6-b': 'ti-8',
    'ti-7-a': 'ti-8', 'ti-7-b': 'ti-4',
  },
})
