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
  const [updateCheckMsg, setUpdateCheckMsg] = useState('')
  const [dataUpdateAvailable, setDataUpdateAvailable] = useState(false)
  const [appUpdateAvailable, setAppUpdateAvailable] = useState(false)
  const swRegistrationRef = useRef(null)
  const autoCheckTimerRef = useRef(null)

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
    <div className="min-h-[100dvh] w-full flex flex-col bg-ios-lightgray pb-[calc(env(safe-area-inset-bottom)+5.25rem)]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="fixed right-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-50 flex items-center gap-2">
        {updateCheckMsg && <span className="text-[11px] text-gray-500 bg-white/80 backdrop-blur px-2 py-1 rounded-full shadow-sm">{updateCheckMsg}</span>}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="w-9 h-9 rounded-full bg-white/85 backdrop-blur-md shadow-sm border border-gray-100 flex items-center justify-center text-gray-700 active:scale-95 transition-transform"
          aria-label="Opciones"
        >
          <EllipsisHorizontalIcon className="w-5 h-5" />
        </button>
        {menuOpen && (
          <div className="fixed right-3 top-[calc(env(safe-area-inset-top)+3.5rem)] z-50 w-64 rounded-2xl border border-gray-100 bg-white shadow-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-900">Actualizaciones</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Auto-chequeo cada 60s</p>
            </div>

            <button
              onClick={() => { setMenuOpen(false); checkForUpdates({ silent: false }) }}
              className="w-full text-left px-4 py-3 text-sm text-gray-800 active:bg-gray-50"
            >
              Buscar ahora
            </button>

            <button
              onClick={handleForceDataUpdate}
              className="w-full text-left px-4 py-3 text-sm text-gray-800 active:bg-gray-50"
            >
              Forzar sincronización de datos
            </button>

            <button
              onClick={handleApplyAppUpdate}
              className="w-full text-left px-4 py-3 text-sm text-gray-800 active:bg-gray-50"
            >
              Aplicar actualización de la app
            </button>

            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 text-[11px] text-gray-500 space-y-1">
              <p>App: {appUpdateAvailable || needRefresh ? 'hay actualización' : 'actualizada'}</p>
              <p>Datos: {dataUpdateAvailable ? 'hay cambios' : 'al día'}</p>
            </div>
          </div>
        )}
      </div>

      {needRefresh && (
        <div className="px-3 pt-2">
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 flex items-center gap-2">
            <p className="text-xs text-blue-800 flex-1">
              Hay una nueva versión disponible.
            </p>
            <button
              onClick={handleApplyAppUpdate}
              className="text-xs font-semibold text-white bg-ios-blue px-3 py-1.5 rounded-lg active:opacity-80"
            >
              Actualizar
            </button>
            <button
              onClick={() => setNeedRefresh(false)}
              className="text-xs font-medium text-blue-700 px-2 py-1"
            >
              Luego
            </button>
          </div>
        </div>
      )}

      {/* Pantallas — se mantienen montadas para preservar scroll */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className={`h-full ${activeTab === 'home' ? '' : 'hidden'}`}>
          <HomeScreen />
        </div>
        <div className={`h-full ${activeTab === 'filter' ? '' : 'hidden'}`}>
          <FilterScreen />
        </div>
        <div className={`h-full ${activeTab === 'musicians' ? '' : 'hidden'}`}>
          <MusicianScreen />
        </div>
        <div className={`h-full ${activeTab === 'lists' ? '' : 'hidden'}`}>
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
