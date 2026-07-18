import { useState, useRef, useCallback } from 'react'
import {
  ChevronDownIcon,
  ShareIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline'
import { db } from '../db/database'
import {
  shareHymn,
  shareHymnWithChords,
  exportHymnAsPdf,
  exportHymnAsTxt,
  exportHymnWithChordsPdf,
  exportHymnWithChordsTxt,
  exportHymnChordsOnlyPdf,
  exportHymnChordsOnlyTxt,
} from '../utils/exportUtils'
import { transpose } from '../utils/chordTransposer'

/**
 * Tarjeta de himno expandible.
 *
 * Props:
 *  hymn          — objeto himno de Dexie
 *  showChords    — mostrar sección de acordes (modo músicos)
 *  transposeKey  — tonalidad para transposición (null = original)
 *  addToListButton — nodo React opcional para mostrar botón "añadir a lista"
 */
export default function HymnItem({
  hymn,
  showChords = false,
  transposeKey = null,
  onTransposeKeyChange = null,
  addToListButton = null,
}) {
  const [expanded, setExpanded] = useState(false)
  const [note, setNote] = useState(hymn.note ?? '')
  const [toast, setToast] = useState(null)
  const saveTimer = useRef(null)

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2000)
  }

  // Guarda la nota con debounce de 600 ms
  const handleNoteChange = useCallback((e) => {
    const val = e.target.value
    setNote(val)
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      db.hymns.update(hymn.id, { note: val })
    }, 600)
  }, [hymn.id])

  const resolvedKey = transposeKey || hymn.musical_key
  const chords = showChords
    ? transpose(hymn.musical_notation, resolvedKey)
    : null

  const handleShare = async () => {
    try {
      const result = showChords && chords
        ? await shareHymnWithChords(hymn, chords)
        : await shareHymn(hymn)
      if (result === 'clipboard') showToast('Copiado al portapapeles')
      if (result === 'error') showToast('No se pudo copiar')
      // 'shared' y 'cancelled' no muestran toast
    } catch {
      showToast('No se pudo copiar')
    }
  }

  const handlePdf = () => {
    if (showChords && chords) {
      exportHymnWithChordsPdf(hymn, chords)
    } else {
      exportHymnAsPdf(hymn)
    }
  }

  const handleTxt = () => {
    if (showChords && chords) {
      exportHymnWithChordsTxt(hymn, chords, resolvedKey)
    } else {
      exportHymnAsTxt(hymn)
    }
  }

  const handleChordsOnlyPdf = () => {
    if (!chords) return
    exportHymnChordsOnlyPdf(hymn, chords, resolvedKey)
  }

  const handleChordsOnlyTxt = () => {
    if (!chords) return
    exportHymnChordsOnlyTxt(hymn, chords, resolvedKey)
  }

  return (
    <div className="bg-white relative">
      {/* ── Fila colapsada ── */}
      <button
        className="w-full flex items-center px-4 py-3 text-left gap-3 active:bg-gray-50"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="w-9 text-right text-ios-blue font-semibold text-sm flex-shrink-0 tabular-nums">
          {hymn.numero ?? hymn.id}
        </span>
        <span className="flex-1 text-gray-900 text-sm font-medium leading-snug">
          {hymn.title}
        </span>
        {addToListButton}
        <ChevronDownIcon
          className={`w-4 h-4 text-gray-300 flex-shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* ── Contenido expandido ── */}
      {expanded && (
        <div className="px-4 pb-5 border-t border-gray-100">
          {/* Chips: categoría y tono */}
          <div className="flex flex-wrap gap-1.5 mt-3 mb-3">
            {hymn.category && (
              <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full font-medium">
                {hymn.category}
              </span>
            )}
            {hymn.musical_key && (
              <span className="text-xs bg-purple-50 text-purple-700 px-2.5 py-0.5 rounded-full font-medium">
                {hymn.musical_key}
              </span>
            )}
          </div>

          {/* Acordes (solo modo músicos) */}
          {showChords && chords && (
            <>
              <div className="mb-3 rounded-xl border border-blue-100 bg-blue-50 p-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-blue-700 font-medium">
                    Nota original: {hymn.musical_key ?? 'N/D'}
                  </span>
                  <select
                    value={transposeKey ?? ''}
                    onChange={(e) => onTransposeKeyChange?.(hymn.id, e.target.value || null)}
                    className="text-xs border border-blue-200 bg-white rounded-lg px-2 py-1 focus:outline-none"
                  >
                    <option value="">Original</option>
                    {['C', 'C#', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'].map((k) => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="hymn-chords text-xs bg-amber-50 text-amber-900 border border-amber-100 p-3 rounded-xl mb-4">
                {chords}
              </div>
            </>
          )}

          {/* Letra */}
          <pre className="font-sans text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
            {hymn.lyrics}
          </pre>

          {/* Nota personal */}
          <div className="mt-4">
            <p className="text-xs text-gray-400 font-medium mb-1">Nota personal</p>
            <textarea
              className="w-full text-base border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 resize-none focus:outline-none focus:ring-2 focus:ring-ios-blue"
              rows={2}
              placeholder="Escribe una nota..."
              value={note}
              onChange={handleNoteChange}
            />
          </div>

          {/* Acciones */}
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 text-xs bg-blue-50 text-ios-blue font-medium px-3 py-2 rounded-lg active:opacity-70"
            >
              <ShareIcon className="w-4 h-4" />
              Compartir
            </button>
            <button
              onClick={handlePdf}
              className="flex items-center gap-1.5 text-xs bg-gray-100 text-gray-600 font-medium px-3 py-2 rounded-lg active:opacity-70"
            >
              <DocumentArrowDownIcon className="w-4 h-4" />
              PDF
            </button>
            <button
              onClick={handleTxt}
              className="flex items-center gap-1.5 text-xs bg-gray-100 text-gray-600 font-medium px-3 py-2 rounded-lg active:opacity-70"
            >
              TXT
            </button>
            {showChords && chords && (
              <>
                <button
                  onClick={handleChordsOnlyPdf}
                  className="flex items-center gap-1.5 text-xs bg-amber-100 text-amber-800 font-medium px-3 py-2 rounded-lg active:opacity-70"
                >
                  Acordes PDF
                </button>
                <button
                  onClick={handleChordsOnlyTxt}
                  className="flex items-center gap-1.5 text-xs bg-amber-100 text-amber-800 font-medium px-3 py-2 rounded-lg active:opacity-70"
                >
                  Acordes TXT
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-3 py-1.5 rounded-full shadow-lg z-10 pointer-events-none">
          {toast}
        </div>
      )}

      {/* Separador */}
      <div className="h-px bg-gray-100 mx-4" />
    </div>
  )
}
