import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { XMarkIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import { db } from '../db/database'
import HymnItem from '../components/HymnItem'

const KEY_ORDER = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B', 'DO', 'RE', 'MI', 'FA', 'SOL', 'LA', 'SI']

function sortKeys(keys) {
  return [...keys].sort((a, b) => {
    const ai = KEY_ORDER.indexOf(String(a).toUpperCase())
    const bi = KEY_ORDER.indexOf(String(b).toUpperCase())
    if (ai === -1 && bi === -1) return String(a).localeCompare(String(b))
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })
}

export default function FilterScreen() {
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedKey, setSelectedKey] = useState(null)
  const [showCatMenu, setShowCatMenu] = useState(false)

  // Categorías únicas del DB
  const categories = useLiveQuery(async () => {
    const all = await db.hymns.orderBy('category').uniqueKeys()
    return all.filter(Boolean)
  })

  // Tonalidades existentes en el DB
  const musicalKeys = useLiveQuery(async () => {
    const all = await db.hymns.orderBy('musical_key').uniqueKeys()
    return sortKeys(all.filter(Boolean))
  })

  // Himnos filtrados
  const hymns = useLiveQuery(async () => {
    let col = db.hymns
    if (selectedCategory && selectedKey) {
      return col.filter(
        (h) => h.category === selectedCategory && h.musical_key === selectedKey,
      ).sortBy('numero')
    }
    if (selectedCategory) {
      return col.where('category').equals(selectedCategory).sortBy('numero')
    }
    if (selectedKey) {
      return col.where('musical_key').equals(selectedKey).sortBy('numero')
    }
    return col.orderBy('numero').toArray()
  }, [selectedCategory, selectedKey])

  const hasFilter = selectedCategory || selectedKey

  return (
    <div className="flex flex-col bg-white">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white px-4 pt-4 pb-3 border-b border-ios-separator shadow-[0_1px_0_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold text-gray-900">Filtros</h1>
          {hasFilter && (
            <button
              className="text-xs text-ios-red font-medium"
              onClick={() => { setSelectedCategory(null); setSelectedKey(null) }}
            >
              Limpiar
            </button>
          )}
        </div>

        {/* Controles de filtro */}
        <div className="flex gap-2">
          {/* Categoría */}
          <div className="relative flex-1">
            <button
              onClick={() => { setShowCatMenu((v) => !v) }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm border
                ${selectedCategory ? 'border-ios-blue bg-blue-50 text-ios-blue' : 'border-gray-200 bg-ios-lightgray text-gray-600'}`}
            >
              <span className="truncate">{selectedCategory ?? 'Categoría'}</span>
              <ChevronDownIcon className={`w-4 h-4 flex-shrink-0 ml-1 transition-transform ${showCatMenu ? 'rotate-180' : ''}`} />
            </button>

            {showCatMenu && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 z-20 overflow-hidden max-h-52 overflow-y-auto">
                <button
                  className="w-full text-left px-4 py-3 text-sm text-ios-red border-b border-gray-50"
                  onClick={() => { setSelectedCategory(null); setShowCatMenu(false) }}
                >
                  Todas
                </button>
                {(categories ?? []).map((cat) => (
                  <button
                    key={cat}
                    className={`w-full text-left px-4 py-3 text-sm border-b border-gray-50 last:border-0
                      ${selectedCategory === cat ? 'text-ios-blue font-medium' : 'text-gray-800'}`}
                    onClick={() => { setSelectedCategory(cat); setShowCatMenu(false) }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tonalidad (chips, solo valores existentes) */}
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
          <button
            onClick={() => setSelectedKey(null)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${!selectedKey ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-ios-lightgray text-gray-600 border-transparent'}`}
          >
            Todas las notas
          </button>
          {(musicalKeys ?? []).map((k) => (
            <button
              key={k}
              onClick={() => setSelectedKey(k)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${selectedKey === k ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-ios-lightgray text-gray-600 border-transparent'}`}
            >
              {k}
            </button>
          ))}
        </div>

        {/* Chips de filtros activos */}
        {hasFilter && (
          <div className="flex gap-2 mt-2">
            {selectedCategory && (
              <Chip label={selectedCategory} onRemove={() => setSelectedCategory(null)} color="blue" />
            )}
            {selectedKey && (
              <Chip label={selectedKey} onRemove={() => setSelectedKey(null)} color="purple" />
            )}
          </div>
        )}
      </div>

      {/* Lista */}
      <div className="pb-2" onClick={() => { setShowCatMenu(false) }}>
        {hymns === undefined ? (
          <Spinner />
        ) : hymns.length === 0 ? (
          <Empty />
        ) : (
          <>
            <div className="px-4 py-2 text-xs text-gray-400">
              {hymns.length} himno{hymns.length !== 1 ? 's' : ''}
            </div>
            {hymns.map((h) => <HymnItem key={h.id} hymn={h} />)}
            <div className="h-[calc(env(safe-area-inset-bottom)+5.5rem)]" />
          </>
        )}
      </div>
    </div>
  )
}

function Chip({ label, onRemove, color }) {
  const colors = {
    blue: 'bg-blue-50 text-ios-blue',
    purple: 'bg-purple-50 text-purple-700',
  }
  return (
    <span className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${colors[color]}`}>
      {label}
      <button onClick={onRemove}><XMarkIcon className="w-3 h-3" /></button>
    </span>
  )
}

function Spinner() {
  return (
    <div className="flex items-center justify-center h-32">
      <div className="w-6 h-6 border-2 border-ios-blue border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function Empty() {
  return (
    <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
      Sin resultados
    </div>
  )
}
