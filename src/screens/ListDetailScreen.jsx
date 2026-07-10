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
} from '@heroicons/react/24/outline'
import { db } from '../db/database'
import HymnItem from '../components/HymnItem'
import {
  exportListAsPdf,
  exportListWithLyricsPdf,
  exportListWithChordsPdf,
} from '../utils/exportUtils'

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

  const lista = useLiveQuery(() => db.listas.get(listId), [listId])

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
          <h1 className="flex-1 text-xl font-bold text-gray-900 truncate">
            {lista?.nombre ?? '...'}
          </h1>
          <button
            onClick={() => setShowExportMenu(true)}
            className="flex items-center gap-1 text-xs text-ios-blue font-medium bg-blue-50 px-3 py-2 rounded-lg active:opacity-70"
          >
            <ArrowUpTrayIcon className="w-4 h-4" />
            Exportar
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1 text-xs text-ios-blue font-medium bg-blue-50 px-3 py-2 rounded-lg active:opacity-70"
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
            <div className="h-2" />
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

  const options = [
    {
      label: 'Sin letra',
      description: 'Solo números y títulos',
      action: () => { exportListAsPdf(lista, hymns); onClose() },
    },
    {
      label: 'Con letra',
      description: 'Títulos y texto completo',
      action: () => { exportListWithLyricsPdf(lista, hymns); onClose() },
    },
    {
      label: 'Con letra y notas',
      description: 'Acordes/notas + letra',
      action: () => { exportListWithChordsPdf(lista, hymns); onClose() },
    },
  ]

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col justify-end bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-2xl pb-safe"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 pt-4 pb-3 border-b border-ios-separator">
          <h2 className="text-base font-semibold text-gray-900 text-center">
            Exportar lista como PDF
          </h2>
          <p className="text-xs text-gray-400 text-center mt-0.5">
            {hymns.length} himno{hymns.length !== 1 ? 's' : ''} · {lista.nombre}
          </p>
        </div>
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
        <div className="px-4 pb-4">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-ios-lightgray text-sm font-medium text-gray-700 active:opacity-70"
          >
            Cancelar
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
    <div className="absolute inset-0 bg-white z-50 flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
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
        <div className="h-6" />
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
