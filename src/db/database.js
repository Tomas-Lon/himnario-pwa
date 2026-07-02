import Dexie from 'dexie'

// ─── Esquema ────────────────────────────────────────────────────────────────
// hymns       : datos del himnario (seeded desde hymns.json, nota editable)
// listas      : listas personalizadas del usuario
// listaHimnos : relación N:M lista ↔ himno
// carpetas    : carpetas que agrupan listas
// meta        : metadatos internos (ej. versión del dato)
// ─────────────────────────────────────────────────────────────────────────────

export const db = new Dexie('HimnarioDB')

db.version(1).stores({
  hymns: 'id, numero, category, musical_key',
  listas: '++id, folderId, isFavorite',
  listaHimnos: '[listaId+hymnId], listaId, hymnId',
  carpetas: '++id',
  meta: 'key',
})

/**
 * Carga hymns.json en IndexedDB.
 * - Si la versión del JSON es la misma que está guardada: no hace nada.
 * - Si hay una versión nueva: actualiza título/letra/acordes pero PRESERVA las notas del usuario.
 * - Si un himno es nuevo: lo agrega con nota vacía.
 */
export async function seedDatabase() {
  let data, version

  try {
    const res = await fetch(`${import.meta.env.BASE_URL}data/hymns.json`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    // Acepta {version, data:[...]} o directamente [...]
    version = json.version ?? '1.0'
    data = Array.isArray(json) ? json : (json.data ?? [])
  } catch (e) {
    console.warn('[DB] No se pudo cargar hymns.json:', e.message)
    return
  }

  const stored = await db.meta.get('dataVersion')
  if (stored?.value === version) return // Ya actualizado

  await db.transaction('rw', db.hymns, db.listaHimnos, async () => {
    const incomingIds = new Set(data.map((h) => h.id))

    for (const h of data) {
      const existing = await db.hymns.get(h.id)
      if (existing) {
        // Actualiza todo excepto la nota personal del usuario
        await db.hymns.update(h.id, {
          title: h.title ?? '',
          lyrics: h.lyrics ?? '',
          numero: h.numero ?? h.id,
          category: h.category ?? null,
          musical_key: h.musical_key ?? null,
          musical_notation: h.musical_notation ?? null,
        })
      } else {
        await db.hymns.add({
          id: h.id,
          title: h.title ?? '',
          lyrics: h.lyrics ?? '',
          numero: h.numero ?? h.id,
          category: h.category ?? null,
          musical_key: h.musical_key ?? null,
          musical_notation: h.musical_notation ?? null,
          note: null,
        })
      }
    }

    // Elimina himnos que ya no existen en el nuevo dataset
    const existingIds = await db.hymns.toCollection().primaryKeys()
    for (const id of existingIds) {
      if (!incomingIds.has(id)) {
        await db.hymns.delete(id)
      }
    }

    // Limpia relaciones de listas que apuntan a himnos eliminados
    const relations = await db.listaHimnos.toArray()
    for (const rel of relations) {
      if (!incomingIds.has(rel.hymnId)) {
        await db.listaHimnos
          .where('[listaId+hymnId]')
          .equals([rel.listaId, rel.hymnId])
          .delete()
      }
    }
  })

  await db.meta.put({ key: 'dataVersion', value: version })
}
