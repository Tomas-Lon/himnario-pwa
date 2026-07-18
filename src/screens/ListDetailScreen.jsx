import { useState, useEffect, useRef, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  ChevronLeftIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  XMarkIcon,
  TrashIcon,
  Bars3Icon,
  ArrowUpTrayIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline'
import { db } from '../db/database'
import HymnItem from '../components/HymnItem'
import {
  exportListAsPdf,
  exportListAsTxt,
  exportListWithLyricsPdf,
  exportListWithLyricsTxt,
  exportListWithChordsPdf,
  exportListWithChordsTxt,
} from '../utils/exportUtils'
import { STANDARD_KEYS } from '../utils/chordTransposer'

/** Persiste el nuevo orden en Dexie asignando posicion = índice */
async function saveOrder(listId, orderedHymns) {
  await db.transaction('rw', db.listaHimnos, async () => {
    for (let i = 0; i < orderedHymns.length; i++) {
      await db.listaHimnos
        .where('[listaId+hymnId]')
        .equals([listId, orderedHymns[i].id])
        .modify({ posicion: i })
    }
  })
}

/** Mueve item de fromIdx a toIdx */
function reorder(arr, fromIdx, toIdx) {
  const result = [...arr]
  const [moved] = result.splice(fromIdx, 1)
  result.splice(toIdx, 0, moved)
  return result
}

function normalize(str) {
  return (str ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export default function ListDetailScreen({ listId, onBack }) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [localOrder, setLocalOrder] = useState(null)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [showEditListModal, setShowEditListModal] = useState(false)

  const lista = useLiveQuery(() => db.listas.get(listId), [listId])
  const folders = useLiveQuery(() => db.carpetas.orderBy('id').toArray())

  const hymnsInList = useLiveQuery(async () => {
    const refs = await db.listaHimnos
      .where('listaId').equals(listId)
      .sortBy('posicion')
    const ids = refs.map((r) => r.hymnId)
    if (ids.length === 0) return []
    const hymns = await db.hymns.where('id').anyOf(ids).toArray()
    return ids.map((id) => hymns.find((h) => h.id === id)).filter(Boolean)
  }, [listId])

  const dragging = useRef(false)
  useEffect(() => {
    if (!dragging.current && hymnsInList) setLocalOrder(hymnsInList)
  }, [hymnsInList])

  const removeHymn = async (hymnId) => {
    await db.listaHimnos
      .where('[listaId+hymnId]').equals([listId, hymnId])
      .delete()
  }

  const displayed = localOrder ?? hymnsInList ?? []

  return (
    <div className="flex flex-col bg-white">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white px-4 pt-4 pb-3 border-b border-ios-separator shadow-[0_1px_0_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-ios-blue p-1 -ml-1">
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <h1 className="flex-1 text-lg sm:text-xl font-bold text-gray-900 truncate">
            {lista?.nombre ?? '...'}
          </h1>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <button
            onClick={() => setShowExportMenu(true)}
            className="flex items-center justify-center gap-1 text-xs text-ios-blue font-medium bg-blue-50 px-2 py-2 rounded-lg active:opacity-70"
          >
            <ArrowUpTrayIcon className="w-4 h-4" />
            Exportar
          </button>
          <button
            onClick={() => setShowEditListModal(true)}
            className="flex items-center justify-center gap-1 text-xs text-ios-blue font-medium bg-blue-50 px-2 py-2 rounded-lg active:opacity-70"
          >
            <PencilSquareIcon className="w-4 h-4" />
            Editar
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-1 text-xs text-ios-blue font-medium bg-blue-50 px-2 py-2 rounded-lg active:opacity-70"
          >
            <PlusIcon className="w-4 h-4" />
            Añadir
          </button>
        </div>
      </div>

      {/* Lista de himnos */}
      <div className="pb-2">
        {hymnsInList === undefined ? (
          <Spinner />
        ) : hymnsInList.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400 text-sm gap-2">
            <p>Lista vacía</p>
            <button onClick={() => setShowAddModal(true)} className="text-ios-blue text-sm font-medium">
              Añadir himnos
            </button>
          </div>
        ) : (
          <>
            <div className="px-4 py-2 text-xs text-gray-400">
              {displayed.length} himno{displayed.length !== 1 ? 's' : ''}
              <span className="ml-2 text-gray-300">· arrastra ≡ para reordenar</span>
            </div>
            <DraggableList
              items={displayed}
              listId={listId}
              draggingRef={dragging}
              onOrderChange={setLocalOrder}
              onOrderSave={(newOrder) => saveOrder(listId, newOrder)}
              onRemove={removeHymn}
            />
            <div className="h-24" />
          </>
        )}
      </div>

      {showAddModal && (
        <AddHymnModal
          listId={listId}
          existingIds={(hymnsInList ?? []).map((h) => h.id)}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {showExportMenu && (
        <ExportMenu
          lista={lista}
          hymns={displayed}
          onClose={() => setShowExportMenu(false)}
        />
      )}

      {showEditListModal && lista && (
        <EditListInfoModal
          lista={lista}
          folders={folders ?? []}
          onClose={() => setShowEditListModal(false)}
        />
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────
   DraggableList — drag & drop + touch (iPhone)
───────────────────────────────────────────── */
function DraggableList({ items, listId, draggingRef, onOrderChange, onOrderSave, onRemove }) {
  const [dragIdx, setDragIdx] = useState(null)
  const touchData = useRef({ startY: 0, startIdx: null, currentIdx: null, clone: null, startTop: 0, rowHeight: 48 })

  /* ── Desktop drag ── */
  const handleDragStart = (idx) => {
    draggingRef.current = true
    setDragIdx(idx)
  }
  const handleDragEnter = (idx) => {
    if (idx === dragIdx) return
    onOrderChange(reorder(items, dragIdx, idx))
    setDragIdx(idx)
  }
  const handleDragEnd = async () => {
    setDragIdx(null)
    await onOrderSave(items)
    draggingRef.current = false
  }

  /* ── Touch (iPhone) ── */
  const handleTouchStart = useCallback((e, idx) => {
    draggingRef.current = true
    const touch = e.touches[0]
    const row = e.currentTarget.closest('[data-row]')
    const rect = row.getBoundingClientRect()
    touchData.current = {
      startY: touch.clientY,
      startIdx: idx,
      currentIdx: idx,
      startTop: rect.top,
      rowHeight: rect.height,
      clone: null,
    }
    // Ghost element
    const clone = row.cloneNode(true)
    clone.style.cssText = `position:fixed;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;
      opacity:0.9;z-index:9999;background:white;box-shadow:0 8px 24px rgba(0,0,0,.18);
      border-radius:12px;pointer-events:none;`
    document.body.appendChild(clone)
    touchData.current.clone = clone
  }, [draggingRef])

  const handleTouchMove = useCallback((e) => {
    if (!draggingRef.current) return
    e.preventDefault()
    const touch = e.touches[0]
    const { startY, startTop, rowHeight, startIdx, currentIdx, clone } = touchData.current
    const dy = touch.clientY - startY
    if (clone) clone.style.top = `${startTop + dy}px`
    const newIdx = Math.max(0, Math.min(items.length - 1, Math.round(startIdx + dy / rowHeight)))
    if (newIdx !== currentIdx) {
      onOrderChange(reorder(items, currentIdx, newIdx))
      touchData.current.currentIdx = newIdx
    }
  }, [draggingRef, items, onOrderChange])

  const handleTouchEnd = useCallback(async () => {
    if (touchData.current.clone) {
      document.body.removeChild(touchData.current.clone)
      touchData.current.clone = null
    }
    await onOrderSave(items)
    draggingRef.current = false
    setDragIdx(null)
  }, [draggingRef, items, onOrderSave])

  return (
    <div>
      {items.map((h, idx) => (
        <div
          key={h.id}
          data-row="true"
          draggable
          onDragStart={() => handleDragStart(idx)}
          onDragEnter={() => handleDragEnter(idx)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => e.preventDefault()}
          className={`transition-opacity duration-100 ${dragIdx === idx ? 'opacity-30' : 'opacity-100'}`}
        >
          <HymnItem
            hymn={h}
            addToListButton={
              <div className="flex items-center gap-0.5 flex-shrink-0 mr-1">
                <div
                  className="p-2 cursor-grab active:cursor-grabbing touch-none select-none"
                  onTouchStart={(e) => handleTouchStart(e, idx)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Bars3Icon className="w-5 h-5 text-gray-300" />
                </div>
                <button
                  className="p-1.5"
                  onClick={(e) => { e.stopPropagation(); onRemove(h.id) }}
                >
                  <TrashIcon className="w-4 h-4 text-gray-300" />
                </button>
              </div>
            }
          />
        </div>
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────
   Menú de exportación de la lista
───────────────────────────────────────────── */
function ExportMenu({ lista, hymns, onClose }) {
  if (!lista) return null

  const [showChordOptions, setShowChordOptions] = useState(false)
  const [selectedKeys, setSelectedKeys] = useState({})
  const [format, setFormat] = useState('pdf')

  const setKeyForHymn = (hymnId, key) => {
    setSelectedKeys((prev) => ({ ...prev, [hymnId]: key }))
  }

  const options = [
    {
      label: 'Sin letra',
      description: 'Solo números y títulos',
      action: () => {
        if (format === 'pdf') exportListAsPdf(lista, hymns)
        else exportListAsTxt(lista, hymns)
        onClose()
      },
    },
    {
      label: 'Con letra',
      description: 'Títulos y texto completo',
      action: () => {
        if (format === 'pdf') exportListWithLyricsPdf(lista, hymns)
        else exportListWithLyricsTxt(lista, hymns)
        onClose()
      },
    },
    {
      label: 'Acordes',
      description: 'Original o transpuesto, con/sin letra',
      action: () => { setShowChordOptions(true) },
    },
  ]

  const handleConfirmChordsExport = ({ transposeEnabled, chordsOnly }) => {
    if (format === 'pdf') {
      exportListWithChordsPdf(lista, hymns, selectedKeys, { transposeEnabled, chordsOnly })
    } else {
      exportListWithChordsTxt(lista, hymns, selectedKeys, { transposeEnabled, chordsOnly })
    }
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col justify-end bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-2xl pb-safe"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 pt-4 pb-3 border-b border-ios-separator">
          <h2 className="text-base font-semibold text-gray-900 text-center">
            Exportar lista
          </h2>
          <p className="text-xs text-gray-400 text-center mt-0.5">
            {hymns.length} himno{hymns.length !== 1 ? 's' : ''} · {lista.nombre}
          </p>
          <div className="mt-3 flex items-center justify-center gap-2">
            <button
              onClick={() => setFormat('pdf')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border ${format === 'pdf' ? 'bg-ios-blue text-white border-ios-blue' : 'bg-ios-lightgray text-gray-600 border-transparent'}`}
            >
              PDF
            </button>
            <button
              onClick={() => setFormat('txt')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border ${format === 'txt' ? 'bg-ios-blue text-white border-ios-blue' : 'bg-ios-lightgray text-gray-600 border-transparent'}`}
            >
              TXT
            </button>
          </div>
        </div>
        {!showChordOptions ? (
          <div className="px-4 py-2">
            {options.map((opt) => (
              <button
                key={opt.label}
                onClick={opt.action}
                className="w-full flex flex-col items-start px-3 py-3.5 rounded-xl active:bg-gray-100 text-left"
              >
                <span className="text-sm font-medium text-gray-900">{opt.label}</span>
                <span className="text-xs text-gray-400">{opt.description}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="px-4 py-2 max-h-[55vh] overflow-y-auto space-y-2">
            <p className="text-xs text-gray-500 px-1">
              Selecciona tonalidad por canción para exportación transpuesta. Si no eliges, se usa la tonalidad por defecto.
            </p>
            {hymns.map((h) => {
              const currentKey = selectedKeys[h.id] ?? h.musical_key ?? ''
              return (
                <div key={h.id} className="rounded-xl border border-gray-100 p-3 bg-white">
                  <p className="text-xs text-gray-400 mb-0.5">Nº {h.numero ?? h.id}</p>
                  <p className="text-sm font-medium text-gray-900 truncate mb-2">{h.title}</p>
                  <select
                    className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm bg-white focus:outline-none"
                    value={currentKey}
                    onChange={(e) => setKeyForHymn(h.id, e.target.value)}
                  >
                    <option value="">{h.musical_key ? `Por defecto (${h.musical_key})` : 'Sin tonalidad por defecto'}</option>
                    {STANDARD_KEYS.map((k) => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </div>
              )
            })}
          </div>
        )}
        <div className="px-4 pb-4">
          {!showChordOptions ? (
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-ios-lightgray text-sm font-medium text-gray-700 active:opacity-70"
            >
              Cancelar
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setShowChordOptions(false)}
                className="flex-1 py-3 rounded-xl bg-ios-lightgray text-sm font-medium text-gray-700 active:opacity-70"
              >
                Volver
              </button>
              <button
                onClick={() => handleConfirmChordsExport({ transposeEnabled: false, chordsOnly: false })}
                className="flex-1 py-3 rounded-xl bg-ios-lightgray text-sm font-medium text-gray-700 active:opacity-80"
              >
                Original + letra
              </button>
              <button
                onClick={() => handleConfirmChordsExport({ transposeEnabled: true, chordsOnly: false })}
                className="flex-1 py-3 rounded-xl bg-ios-blue text-sm font-medium text-white active:opacity-80"
              >
                Transpuesto + letra
              </button>
            </div>
          )}
          {showChordOptions && (
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => handleConfirmChordsExport({ transposeEnabled: false, chordsOnly: true })}
                className="flex-1 py-2.5 rounded-xl bg-amber-100 text-xs font-semibold text-amber-800 active:opacity-80"
              >
                Solo acordes (orig.)
              </button>
              <button
                onClick={() => handleConfirmChordsExport({ transposeEnabled: true, chordsOnly: true })}
                className="flex-1 py-2.5 rounded-xl bg-amber-200 text-xs font-semibold text-amber-900 active:opacity-80"
              >
                Solo acordes (transp.)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function EditListInfoModal({ lista, folders, onClose }) {
  const [name, setName] = useState(lista.nombre ?? '')
  const [description, setDescription] = useState(lista.descripcion ?? '')
  const [folderId, setFolderId] = useState(lista.folderId ?? null)

  const handleSave = async () => {
    const trimmed = name.trim()
    if (!trimmed) return
    await db.listas.update(lista.id, {
      nombre: trimmed,
      descripcion: description.trim(),
      folderId,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end bg-black/40" onClick={onClose}>
      <div className="w-full bg-white rounded-t-2xl pb-safe" onClick={(e) => e.stopPropagation()}>
        <div className="px-4 pt-4 pb-3 border-b border-ios-separator">
          <h2 className="text-base font-semibold text-gray-900 text-center">Editar lista</h2>
        </div>
        <div className="px-4 py-3 space-y-3">
          <div>
            <p className="text-xs text-gray-500 mb-1">Nombre</p>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-ios-blue"
              placeholder="Nombre de la lista"
            />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Descripción</p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-base resize-none focus:outline-none focus:ring-2 focus:ring-ios-blue"
              placeholder="Descripción (opcional)"
            />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Carpeta</p>
            <select
              value={folderId ?? ''}
              onChange={(e) => setFolderId(e.target.value ? Number(e.target.value) : null)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none"
            >
              <option value="">Sin carpeta</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>{f.nombre}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="px-4 pb-4 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-ios-lightgray text-sm font-medium text-gray-700 active:opacity-70"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 rounded-xl bg-ios-blue text-sm font-medium text-white active:opacity-80"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Modal para añadir himnos
───────────────────────────────────────────── */
function AddHymnModal({ listId, existingIds, onClose }) {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  const hymns = useLiveQuery(async () => {
    if (!debouncedSearch) {
      return db.hymns.orderBy('numero').limit(40).toArray()
    }
    const q = normalize(debouncedSearch)
    return db.hymns
      .filter(
        (h) =>
          normalize(h.title).includes(q) ||
          String(h.numero ?? h.id).includes(q),
      )
      .sortBy('numero')
  }, [debouncedSearch])

  const addHymn = async (hymn) => {
    // Obtener próxima posición
    const count = await db.listaHimnos.where('listaId').equals(listId).count()
    await db.listaHimnos.put({ listaId: listId, hymnId: hymn.id, posicion: count })
  }

  return (
    <div className="fixed inset-0 bg-white z-[80] flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {/* Header del modal */}
      <div className="px-4 pt-4 pb-3 border-b border-ios-separator">
        <div className="flex items-center gap-3 mb-3">
          <h2 className="flex-1 text-lg font-bold text-gray-900">Añadir himno</h2>
          <button onClick={onClose} className="text-ios-blue font-medium text-sm">
            Listo
          </button>
        </div>
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            autoFocus
            type="search"
            placeholder="Buscar himno..."
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

      {/* Resultados */}
      <div className="flex-1 pb-4">
        {(hymns ?? []).map((h) => {
          const alreadyAdded = existingIds.includes(h.id)
          return (
            <button
              key={h.id}
              disabled={alreadyAdded}
              onClick={() => !alreadyAdded && addHymn(h)}
              className={`w-full flex items-center px-4 py-3 gap-3 border-b border-gray-50 text-left
                ${alreadyAdded ? 'opacity-40' : 'active:bg-gray-50'}`}
            >
              <span className="w-9 text-right text-ios-blue font-semibold text-sm flex-shrink-0 tabular-nums">
                {h.numero ?? h.id}
              </span>
              <span className="flex-1 text-sm text-gray-800">{h.title}</span>
              {alreadyAdded ? (
                <span className="text-xs text-gray-400">Añadido</span>
              ) : (
                <PlusIcon className="w-4 h-4 text-ios-blue flex-shrink-0" />
              )}
            </button>
          )
        })}
        {!debouncedSearch && (
          <p className="text-xs text-center text-gray-300 py-4">
            Mostrando primeros 40 — escribe para buscar más
          </p>
        )}
        <div className="h-24" />
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
