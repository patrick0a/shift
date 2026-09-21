'use client'

/**
 * Browser-local player identity.
 *
 * The playerId is the stable handle the server keys seats off, so refreshing
 * or briefly losing signal drops you back into the same chair rather than
 * spawning a ghost player.
 */

const ID_KEY = 'cns:playerId'
const NAME_KEY = 'cns:playerName'

/** أسماء حركية تُمنح للاعب الجديد قبل أن يختار اسمه. */
const CALLSIGNS = [
  'صقر', 'ظل', 'شفرة', 'نورس', 'رماد', 'بوصلة', 'سراب', 'مرساة',
  'وميض', 'عاصفة', 'نجم', 'خنجر', 'فهد', 'قمر', 'رعد', 'سهم',
]

function randomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `p-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`
}

export function getPlayerId(): string {
  if (typeof window === 'undefined') return ''
  let id = window.localStorage.getItem(ID_KEY)
  if (!id) {
    id = randomId()
    window.localStorage.setItem(ID_KEY, id)
  }
  return id
}

export function getPlayerName(): string {
  if (typeof window === 'undefined') return ''
  let name = window.localStorage.getItem(NAME_KEY)
  if (!name) {
    name = `${CALLSIGNS[Math.floor(Math.random() * CALLSIGNS.length)]}-${
      Math.floor(Math.random() * 90) + 10
    }`
    window.localStorage.setItem(NAME_KEY, name)
  }
  return name
}

export function setPlayerName(name: string): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(NAME_KEY, name.trim().slice(0, 18))
}
