import { useState, useEffect, useRef } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { db } from './db/database'
import { seedDatabase } from './db/database'
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
  const [updateCheckMsg, setUpdateCheckMsg] = useState('')
  const [dataUpdateAvailable, setDataUpdateAvailable] = useState(false)
  const swRegistrationRef = useRef(null)

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return
      swRegistrationRef.current = registration

      // Revisa actualizaciones periódicamente mientras la app está abierta.
      setInterval(() => {
        registration.update().catch(() => {})
      }, 60 * 1000)
    },
  })

  const handleCheckUpdate = async () => {
    try {
      // 1) Verifica actualización del Service Worker (app shell)
      if (!swRegistrationRef.current && 'serviceWorker' in navigator) {
        swRegistrationRef.current = await navigator.serviceWorker.getRegistration()
      }

      await swRegistrationRef.current?.update()

      // 2) Verifica actualización de datos (hymns.json)
      const [localMeta, remoteRes] = await Promise.all([
        db.meta.get('dataVersion'),
        fetch(`${import.meta.env.BASE_URL}data/hymns.json?t=${Date.now()}`, {
          cache: 'no-store',
        }),
      ])

      if (!remoteRes.ok) {
        setUpdateCheckMsg('No se pudo verificar')
        setTimeout(() => setUpdateCheckMsg(''), 2200)
        return
      }

      const remoteJson = await remoteRes.json()
      const remoteVersion = String(remoteJson?.version ?? '1.0')
      const localVersion = String(localMeta?.value ?? '1.0')

      if (remoteVersion !== localVersion) {
        setDataUpdateAvailable(true)
        setUpdateCheckMsg('Hay datos nuevos disponibles')
      } else {
        setDataUpdateAvailable(false)
        setUpdateCheckMsg('Ya tienes la ultima version')
      }
      setTimeout(() => setUpdateCheckMsg(''), 2500)
    } catch {
      setUpdateCheckMsg('No se pudo verificar')
      setTimeout(() => setUpdateCheckMsg(''), 2000)
    }
  }

  const handleApplyDataUpdate = async () => {
    try {
      setUpdateCheckMsg('Actualizando datos...')
      await seedDatabase()
      setDataUpdateAvailable(false)
      setUpdateCheckMsg('Datos actualizados')
      setTimeout(() => setUpdateCheckMsg(''), 2500)
    } catch {
      setUpdateCheckMsg('Error al actualizar datos')
      setTimeout(() => setUpdateCheckMsg(''), 2500)
    }
  }

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
    <div className="h-full flex flex-col bg-ios-lightgray" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {!needRefresh && (
        <div className="px-3 pt-2">
          <div className="flex items-center justify-end gap-2">
            {updateCheckMsg && <span className="text-[11px] text-gray-500">{updateCheckMsg}</span>}
            {dataUpdateAvailable && (
              <button
                onClick={handleApplyDataUpdate}
                className="text-[11px] text-white bg-ios-blue px-2 py-1 rounded-lg active:opacity-80"
              >
                Actualizar datos
              </button>
            )}
            <button
              onClick={handleCheckUpdate}
              className="text-[11px] text-gray-500 bg-gray-100 px-2 py-1 rounded-lg active:opacity-80"
            >
              Buscar actualización
            </button>
          </div>
        </div>
      )}

      {needRefresh && (
        <div className="px-3 pt-2">
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 flex items-center gap-2">
            <p className="text-xs text-blue-800 flex-1">
              Hay una nueva versión disponible.
            </p>
            <button
              onClick={() => updateServiceWorker(true)}
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
      <div className="flex-1 overflow-hidden">
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
