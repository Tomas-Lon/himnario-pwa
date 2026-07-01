import { useState, useEffect } from 'react'
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
