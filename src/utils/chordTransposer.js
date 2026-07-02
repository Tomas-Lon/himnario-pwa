/**
 * Porta directa de ChordTransposer.kt
 * Convierte notación con grados romanos a acordes en una tonalidad específica.
 * Preserva el espaciado exacto del texto original.
 */

// Índices: I=0, i=1, II=2, ii=3, III=4, iii=5, IV=6, iv=7, V=8, v=9, VI=10, vi=11, VII=12, vii=13
const ROMAN_INDEX = {
  I: 0, i: 1, II: 2, ii: 3, III: 4, iii: 5,
  IV: 6, iv: 7, V: 8, v: 9, VI: 10, vi: 11, VII: 12, vii: 13,
}

// Tonalidades estándar para el selector de la UI
export const STANDARD_KEYS = [
  'C', 'C#', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B',
]

// Escala de cada tonalidad [I mayor, i menor, II, ii, III, iii, IV, iv, V, v, VI, vi, VII, vii]
const SCALES = {
  C:   ['C','Cm','D','Dm','E','Em','F','Fm','G','Gm','A','Am','B','Bm'],
  DO:  ['C','Cm','D','Dm','E','Em','F','Fm','G','Gm','A','Am','B','Bm'],
  'C#':['C#','C#m','D#','D#m','F','Fm','F#','F#m','G#','G#m','A#','A#m','C','Cm'],
  Db:  ['Db','Dbm','Eb','Ebm','F','Fm','Gb','Gbm','Ab','Abm','Bb','Bbm','C','Cm'],
  D:   ['D','Dm','E','Em','F#','F#m','G','Gm','A','Am','B','Bm','C#','C#m'],
  RE:  ['D','Dm','E','Em','F#','F#m','G','Gm','A','Am','B','Bm','C#','C#m'],
  'D#':['D#','D#m','F','Fm','G','Gm','G#','G#m','A#','A#m','C','Cm','D','Dm'],
  Eb:  ['Eb','Ebm','F','Fm','G','Gm','Ab','Abm','Bb','Bbm','C','Cm','D','Dm'],
  E:   ['E','Em','F#','F#m','G#','G#m','A','Am','B','Bm','C#','C#m','D#','D#m'],
  MI:  ['E','Em','F#','F#m','G#','G#m','A','Am','B','Bm','C#','C#m','D#','D#m'],
  F:   ['F','Fm','G','Gm','A','Am','Bb','Bbm','C','Cm','D','Dm','E','Em'],
  FA:  ['F','Fm','G','Gm','A','Am','Bb','Bbm','C','Cm','D','Dm','E','Em'],
  'F#':['F#','F#m','G#','G#m','A#','A#m','B','Bm','C#','C#m','D#','D#m','F','Fm'],
  Gb:  ['Gb','Gbm','Ab','Abm','Bb','Bbm','B','Bm','Db','Dbm','Eb','Ebm','F','Fm'],
  G:   ['G','Gm','A','Am','B','Bm','C','Cm','D','Dm','E','Em','F#','F#m'],
  SOL: ['G','Gm','A','Am','B','Bm','C','Cm','D','Dm','E','Em','F#','F#m'],
  'G#':['G#','G#m','A#','A#m','C','Cm','C#','C#m','D#','D#m','F','Fm','G','Gm'],
  Ab:  ['Ab','Abm','Bb','Bbm','C','Cm','Db','Dbm','Eb','Ebm','F','Fm','G','Gm'],
  A:   ['A','Am','B','Bm','C#','C#m','D','Dm','E','Em','F#','F#m','G#','G#m'],
  LA:  ['A','Am','B','Bm','C#','C#m','D','Dm','E','Em','F#','F#m','G#','G#m'],
  'A#':['A#','A#m','C','Cm','D','Dm','D#','D#m','F','Fm','G','Gm','A','Am'],
  Bb:  ['Bb','Bbm','C','Cm','D','Dm','Eb','Ebm','F','Fm','G','Gm','A','Am'],
  B:   ['B','Bm','C#','C#m','D#','D#m','E','Em','F#','F#m','G#','G#m','A#','A#m'],
  SI:  ['B','Bm','C#','C#m','D#','D#m','E','Em','F#','F#m','G#','G#m','A#','A#m'],
}

// Orden de reemplazo: más largo primero (VII antes que VI antes que V, etc.)
const SORTED_NUMERALS = Object.keys(ROMAN_INDEX).sort((a, b) => b.length - a.length)

const NOTES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const NOTES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

const NOTE_INDEX = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
}

function shiftChordRoot(chord, semitones, preferFlats) {
  const m = String(chord ?? '').match(/^([A-G](?:#|b)?)(.*)$/)
  if (!m) return chord

  const root = m[1]
  const suffix = m[2] ?? ''
  const idx = NOTE_INDEX[root]
  if (idx == null) return chord

  const shifted = (idx + semitones + 12) % 12
  const newRoot = (preferFlats ? NOTES_FLAT : NOTES_SHARP)[shifted]
  return `${newRoot}${suffix}`
}

/**
 * Transpone la notación de grados romanos a la tonalidad indicada.
 * @param {string|null} notation  Texto con grados romanos ("I    IV    V")
 * @param {string|null} key       Tonalidad destino ("C", "D", "SOL", etc.)
 * @returns {string}
 */
export function transpose(notation, key) {
  if (!notation || !key) return notation ?? ''
  const scale = SCALES[key] ?? SCALES[key.toUpperCase()] ?? SCALES['C']
  const preferFlats = /b/.test(String(key))

  // Soporta grados con alteraciones y extensiones:
  // I, iv, I7, VI7, bVII, BVII, #IV, etc.
  const tokenRegex = /(?<![A-Za-z])([bB#]?)(VII|III|VI|IV|II|I|vii|iii|vi|iv|ii|i|v)(\d*)(?![A-Za-z])/g
  let result = notation.replace(tokenRegex, (_, accidental, numeral, ext) => {
    const idx = ROMAN_INDEX[numeral]
    if (idx == null) return _

    let chord = scale[idx]
    if (accidental === 'b' || accidental === 'B') {
      chord = shiftChordRoot(chord, -1, true)
    } else if (accidental === '#') {
      chord = shiftChordRoot(chord, 1, preferFlats)
    }

    return `${chord}${ext ?? ''}`
  })

  // Reemplazamos de mayor a menor longitud usando word-boundary equivalente
  for (const numeral of SORTED_NUMERALS) {
    const idx = ROMAN_INDEX[numeral]
    const chord = scale[idx]
    // (?<![A-Za-z]) y (?![A-Za-z]) evitan reemplazos dentro de palabras
    const regex = new RegExp(`(?<![A-Za-z])${numeral}(?![A-Za-z])`, 'g')
    result = result.replace(regex, chord)
  }

  return result
}
