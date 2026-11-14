// Plain-word labels shared by the new UI.
import { SOURCE_TYPE_LABEL } from '../constants/labels.js'

export const sourceLabel = (source) => SOURCE_TYPE_LABEL[source?.source_type] || 'Source'
