import { useState, useEffect, useRef } from 'react'
import { EllipsisHorizontalIcon } from '@heroicons/react/24/outline'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { db, seedDatabase } from './db/database'
import HomeScreen from './screens/HomeScreen'
import FilterScreen from './screens/FilterScreen'
import MusicianScreen from './screens/MusicianScreen'
import ListsScreen from './screens/ListsScreen'
import ListDetailScreen from './screens/ListDetailScreen'
import BottomNav from './components/BottomNav'

export default function App() {
  const [activeTab, setActiveTab] = useState('home')
  const [selectedListId, setSelectedListId] = useState(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [showBackupMenu, setShowBackupMenu] = useState(false)
  const [updateCheckMsg, setUpdateCheckMsg] = useState('')
  const [dataUpdateAvailable, setDataUpdateAvailable] = useState(false)
  const [appUpdateAvailable, setAppUpdateAvailable] = useState(false)
  const swRegistrationRef = useRef(null)
  const autoCheckTimerRef = useRef(null)
  const importInputRef = useRef(null)

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return
      swRegistrationRef.current = registration
    },
  })

  const checkForUpdates = async ({ silent = false } = {}) => {
    try {
      if (!silent) setUpdateCheckMsg('Buscando actualizaciones...')

      // 1) Verifica actualización del Service Worker (app shell)
      if (!swRegistrationRef.current && 'serviceWorker' in navigator) {
        swRegistrationRef.current = await navigator.serviceWorker.getRegistration()
      }

      await swRegistrationRef.current?.update()
      setAppUpdateAvailable(!!needRefresh)

      // 2) Verifica actualización de datos (hymns.json)
      const [localMeta, remoteRes] = await Promise.all([
        db.meta.get('dataVersion'),
        fetch(`${import.meta.env.BASE_URL}data/hymns.json?t=${Date.now()}`, {
          cache: 'no-store',
        }),
      ])

      if (!remoteRes.ok) {
        if (!silent) {
          setUpdateCheckMsg('No se pudo verificar')
          setTimeout(() => setUpdateCheckMsg(''), 2200)
        }
        return
      }

      const remoteJson = await remoteRes.json()
      const remoteVersion = String(remoteJson?.version ?? '1.0')
      const localVersion = String(localMeta?.value ?? '1.0')

      if (remoteVersion !== localVersion) {
        setDataUpdateAvailable(true)
        if (!silent) setUpdateCheckMsg('Hay datos nuevos disponibles')
      } else {
        setDataUpdateAvailable(false)
        if (!silent) setUpdateCheckMsg('Ya tienes la ultima version')
      }
      if (!silent) setTimeout(() => setUpdateCheckMsg(''), 2500)
    } catch {
      if (!silent) {
        setUpdateCheckMsg('No se pudo verificar')
        setTimeout(() => setUpdateCheckMsg(''), 2000)
      }
    }
  }

  const handleForceDataUpdate = async () => {
    try {
      setUpdateCheckMsg('Forzando actualización...')
      await seedDatabase(true)
      setDataUpdateAvailable(false)
      setUpdateCheckMsg('Datos actualizados')
      setTimeout(() => setUpdateCheckMsg(''), 2500)
    } catch {
      setUpdateCheckMsg('Error al actualizar datos')
      setTimeout(() => setUpdateCheckMsg(''), 2500)
    }
  }

  const handleApplyAppUpdate = () => {
    setMenuOpen(false)
    updateServiceWorker(true)
    setTimeout(() => window.location.reload(), 350)
  }

  const handleGoHome = () => {
    setMenuOpen(false)
    setActiveTab('home')
    setSelectedListId(null)
  }

  const handleExportListsFolders = async () => {
    try {
      const [carpetas, listas, listaHimnos] = await Promise.all([
        db.carpetas.toArray(),
        db.listas.toArray(),
        db.listaHimnos.toArray(),
      ])
      const payload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        carpetas,
        listas,
        listaHimnos,
      }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `backup-listas-carpetas-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
      setUpdateCheckMsg('Backup exportado')
      setTimeout(() => setUpdateCheckMsg(''), 2200)
    } catch {
      setUpdateCheckMsg('Error al exportar')
      setTimeout(() => setUpdateCheckMsg(''), 2200)
    }
  }

  const handleOpenImport = () => {
    importInputRef.current?.click()
  }

  const handleImportListsFolders = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const raw = await file.text()
      const data = JSON.parse(raw)
      const carpetas = Array.isArray(data?.carpetas) ? data.carpetas : []
      const listas = Array.isArray(data?.listas) ? data.listas : []
      const listaHimnos = Array.isArray(data?.listaHimnos) ? data.listaHimnos : []

      if (!confirm('Se reemplazarán listas y carpetas actuales por el backup. ¿Continuar?')) return

      const hymnIds = new Set(await db.hymns.toCollection().primaryKeys())
      const listaIds = new Set(listas.map((l) => l.id))
      const safeRelations = listaHimnos.filter((r) => listaIds.has(r.listaId) && hymnIds.has(r.hymnId))

      await db.transaction('rw', db.carpetas, db.listas, db.listaHimnos, async () => {
        await db.listaHimnos.clear()
        await db.listas.clear()
        await db.carpetas.clear()

        if (carpetas.length) await db.carpetas.bulkPut(carpetas)
        if (listas.length) await db.listas.bulkPut(listas)
        if (safeRelations.length) await db.listaHimnos.bulkPut(safeRelations)
      })

      setSelectedListId(null)
      setActiveTab('lists')
      setShowBackupMenu(false)
      setMenuOpen(false)
      setUpdateCheckMsg('Backup importado')
      setTimeout(() => setUpdateCheckMsg(''), 2400)
    } catch {
      setUpdateCheckMsg('Backup inválido')
      setTimeout(() => setUpdateCheckMsg(''), 2400)
    }
  }

  useEffect(() => {
    const run = () => checkForUpdates({ silent: true })
    run()
    autoCheckTimerRef.current = setInterval(run, 60 * 1000)

    return () => {
      if (autoCheckTimerRef.current) clearInterval(autoCheckTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needRefresh])

  // Solicitar pantalla completa en el primer toque (oculta barra de Chrome en Android)
  useEffect(() => {
    const requestFs = () => {
      const el = document.documentElement
      const fn = el.requestFullscreen ?? el.webkitRequestFullscreen ?? el.mozRequestFullScreen
      if (!document.fullscreenElement && fn) {
        fn.call(el).catch(() => {})
      }
    }
    document.addEventListener('touchend', requestFs, { once: true, passive: true })
    return () => document.removeEventListener('touchend', requestFs)
  }, [])

  useEffect(() => {
    seedDatabase()
      .then(() => setReady(true))
      .catch((e) => setError(e.message))
  }, [])

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    if (tab !== 'lists') setSelectedListId(null)
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-white p-8 text-center">
        <div>
          <p className="text-red-500 font-medium mb-2">Error al cargar</p>
          <p className="text-gray-500 text-sm">{error}</p>
          <p className="text-gray-400 text-xs mt-4">
            Asegúrate de que public/data/hymns.json existe.
          </p>
        </div>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-10 h-10 border-[3px] border-ios-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Cargando himnario...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] w-full flex flex-col bg-ios-lightgray" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="fixed right-3 bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] z-50 flex items-center gap-2">
        {updateCheckMsg && <span className="text-[11px] text-gray-500 bg-white/90 backdrop-blur px-2 py-1 rounded-full shadow-sm">{updateCheckMsg}</span>}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="w-9 h-9 rounded-full bg-white/85 backdrop-blur-md shadow-sm border border-gray-100 flex items-center justify-center text-gray-700 active:scale-95 transition-transform"
          aria-label="Opciones"
        >
          <EllipsisHorizontalIcon className="w-5 h-5" />
        </button>
        {menuOpen && (
          <div className="fixed right-3 bottom-[calc(env(safe-area-inset-bottom)+8.5rem)] z-50 w-72 rounded-2xl border border-gray-100 bg-white shadow-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-900">Herramientas</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Acciones rápidas</p>
            </div>

            <button
              onClick={handleApplyAppUpdate}
              className="w-full text-left px-4 py-3 text-sm text-gray-800 active:bg-gray-50"
            >
              Forzar actualización de app
            </button>

            <button
              onClick={handleGoHome}
              className="w-full text-left px-4 py-3 text-sm text-gray-800 active:bg-gray-50"
            >
              Ir a Himnario
            </button>

            <button
              onClick={() => setShowBackupMenu((v) => !v)}
              className="w-full text-left px-4 py-3 text-sm text-gray-800 active:bg-gray-50"
            >
              Exportar/Importar listas/carpetas
            </button>

            {showBackupMenu && (
              <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
                <button
                  onClick={handleExportListsFolders}
                  className="w-full text-left px-3 py-2 text-sm text-gray-800 rounded-lg active:bg-gray-200"
                >
                  Exportar backup
                </button>
                <button
                  onClick={handleOpenImport}
                  className="w-full text-left px-3 py-2 text-sm text-gray-800 rounded-lg active:bg-gray-200"
                >
                  Importar backup
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <input
        ref={importInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={handleImportListsFolders}
      />

      {/* Pantallas — se mantienen montadas para preservar estado */}
      <div className="w-full">
        <div className={`${activeTab === 'home' ? '' : 'hidden'}`}>
          <HomeScreen />
        </div>
        <div className={`${activeTab === 'filter' ? '' : 'hidden'}`}>
          <FilterScreen />
        </div>
        <div className={`${activeTab === 'musicians' ? '' : 'hidden'}`}>
          <MusicianScreen />
        </div>
        <div className={`${activeTab === 'lists' ? '' : 'hidden'}`}>
          {selectedListId != null ? (
            <ListDetailScreen
              listId={selectedListId}
              onBack={() => setSelectedListId(null)}
            />
          ) : (
            <ListsScreen onSelectList={setSelectedListId} />
          )}
        </div>
      </div>

      <BottomNav activeTab={activeTab} onChange={handleTabChange} />
    </div>
  )
}
