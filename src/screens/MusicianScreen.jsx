import { useState, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { db } from '../db/database'
import HymnItem from '../components/HymnItem'

function normalize(str) {
  return (str ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export default function MusicianScreen() {
  const [selectedKeysByHymn, setSelectedKeysByHymn] = useState({})
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const handleTransposeChange = (hymnId, key) => {
    setSelectedKeysByHymn((prev) => ({ ...prev, [hymnId]: key }))
  }

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  // Solo himnos que tienen acordes (musical_notation no nulo)
  const hymns = useLiveQuery(async () => {
    const all = await db.hymns.orderBy('numero').toArray()
    const withChords = all.filter((h) => h.musical_notation?.trim())

    if (!debouncedSearch) return withChords

    const q = normalize(debouncedSearch)
    return withChords.filter(
      (h) =>
        normalize(h.title).includes(q) ||
        normalize(h.lyrics).includes(q) ||
        String(h.numero ?? h.id).includes(q),
    )
  }, [debouncedSearch])

  return (
    <div className="flex flex-col bg-white">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white px-4 pt-4 pb-3 border-b border-ios-separator shadow-[0_1px_0_rgba(0,0,0,0.02)]">
        <h1 className="text-2xl font-bold text-gray-900">Músicos</h1>
        <p className="text-xs text-gray-400 mt-0.5 mb-3">
          Nota original visible por canción. Puedes transponer cada himno de forma individual al expandirlo.
        </p>

        {/* Buscador */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="search"
            placeholder="Buscar himno con acordes..."
            className="w-full pl-9 pr-9 py-2.5 bg-ios-lightgray rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-ios-blue"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setSearch('')}>
              <XMarkIcon className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Lista */}
      <div className="pb-2">
        {hymns === undefined ? (
          <Spinner />
        ) : hymns.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm text-center px-8">
            {search ? 'Sin resultados' : 'Ningún himno tiene acordes cargados aún'}
          </div>
        ) : (
          <>
            <div className="px-4 py-2 text-xs text-gray-400">
              {hymns.length} himno{hymns.length !== 1 ? 's' : ''} con acordes
            </div>
            {hymns.map((h) => (
              <HymnItem
                key={h.id}
                hymn={h}
                showChords
                transposeKey={selectedKeysByHymn[h.id] ?? null}
                onTransposeKeyChange={handleTransposeChange}
              />
            ))}
            <div className="h-24" />
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
