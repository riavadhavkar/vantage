// Plain-word labels for contract enums.
export const SOURCE_TYPE_LABEL = {
  primary: 'Primary',
  secondary: 'Secondary',
  oral_history: 'Oral history',
  news: 'News',
  encyclopedia: 'Encyclopedia',
  computation: 'Computation',
}

export const CHOICE_TYPE_LABEL = {
  perspective_shift: 'Another point of view',
  go_deeper: 'Go deeper',
  what_next: 'What happened next',
  primary_source: 'Read the source',
}

// The backend files a Wolfram|Alpha answer under "secondary"; its title says what it really is.
const isComputation = (source) => source?.source_type === 'computation' || /^wolfram\|alpha/i.test(source?.title || '')
export const sourceLabel = (source) => (isComputation(source) ? SOURCE_TYPE_LABEL.computation : SOURCE_TYPE_LABEL[source?.source_type] || 'Source')
