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

/**
 * Transpone la notación de grados romanos a la tonalidad indicada.
 * @param {string|null} notation  Texto con grados romanos ("I    IV    V")
 * @param {string|null} key       Tonalidad destino ("C", "D", "SOL", etc.)
 * @returns {string}
 */
export function transpose(notation, key) {
  if (!notation || !key) return notation ?? ''
  const scale = SCALES[key] ?? SCALES[key.toUpperCase()] ?? SCALES['C']

  // Reemplazamos de mayor a menor longitud usando word-boundary equivalente
  let result = notation
  for (const numeral of SORTED_NUMERALS) {
    const idx = ROMAN_INDEX[numeral]
    const chord = scale[idx]
    // (?<![A-Za-z]) y (?![A-Za-z]) evitan reemplazos dentro de palabras
    const regex = new RegExp(`(?<![A-Za-z])${numeral}(?![A-Za-z])`, 'g')
    result = result.replace(regex, chord)
  }

  return result
}
