// Continuity over iMessage (Photon). The message text and the number are unchanged from the
// earlier "continue on your phone" box: text "VANTAGE <code>" to VITE_VANTAGE_PHOTON_NUMBER.
export const PHOTON_NUMBER = (import.meta.env.VITE_VANTAGE_PHOTON_NUMBER || '').trim()

/** The exact text to send (the backend matches this keyword and code). */
export const photonMessage = (linkCode) => `VANTAGE ${linkCode}`

/**
 * An sms: link with the number and a prefilled body. `?&body=` is the form both platforms accept:
 * iOS reads the body after the `&`, Android after the `?`.
 */
export function smsHref(number, body) {
  const digits = number.replace(/[^\d+]/g, '')
  const e164 = digits.startsWith('+') ? digits : `+1${digits}`
  return `sms:${e164}?&body=${encodeURIComponent(body)}`
}
