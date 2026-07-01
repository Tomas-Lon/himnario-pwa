import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  PlusIcon,
  FolderIcon,
  TrashIcon,
  ChevronRightIcon,
  StarIcon,
} from '@heroicons/react/24/outline'
import { StarIcon as StarSolid } from '@heroicons/react/24/solid'
import { db } from '../db/database'

export default function ListsScreen({ onSelectList }) {
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [showNewList, setShowNewList] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [newListName, setNewListName] = useState('')
  const [newListFolderId, setNewListFolderId] = useState(null)

  const folders = useLiveQuery(() => db.carpetas.orderBy('id').toArray())
  const listas = useLiveQuery(() => db.listas.orderBy('id').toArray())

  const createFolder = async () => {
    const name = newFolderName.trim()
    if (!name) return
    await db.carpetas.add({ nombre: name, createdAt: Date.now() })
    setNewFolderName('')
    setShowNewFolder(false)
  }

  const deleteFolder = async (folderId) => {
    if (!confirm('¿Eliminar carpeta y mover sus listas a "Sin carpeta"?')) return
    await db.listas.where('folderId').equals(folderId).modify({ folderId: null })
    await db.carpetas.delete(folderId)
  }

  const createList = async () => {
    const name = newListName.trim()
    if (!name) return
    await db.listas.add({
      nombre: name,
      descripcion: '',
      isFavorite: false,
      createdAt: Date.now(),
      folderId: newListFolderId,
    })
    setNewListName('')
    setNewListFolderId(null)
    setShowNewList(false)
  }

  const deleteList = async (listId) => {
    if (!confirm('¿Eliminar esta lista?')) return
    await db.listaHimnos.where('listaId').equals(listId).delete()
    await db.listas.delete(listId)
  }

  const toggleFavorite = async (lista) => {
    await db.listas.update(lista.id, { isFavorite: !lista.isFavorite })
  }

  const noFolderLists = (listas ?? []).filter((l) => l.folderId == null)

  return (
    <div className="h-full flex flex-col bg-ios-lightgray">
      {/* Header */}
      <div className="bg-white px-4 pt-4 pb-3 border-b border-ios-separator">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Listas</h1>
          <div className="flex gap-2">
            <button
              onClick={() => { setShowNewFolder(true); setShowNewList(false) }}
              className="flex items-center gap-1 text-xs text-ios-blue font-medium bg-blue-50 px-3 py-2 rounded-lg active:opacity-70"
            >
              <FolderIcon className="w-4 h-4" />
              Carpeta
            </button>
            <button
              onClick={() => { setShowNewList(true); setShowNewFolder(false) }}
              className="flex items-center gap-1 text-xs text-ios-blue font-medium bg-blue-50 px-3 py-2 rounded-lg active:opacity-70"
            >
              <PlusIcon className="w-4 h-4" />
              Lista
            </button>
          </div>
        </div>

        {/* Formulario nueva carpeta */}
        {showNewFolder && (
          <InlineForm
            placeholder="Nombre de carpeta..."
            value={newFolderName}
            onChange={setNewFolderName}
            onConfirm={createFolder}
            onCancel={() => { setShowNewFolder(false); setNewFolderName('') }}
          />
        )}

        {/* Formulario nueva lista */}
        {showNewList && (
          <div className="mt-3 space-y-2">
            <input
              autoFocus
              type="text"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ios-blue"
              placeholder="Nombre de lista..."
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createList()}
            />
            {/* Selector de carpeta opcional */}
            <select
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none"
              value={newListFolderId ?? ''}
              onChange={(e) => setNewListFolderId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Sin carpeta</option>
              {(folders ?? []).map((f) => (
                <option key={f.id} value={f.id}>{f.nombre}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button onClick={createList} className="flex-1 bg-ios-blue text-white text-sm font-medium py-2 rounded-xl">
                Crear
              </button>
              <button
                onClick={() => { setShowNewList(false); setNewListName('') }}
                className="flex-1 bg-gray-100 text-gray-600 text-sm font-medium py-2 rounded-xl"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Contenido */}
      <div className="flex-1 scroll-view px-4 py-3 space-y-3">
        {/* Carpetas */}
        {(folders ?? []).map((folder) => {
          const listsInFolder = (listas ?? []).filter((l) => l.folderId === folder.id)
          return (
            <div key={folder.id} className="bg-white rounded-2xl overflow-hidden shadow-sm">
              {/* Cabecera carpeta */}
              <div className="flex items-center px-4 py-3 border-b border-gray-50">
                <FolderIcon className="w-5 h-5 text-amber-500 mr-2 flex-shrink-0" />
                <span className="flex-1 font-semibold text-gray-800 text-sm">{folder.nombre}</span>
                <span className="text-xs text-gray-400 mr-2">{listsInFolder.length}</span>
                <button onClick={() => deleteFolder(folder.id)} className="p-1">
                  <TrashIcon className="w-4 h-4 text-gray-300" />
                </button>
              </div>
              {listsInFolder.length === 0 ? (
                <p className="text-xs text-gray-400 px-4 py-3">Vacía</p>
              ) : (
                listsInFolder.map((lista) => (
                  <ListRow
                    key={lista.id}
                    lista={lista}
                    onSelect={() => onSelectList(lista.id)}
                    onDelete={() => deleteList(lista.id)}
                    onToggleFav={() => toggleFavorite(lista)}
                  />
                ))
              )}
            </div>
          )
        })}

        {/* Listas sin carpeta */}
        {noFolderLists.length > 0 && (
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
            {noFolderLists.map((lista) => (
              <ListRow
                key={lista.id}
                lista={lista}
                onSelect={() => onSelectList(lista.id)}
                onDelete={() => deleteList(lista.id)}
                onToggleFav={() => toggleFavorite(lista)}
              />
            ))}
          </div>
        )}

        {(folders ?? []).length === 0 && noFolderLists.length === 0 && (
          <div className="text-center py-16 text-gray-400 text-sm">
            <p>No hay listas creadas</p>
            <p className="text-xs mt-1">Usa los botones de arriba para crear una</p>
          </div>
        )}

        <div className="h-6" />
      </div>
    </div>
  )
}

function ListRow({ lista, onSelect, onDelete, onToggleFav }) {
  const count = useLiveQuery(
    () => db.listaHimnos.where('listaId').equals(lista.id).count(),
    [lista.id],
  )

  return (
    <button
      className="w-full flex items-center px-4 py-3 gap-3 border-b border-gray-50 last:border-0 text-left active:bg-gray-50"
      onClick={onSelect}
    >
      <button
        className="flex-shrink-0 p-1"
        onClick={(e) => { e.stopPropagation(); onToggleFav() }}
      >
        {lista.isFavorite
          ? <StarSolid className="w-5 h-5 text-amber-400" />
          : <StarIcon className="w-5 h-5 text-gray-200" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{lista.nombre}</p>
        <p className="text-xs text-gray-400">{count ?? 0} himno{count !== 1 ? 's' : ''}</p>
      </div>
      <button
        className="flex-shrink-0 p-1"
        onClick={(e) => { e.stopPropagation(); onDelete() }}
      >
        <TrashIcon className="w-4 h-4 text-gray-200" />
      </button>
      <ChevronRightIcon className="w-4 h-4 text-gray-300 flex-shrink-0" />
    </button>
  )
}

function InlineForm({ placeholder, value, onChange, onConfirm, onCancel }) {
  return (
    <div className="mt-3 flex gap-2">
      <input
        autoFocus
        type="text"
        className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ios-blue"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onConfirm()}
      />
      <button onClick={onConfirm} className="bg-ios-blue text-white text-sm font-medium px-4 rounded-xl">
        OK
      </button>
      <button onClick={onCancel} className="bg-gray-100 text-gray-600 text-sm font-medium px-3 rounded-xl">
        ✕
      </button>
    </div>
  )
}
