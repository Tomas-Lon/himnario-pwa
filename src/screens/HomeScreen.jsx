import { useState, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { db } from '../db/database'
import HymnItem from '../components/HymnItem'

/** Elimina tildes para búsqueda tolerante */
function normalize(str) {
  return (str ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export default function HomeScreen() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Debounce 300 ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  const hymns = useLiveQuery(async () => {
    if (!debouncedSearch) {
      return db.hymns.orderBy('numero').toArray()
    }
    const q = normalize(debouncedSearch)
    return db.hymns
      .filter((h) => {
        return (
          normalize(h.title).includes(q) ||
          normalize(h.lyrics).includes(q) ||
          String(h.numero ?? h.id).includes(q)
        )
      })
      .sortBy('numero')
  }, [debouncedSearch])

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="bg-white px-4 pt-4 pb-3 border-b border-ios-separator">
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Himnario</h1>
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="search"
            inputMode="search"
            placeholder="Título, letra o número..."
            className="w-full pl-9 pr-9 py-2.5 bg-ios-lightgray rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ios-blue"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2"
              onClick={() => setSearch('')}
            >
              <XMarkIcon className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 scroll-view">
        {hymns === undefined ? (
          <Spinner />
        ) : hymns.length === 0 ? (
          <Empty message={search ? 'Sin resultados' : 'No hay himnos cargados'} />
        ) : (
          <>
            <div className="px-4 py-2 text-xs text-gray-400">
              {hymns.length} himno{hymns.length !== 1 ? 's' : ''}
            </div>
            {hymns.map((h) => (
              <HymnItem key={h.id} hymn={h} />
            ))}
            <div className="h-6" />
          </>
        )}
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <div className="flex items-center justify-center h-32">
      <div className="w-6 h-6 border-2 border-ios-blue border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function Empty({ message }) {
  return (
    <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
      {message}
    </div>
  )
}
