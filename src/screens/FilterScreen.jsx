import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { XMarkIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import { db } from '../db/database'
import HymnItem from '../components/HymnItem'

// Tonalidades disponibles en el filtro (mismo orden que Android)
const KEYS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B',
               'DO', 'RE', 'MI', 'FA', 'SOL', 'LA', 'SI']

export default function FilterScreen() {
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedKey, setSelectedKey] = useState(null)
  const [showCatMenu, setShowCatMenu] = useState(false)
  const [showKeyMenu, setShowKeyMenu] = useState(false)

  // Categorías únicas del DB
  const categories = useLiveQuery(async () => {
    const all = await db.hymns.orderBy('category').uniqueKeys()
    return all.filter(Boolean)
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
    <div className="min-h-full flex flex-col bg-white">
      {/* Header */}
      <div className="bg-white px-4 pt-4 pb-3 border-b border-ios-separator">
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
              onClick={() => { setShowCatMenu((v) => !v); setShowKeyMenu(false) }}
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

          {/* Tonalidad */}
          <div className="relative flex-1">
            <button
              onClick={() => { setShowKeyMenu((v) => !v); setShowCatMenu(false) }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm border
                ${selectedKey ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 bg-ios-lightgray text-gray-600'}`}
            >
              <span className="truncate">{selectedKey ?? 'Tonalidad'}</span>
              <ChevronDownIcon className={`w-4 h-4 flex-shrink-0 ml-1 transition-transform ${showKeyMenu ? 'rotate-180' : ''}`} />
            </button>

            {showKeyMenu && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 z-20 overflow-hidden max-h-52 overflow-y-auto">
                <button
                  className="w-full text-left px-4 py-3 text-sm text-ios-red border-b border-gray-50"
                  onClick={() => { setSelectedKey(null); setShowKeyMenu(false) }}
                >
                  Todas
                </button>
                {KEYS.map((k) => (
                  <button
                    key={k}
                    className={`w-full text-left px-4 py-3 text-sm border-b border-gray-50 last:border-0
                      ${selectedKey === k ? 'text-purple-700 font-medium' : 'text-gray-800'}`}
                    onClick={() => { setSelectedKey(k); setShowKeyMenu(false) }}
                  >
                    {k}
                  </button>
                ))}
              </div>
            )}
          </div>
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
      <div className="flex-1 pb-4" onClick={() => { setShowCatMenu(false); setShowKeyMenu(false) }}>
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
            <div className="h-6" />
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
